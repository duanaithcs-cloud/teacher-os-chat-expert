/**
 * Semantic Cache — Q&A Knowledge Engine (0 token khi khớp chuẩn).
 * So khớp câu hỏi người dùng với ngân hàng qa_knowledge_base.json bằng cosine similarity
 * trên không gian token đã chuẩn hoá (không cần thư viện ngoài, chạy in-process).
 *
 * Ngưỡng (theo spec):
 *   >= 0.88  → "exact":  trả lời giải chuẩn có sẵn, 0 token LLM.
 *   0.75–0.88→ "context": dùng lời giải gốc làm context ngắn (~200 tokens) cho model nhỏ.
 *   < 0.75   → "miss":    kích hoạt Graph-RAG đa tầng, tạo bài mới.
 */

import qaRaw from "@/data/qa_knowledge_base.json";
import { normalizeText } from "@/lib/mcp_runtime";

export interface QARecord {
  id: string;
  question: string;
  answer: string;
  category: string;
  source_module: string;
  tags: string[];
  similarity_hash: string;
  hit_count: number;
  created_at: string;
  doc_synced: boolean;
}

export interface CacheLookup {
  hit: boolean;
  tier: "exact" | "context" | "miss";
  score: number;
  record: QARecord | null;
}

export const QA_BASE = qaRaw as QARecord[];

export const QA_CATEGORIES = ["CHUYEN_DE_TU_NHIEN_L8", "CHUYEN_DE_KINH_TE_L9", "KY_NANG_DIA_LI", "PHUONG_PHAP_ON_HSG"] as const;

function tokens(text: string): string[] {
  return normalizeText(text).split(" ").filter((t) => t.length >= 2);
}

/** Cosine similarity trên tập token (bag-of-words). Trả 0..1. */
export function cosineSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const setB = new Set(tb);
  let inter = 0;
  for (const t of ta) if (setB.has(t)) inter++;
  return inter / (Math.sqrt(ta.length) * Math.sqrt(tb.length));
}

/** Tìm bản ghi khớp nhất theo cosine similarity câu hỏi. */
export function lookupQuestion(question: string): CacheLookup {
  let best: QARecord | null = null;
  let bestScore = 0;
  for (const r of QA_BASE) {
    const s = cosineSimilarity(question, r.question);
    if (s > bestScore) {
      bestScore = s;
      best = r;
    }
  }

  if (!best) return { hit: false, tier: "miss", score: 0, record: null };

  if (bestScore >= 0.88) return { hit: true, tier: "exact", score: bestScore, record: best };
  if (bestScore >= 0.75) return { hit: true, tier: "context", score: bestScore, record: best };
  return { hit: false, tier: "miss", score: bestScore, record: best };
}

/** Trả về bản ghi theo id (dùng cho đếm hit/đồng bộ doc). */
export function getQARecord(id: string): QARecord | null {
  return QA_BASE.find((r) => r.id === id) ?? null;
}

export interface QAFilterResult {
  total: number;
  items: QARecord[];
}

/** Lọc/tra cứu 0-token cho Bảng tra cứu Q&A (khớp từ khoá trên câu hỏi + tags). */
export function searchQABase(query: string, category: string | null, limit = 50): QAFilterResult {
  const q = normalizeText(query);
  const terms = q.split(" ").filter((t) => t.length >= 2);

  const scored = QA_BASE.map((r) => {
    if (category && r.category !== category) return { r, score: -1 };
    const hay = normalizeText([r.question, ...r.tags].join(" "));
    let score = 0;
    if (terms.length === 0) {
      score = 0;
    } else {
      for (const t of terms) if (hay.includes(t)) score++;
    }
    return { r, score };
  });

  const matched = scored
    .filter((x) => x.score >= 0)
    .sort((a, b) => {
      // Khi có từ khoá: ưu tiên score cao; khi rỗng: giữ thứ tự gốc (đã sort theo id lúc build)
      if (terms.length > 0 && b.score !== a.score) return b.score - a.score;
      return 0;
    });

  return { total: matched.length, items: matched.slice(0, limit).map((x) => x.r) };
}
