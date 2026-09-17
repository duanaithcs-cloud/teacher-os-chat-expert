/**
 * MCP Runtime — port từ mcp_server.py + graph_rag_engine.py
 * Chạy in-process, độ trễ < 5ms, không gọi network.
 * Data đọc 1 lần lúc module load, cache suốt vòng đời serverless.
 */

import kgRaw from "@/data/knowledge_graph.json";
import factsRaw from "@/data/admin_facts_2026.json";

// ─────────────────────────────── Types ───────────────────────────────

export interface KGNode {
  label: string;
  grade: string;
  category?: string | null;
  lesson?: string | null;
  status?: string;
  aliases?: string[];
}

export interface KGEdge {
  source: string;
  target: string;
  relation: string;
  kind?: string | null;
  note?: string | null;
  grade?: string | null;
  level?: string | null;
  lesson?: string | null;
  status?: string;
}

export interface Fact {
  id: string;
  indicator: string;
  value: string;
  unit?: string | null;
  year?: number | null;
  lesson?: string | null;
  source?: string | null;
  note?: string | null;
  node_ref?: string | null;
  target_node?: string | null;
}

export interface NodePayload {
  node_id: string;
  label: string;
  grade: string;
  category?: string | null;
  lesson?: string | null;
}

export interface ChainStep {
  type: "node" | "edge";
  node_id?: string;
  label?: string;
  grade?: string;
  relation?: string;
  note?: string | null;
  kind?: string | null;
}

export interface CausalPath {
  hops: number;
  chain: ChainStep[];
}

export interface CausalChainResult {
  ok: boolean;
  error?: string;
  source?: NodePayload;
  target?: NodePayload;
  path_count: number;
  paths: CausalPath[];
}

export interface NodeFactsResult {
  ok: boolean;
  error?: string;
  node?: NodePayload;
  fact_count: number;
  facts: Fact[];
}

export interface BridgeEdge {
  source: NodePayload;
  relation: string;
  target: NodePayload;
  note?: string | null;
  kind?: string | null;
}

export interface BridgeEdgesResult {
  ok: boolean;
  count: number;
  bridges: BridgeEdge[];
}

export interface ChartRecommendation {
  chartType: string;
  condition: string;
  formula?: string;
  example?: string;
}

// ─────────────────────────────── Data load ───────────────────────────────

const KG_NODES = kgRaw.nodes as Record<string, KGNode>;
const KG_EDGES = kgRaw.edges as KGEdge[];
const FACTS: Fact[] = (factsRaw as { facts: Fact[] }).facts;

// ─────────────────────────────── Normalize ───────────────────────────────

/**
 * Port của normalize_text() Python: NFD → bỏ dấu → lowercase → chỉ giữ a-z0-9 space.
 * Dùng String.normalize("NFD") + regex loại combining marks.
 */
export function normalizeText(value: string): string {
  if (!value) return "";
  let s = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/đ/gi, "d");
  s = s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  return s;
}

// ─────────────────────────────── Node index ───────────────────────────────

let _nodeIndex: Map<string, string> | null = null;

function buildNodeIndex(): Map<string, string> {
  if (_nodeIndex) return _nodeIndex;
  const index = new Map<string, string>();
  for (const [nodeId, node] of Object.entries(KG_NODES)) {
    const keys = [nodeId, node.label, ...(node.aliases ?? [])];
    for (const key of keys) {
      const norm = normalizeText(key);
      if (norm && !index.has(norm)) index.set(norm, nodeId);
    }
  }
  _nodeIndex = index;
  return index;
}

function resolveNode(query: string): string | null {
  if (!query) return null;
  if (query in KG_NODES) return query;
  const index = buildNodeIndex();
  const norm = normalizeText(query);
  if (norm in KG_NODES) return norm;
  if (index.has(norm)) return index.get(norm)!;

  // contains-match fallback
  const matches: string[] = [];
  for (const [nodeId, node] of Object.entries(KG_NODES)) {
    const haystack = normalizeText([nodeId, node.label, node.lesson ?? "", ...(node.aliases ?? [])].join(" "));
    if (norm && haystack.includes(norm)) matches.push(nodeId);
  }
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) return matches.sort((a, b) => a.length - b.length)[0];
  return null;
}

function nodePayload(nodeId: string): NodePayload {
  const node = KG_NODES[nodeId];
  return {
    node_id: nodeId,
    label: node?.label ?? nodeId,
    grade: node?.grade ?? "",
    category: node?.category,
    lesson: node?.lesson,
  };
}

// ─────────────────────────────── 1. getEntityCausality ───────────────────────────────

/**
 * Truy vấn chuỗi nhân quả từ node nguồn đến node đích (BFS ≤ 5 hops).
 * Tương đương query_causal_chain() trong mcp_server.py.
 */
export function getEntityCausality(
  sourceQuery: string,
  targetQuery: string,
  maxHops = 5
): CausalChainResult {
  const sourceId = resolveNode(sourceQuery);
  const targetId = resolveNode(targetQuery);

  if (!sourceId) return { ok: false, error: `node không tìm thấy: ${sourceQuery}`, path_count: 0, paths: [] };
  if (!targetId) return { ok: false, error: `node không tìm thấy: ${targetQuery}`, path_count: 0, paths: [] };

  // Build adjacency + edge lookup
  const adjacency = new Map<string, string[]>();
  const edgeLookup = new Map<string, KGEdge>();
  for (const edge of KG_EDGES) {
    if (!(edge.source in KG_NODES) || !(edge.target in KG_NODES)) continue;
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    adjacency.get(edge.source)!.push(edge.target);
    const key = `${edge.source}→${edge.target}`;
    if (!edgeLookup.has(key)) edgeLookup.set(key, edge);
  }

  // BFS
  const foundPaths: string[][] = [];
  const queue: string[][] = [[sourceId]];
  while (queue.length > 0 && foundPaths.length < 10) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    if (path.length - 1 >= maxHops) continue;
    for (const next of adjacency.get(current) ?? []) {
      if (path.includes(next)) continue;
      const candidate = [...path, next];
      if (next === targetId) foundPaths.push(candidate);
      else queue.push(candidate);
    }
  }

  if (foundPaths.length === 0) {
    return {
      ok: false,
      error: `không tìm thấy đường nhân quả trong ${maxHops} hops`,
      source: nodePayload(sourceId),
      target: nodePayload(targetId),
      path_count: 0,
      paths: [],
    };
  }

  return {
    ok: true,
    source: nodePayload(sourceId),
    target: nodePayload(targetId),
    path_count: foundPaths.length,
    paths: foundPaths.map((path) => ({
      hops: path.length - 1,
      chain: buildChain(path, edgeLookup),
    })),
  };
}

function buildChain(path: string[], edgeLookup: Map<string, KGEdge>): ChainStep[] {
  const chain: ChainStep[] = [];
  for (let i = 0; i < path.length; i++) {
    const n = nodePayload(path[i]);
    chain.push({ type: "node", node_id: n.node_id, label: n.label, grade: n.grade });
    if (i < path.length - 1) {
      const edge = edgeLookup.get(`${path[i]}→${path[i + 1]}`);
      chain.push({ type: "edge", relation: edge?.relation, note: edge?.note, kind: edge?.kind });
    }
  }
  return chain;
}

// ─────────────────────────────── 2. getVerifiedFacts ───────────────────────────────

/**
 * Trả về facts số liệu định lượng gắn với một entity.
 * Tương đương get_node_facts() trong mcp_server.py.
 */
export function getVerifiedFacts(entityId: string): NodeFactsResult {
  const resolvedId = resolveNode(entityId);
  if (!resolvedId) return { ok: false, error: `node không tìm thấy: ${entityId}`, fact_count: 0, facts: [] };

  const matched = FACTS.filter(
    (f) => f.node_ref === resolvedId || f.target_node === resolvedId
  );
  return {
    ok: true,
    node: nodePayload(resolvedId),
    fact_count: matched.length,
    facts: matched,
  };
}

// ─────────────────────────────── 3. getBridgeEdges ───────────────────────────────

/**
 * Trả về các bridge edge L8→L9 (cầu nối nhân quả liên lớp).
 */
export function getBridgeEdges(gradeFrom = "L8", gradeTo = "L9", limit = 100): BridgeEdgesResult {
  const bridges: BridgeEdge[] = [];
  for (const edge of KG_EDGES) {
    const src = edge.source;
    const dst = edge.target;
    if (!(src in KG_NODES) || !(dst in KG_NODES)) continue;
    if (KG_NODES[src].grade === gradeFrom && KG_NODES[dst].grade === gradeTo) {
      bridges.push({
        source: nodePayload(src),
        relation: edge.relation,
        target: nodePayload(dst),
        note: edge.note,
        kind: edge.kind,
      });
    }
  }
  return { ok: true, count: bridges.length, bridges: bridges.slice(0, limit) };
}

// ─────────────────────────────── 4. getChartRecommendation ───────────────────────────────

const CHART_RULES: Array<{
  keywords: string[];
  chartType: string;
  condition: string;
  formula?: string;
  example?: string;
}> = [
  {
    keywords: ["tốc độ tăng trưởng", "toc do tang truong", "chỉ số phát triển", "chi so phat trien", "tăng trưởng qua các năm"],
    chartType: "Biểu đồ Đường",
    condition: "Thể hiện tốc độ tăng trưởng hoặc chỉ số qua nhiều năm. Phải quy đổi năm gốc = 100%.",
    formula: "Chỉ số năm sau = (Giá trị năm sau / Giá trị năm gốc) × 100",
    example: "Biểu đồ tốc độ tăng trưởng GDP, sản lượng điện, dân số qua các năm.",
  },
  {
    keywords: ["quy mô và cơ cấu", "quy mo va co cau", "cơ cấu và quy mô", "tỉ lệ và quy mô"],
    chartType: "Biểu đồ Tròn có bán kính thay đổi",
    condition: "Thể hiện đồng thời quy mô tổng và cơ cấu thành phần (2–3 năm).",
    formula: "R₂ = R₁ × √(Tổng quy mô năm 2 / Tổng quy mô năm 1)",
    example: "Cơ cấu và quy mô sản lượng nông–lâm–thủy sản năm 2010 và 2023.",
  },
  {
    keywords: ["bán kính hình tròn", "ban kinh hinh tron", "bán kính vòng tròn"],
    chartType: "Biểu đồ Tròn có bán kính thay đổi",
    condition: "Khi đề yêu cầu vẽ biểu đồ tròn biểu hiện quy mô.",
    formula: "R_n = R_1 × √(Giá trị_n / Giá trị_1)",
    example: "Tính bán kính tượng trưng cho sản lượng điện 2010 (91,7 tỉ kWh) và 2024 (293,1 tỉ kWh).",
  },
  {
    keywords: ["chuyển dịch cơ cấu", "chuyen dich co cau", "thay đổi cơ cấu", "thay doi co cau"],
    chartType: "Biểu đồ Miền (≥4 mốc năm) hoặc Cột chồng (2–3 mốc năm)",
    condition: "≥4 mốc thời gian → Miền; 2–3 mốc → Cột chồng 100%.",
    formula: "Tỉ trọng mỗi thành phần = (Giá trị thành phần / Tổng) × 100%",
    example: "Chuyển dịch cơ cấu GDP Công nghiệp–Nông nghiệp–Dịch vụ 2000, 2010, 2015, 2020, 2023.",
  },
  {
    keywords: ["cơ cấu", "co cau", "tỉ trọng", "ti trong", "thành phần", "phan tram", "phần trăm"],
    chartType: "Biểu đồ Tròn (1–2 năm) hoặc Cột chồng (2–3 năm)",
    condition: "Thể hiện cơ cấu (%) tại 1 thời điểm hoặc so sánh 2–3 thời điểm.",
    formula: "Tổng các thành phần = 100%; góc mỗi thành phần = tỉ trọng × 3,6°",
    example: "Cơ cấu sử dụng đất Việt Nam năm 2023.",
  },
  {
    keywords: ["so sánh", "so sanh", "đối chiếu", "doi chieu"],
    chartType: "Biểu đồ Cột đơn hoặc Cột nhóm",
    condition: "So sánh giá trị tuyệt đối giữa các đối tượng hoặc các vùng.",
    example: "So sánh sản lượng lúa các vùng kinh tế năm 2023.",
  },
];

/**
 * Nhận diện từ khóa và trả về gợi ý biểu đồ chuẩn thi HSG.
 */
export function getChartRecommendation(query: string): ChartRecommendation[] {
  const normQ = normalizeText(query);
  const results: ChartRecommendation[] = [];
  for (const rule of CHART_RULES) {
    const hit = rule.keywords.some((kw) => normalizeText(kw).split(" ").every((token) => normQ.includes(token)));
    if (hit) {
      results.push({
        chartType: rule.chartType,
        condition: rule.condition,
        formula: rule.formula,
        example: rule.example,
      });
    }
  }
  return results;
}

// ─────────────────────────────── 5. Enrichment pipeline (dùng bởi API route) ───────────────────────────────

export interface EnrichedContext {
  chartHints: ChartRecommendation[];
  causalPaths: CausalPath[];
  facts: Fact[];
  bridgeSample: BridgeEdge[];
  entityLabels: string[];
}

/**
 * Pipeline chính: nhận câu hỏi thô, trích xuất context từ KG + Facts.
 * Trả về block sẵn sàng bơm vào System Prompt.
 */
export function enrichQuery(question: string): EnrichedContext {
  const normQ = normalizeText(question);

  // Chart hints
  const chartHints = getChartRecommendation(question);

  // Match entities từ câu hỏi (scan toàn bộ nodes, lấy hit tốt nhất)
  const matchedNodes: string[] = [];
  for (const [nodeId, node] of Object.entries(KG_NODES)) {
    const haystack = normalizeText([nodeId, node.label, ...(node.aliases ?? [])].join(" "));
    const tokens = normQ.split(" ").filter((t) => t.length >= 3);
    const score = tokens.filter((t) => haystack.includes(t)).length;
    if (score >= 1) matchedNodes.push(nodeId);
  }
  matchedNodes.sort((a, b) => {
    const scoreA = normQ.split(" ").filter((t) => t.length >= 3 && normalizeText(KG_NODES[a]?.label ?? "").includes(t)).length;
    const scoreB = normQ.split(" ").filter((t) => t.length >= 3 && normalizeText(KG_NODES[b]?.label ?? "").includes(t)).length;
    return scoreB - scoreA;
  });

  const topNodes = matchedNodes.slice(0, 4);
  const entityLabels = topNodes.map((id) => `${KG_NODES[id]?.label} (${KG_NODES[id]?.grade})`);

  // Facts cho các node tìm thấy
  const allFacts: Fact[] = [];
  const seenFactIds = new Set<string>();
  for (const nodeId of topNodes) {
    const res = getVerifiedFacts(nodeId);
    for (const f of res.facts) {
      if (!seenFactIds.has(f.id)) {
        seenFactIds.add(f.id);
        allFacts.push(f);
      }
    }
  }

  // Causal paths: thử cặp L8 → L9 từ matched nodes
  const l8Nodes = topNodes.filter((id) => KG_NODES[id]?.grade === "L8");
  const l9Nodes = topNodes.filter((id) => KG_NODES[id]?.grade === "L9");
  const causalPaths: CausalPath[] = [];
  for (const src of l8Nodes.slice(0, 2)) {
    for (const dst of l9Nodes.slice(0, 2)) {
      const res = getEntityCausality(src, dst, 5);
      if (res.ok) causalPaths.push(...res.paths.slice(0, 2));
    }
  }

  // Bridge sample liên quan
  const bridgesRes = getBridgeEdges("L8", "L9", 200);
  const bridgeSample = bridgesRes.bridges
    .filter((b) => topNodes.includes(b.source.node_id) || topNodes.includes(b.target.node_id))
    .slice(0, 6);

  return { chartHints, causalPaths, facts: allFacts.slice(0, 10), bridgeSample, entityLabels };
}
