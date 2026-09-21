import { NextRequest, NextResponse } from "next/server";
import { enrichQuery } from "@/lib/mcp_runtime";
import { lookupQuestion, getQARecord } from "@/lib/cache/semanticCache";
import hsgSkillModules from "@/data/hsg_skill_modules.json";

export const runtime = "nodejs";
// Vercel Hobby giới hạn 60s/function — giữ đúng trần này để không bị cắt giữa chừng.
export const maxDuration = 60;

function buildHsgSkillModuleBlock(): string {
  const data = hsgSkillModules as {
    display_name: string;
    source_anchor: string;
    modules: { name: string; triggers: string[]; must_do: string[] }[];
    yccd_upgrade_modes: string[];
    geography_material_rule: string[];
    docx_audit: string[];
  };

  const moduleLines = data.modules.map((module, index) => {
    const rules = module.must_do.map((rule) => `   - ${rule}`).join("\n");
    return `${index + 1}. ${module.name}\n   Trigger: ${module.triggers.join(", ")}\n${rules}`;
  }).join("\n\n");

  return `

━━━━━━━━━━━━━━━ HSG9 SKILL MODULES TRONG HUB ━━━━━━━━━━━━━━━
Nguồn neo: ${data.source_anchor}

Khi người dùng hỏi về ra đề HSG, luyện tư duy HSG, HDC, barem hoặc chấm lỗi HSG, phải vận hành theo 3 module sau:

${moduleLines}

Cách nâng YCCĐ thành câu HSG:
- ${data.yccd_upgrade_modes.join("\n- ")}

Quy tắc ngữ liệu Địa lí:
- ${data.geography_material_rule.join("\n- ")}

Audit trước khi xuất đề/DOCX:
- ${data.docx_audit.join("\n- ")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

// ─────────────── System Prompt khóa cứng ───────────────
const BASE_SYSTEM_PROMPT = `Bạn là "Trợ lý AI Bồi dưỡng Học sinh giỏi Địa lí" của ThS. Phùng Văn Tiến.
Nhiệm vụ: Giải đáp câu hỏi ôn thi HSG Địa lí lớp 8 (Tự nhiên VN) và lớp 9 (Kinh tế–Xã hội–Vùng).

QUY TẮC TUYỆT ĐỐI:
1. Nền tảng dẫn chứng BẮT BUỘC cho mọi câu HSG: số liệu định lượng chuẩn trong chương trình SGK GDPT 2018 (bộ Kết Nối Tri Thức, Địa lí 8 & 9). Ưu tiên dùng số liệu khớp trong [FACTS THỰC CHỨNG]; nếu phần đó không liệt kê, vẫn được phép dùng số liệu SGK KNTT chuẩn làm dẫn chứng (KHÔNG ghi "chưa có số liệu thực chứng" đối với kiến thức thuộc SGK). Chỉ gắn cờ cảnh báo "số liệu có thể biến động theo năm, cần đối chiếu niên giám mới nhất" đối với các chỉ số kinh tế vĩ mô biến động từng năm (GDP, kim ngạch xuất nhập khẩu).
2. Khi trình bày chuỗi nhân quả, dùng đúng relation trong [CHUỖI NHÂN QUẢ]. Không được đảo quan hệ.
3. Cấu trúc câu trả lời chuẩn barem HSG:
   - MỞ ĐẦU: Xác định thực thể địa lí, cấp độ (L8/L9), và hướng lập luận.
   - THÂN BÀI: Trình bày từng luận điểm → luận cứ → số liệu thực chứng.
   - KẾT LUẬN: Tổng hợp mối quan hệ nhân quả; chỉ ra chiều tác động.
4. Biểu đồ: Dùng đúng loại biểu đồ và công thức từ [GỢI Ý BIỂU ĐỒ]. Không tự sáng tạo.
5. Phân vùng kinh tế: Dùng đúng 6 vùng theo quy hoạch 2024 (không dùng 7 vùng cũ).
6. Trả lời bằng tiếng Việt. Sử dụng đơn vị rõ ràng (triệu người, tỉ kWh, nghìn ha, %, nghìn km²).`;

/**
 * Gọi enrichQuery an toàn — lỗi đồ thị không được làm sập request.
 * Trả về context rỗng để route vẫn phản hồi JSON hợp lệ thay vì 500.
 */
function safeEnrich(question: string): ReturnType<typeof enrichQuery> {
  try {
    return enrichQuery(question);
  } catch (err) {
    console.error("[api/chat] enrichQuery lỗi:", err);
    return {
      entityLabels: [],
      facts: [],
      causalPaths: [],
      bridgeSample: [],
      chartHints: [],
    } as unknown as ReturnType<typeof enrichQuery>;
  }
}

function buildSystemPrompt(question: string): string {
  const ctx = safeEnrich(question);

  const factsBlock = ctx.facts.length > 0
    ? ctx.facts.map((f) => {
        const unit = f.unit ? ` ${f.unit}` : "";
        const year = f.year ? ` (${f.year})` : "";
        const src = f.source ? ` | nguồn: ${f.source}` : "";
        const note = f.note ? ` — ${f.note}` : "";
        return `• ${f.indicator}: ${f.value}${unit}${year}${src}${note}`;
      }).join("\n")
    : "• (Không có facts trực tiếp trong KG — dùng số liệu chuẩn SGK KNTT Địa 8/9 làm dẫn chứng)";

  const chainBlock = ctx.causalPaths.length > 0
    ? ctx.causalPaths.slice(0, 3).map((path, i) => {
        const steps = path.chain.map((step) => {
          if (step.type === "node") return `[${step.label} (${step.grade})]`;
          return `--${step.relation}-->`;
        }).join(" ");
        return `Chuỗi ${i + 1} (${path.hops} hops): ${steps}`;
      }).join("\n")
    : "• (Không tìm thấy chuỗi nhân quả trực tiếp trong KG — mở rộng phạm vi truy vấn)";

  const bridgeBlock = ctx.bridgeSample.length > 0
    ? ctx.bridgeSample.map((b) =>
        `[${b.source.label} L8] --${b.relation}--> [${b.target.label} L9]${b.note ? ` (${b.note.slice(0, 80)})` : ""}`
      ).join("\n")
    : "• (Không có bridge L8→L9 liên quan)";

  const chartBlock = ctx.chartHints.length > 0
    ? ctx.chartHints.map((c) =>
        `→ ${c.chartType}\n  Điều kiện: ${c.condition}${c.formula ? `\n  Công thức: ${c.formula}` : ""}${c.example ? `\n  Ví dụ: ${c.example}` : ""}`
      ).join("\n\n")
    : "• (Câu hỏi này không yêu cầu nhận diện biểu đồ)";

  const entityBlock = ctx.entityLabels.length > 0
    ? ctx.entityLabels.join(" | ")
    : "(chưa nhận diện thực thể cụ thể)";

  return `${BASE_SYSTEM_PROMPT}${buildHsgSkillModuleBlock()}

━━━━━━━━━━━━━━━ CONTEXT TỪ KNOWLEDGE GRAPH ━━━━━━━━━━━━━━━

[THỰC THỂ NHẬN DIỆN]
${entityBlock}

[FACTS THỰC CHỨNG 2024–2026]
${factsBlock}

[CHUỖI NHÂN QUẢ (Graph RAG)]
${chainBlock}

[BRIDGE EDGES L8 → L9]
${bridgeBlock}

[GỢI Ý BIỂU ĐỒ]
${chartBlock}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

// ─────────────── Cơ chế Fallback tuần tự 3 tầng (APIVN) ───────────────

interface ModelAttempt {
  model: string;
  label: string;
}

const DEFAULT_LOAD_SPREAD_MODELS = [
  "deepseek-v4.1-flash",
  "glm-5.3",
  "kimi-2.7",
  "qwen-3.8",
];

function parseModelList(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function pushModel(chain: ModelAttempt[], seen: Set<string>, model: string | undefined, label: string) {
  const normalized = model?.trim();
  if (!normalized || seen.has(normalized)) return;
  seen.add(normalized);
  chain.push({ model: normalized, label });
}

function buildModelChain(needsVision = false): ModelAttempt[] {
  const chain: ModelAttempt[] = [];
  const seen = new Set<string>();
  const vision = process.env.LLM_VISION_MODEL?.trim();
  const configuredChain = parseModelList(process.env.LLM_MODEL_CHAIN);
  const primary = process.env.LLM_PRIMARY_MODEL?.trim();
  const fb1 = process.env.LLM_FALLBACK_MODEL_1?.trim();
  const fb2 = process.env.LLM_FALLBACK_MODEL_2?.trim();
  const fb3 = process.env.LLM_FALLBACK_MODEL_3?.trim();
  const fb4 = process.env.LLM_FALLBACK_MODEL_4?.trim();
  const fb5 = process.env.LLM_FALLBACK_MODEL_5?.trim();
  const fb6 = process.env.LLM_FALLBACK_MODEL_6?.trim();
  // LLM_MODEL là alias cũ — dùng làm mặc định cuối nếu không cấu hình chain
  const legacy = process.env.LLM_MODEL?.trim();

  pushModel(chain, seen, needsVision ? vision : undefined, "Vision");
  configuredChain.forEach((model, index) => pushModel(chain, seen, model, `Chain-${index + 1}`));
  pushModel(chain, seen, primary, "Primary");
  pushModel(chain, seen, fb1, "Fallback-1");
  pushModel(chain, seen, fb2, "Fallback-2");
  pushModel(chain, seen, fb3, "Fallback-3");
  pushModel(chain, seen, fb4, "Fallback-4");
  pushModel(chain, seen, fb5, "Fallback-5");
  pushModel(chain, seen, fb6, "Fallback-6");
  pushModel(chain, seen, legacy, "Legacy");

  DEFAULT_LOAD_SPREAD_MODELS.forEach((model, index) => {
    pushModel(chain, seen, model, `Auto-${index + 1}`);
  });

  if (chain.length === 0) {
    chain.push({ model: "deepseek-v4.1-flash", label: "Default" });
  }

  return chain.slice(0, 8);
}

interface LLMResult {
  answer: string;
  model: string;
  attempted: string[];
  degraded: boolean;
  lastError?: string;
}

interface ChatAttachment {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

type ChatMessageContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

interface ChatMessage {
  role: string;
  content: ChatMessageContent;
}

type ProviderJson = {
  choices?: Array<{
    message?: { content?: unknown };
    delta?: { content?: unknown };
    finish_reason?: string | null;
  }>;
  error?: { message?: string; code?: string | number; type?: string };
  usage?: unknown;
};

function truncateForLog(value: string, limit = 1200): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}...<truncated:${value.length - limit}>`;
}

function sanitizeContentForLog(content: ChatMessageContent): unknown {
  if (typeof content === "string") return truncateForLog(content);
  return content.map((item) => {
    if (item.type === "text") return { ...item, text: truncateForLog(item.text) };
    return { type: "image_url", image_url: { url: "<redacted-data-url>" } };
  });
}

function sanitizeMessagesForLog(messages: ChatMessage[]): unknown[] {
  return messages.map((message) => ({
    role: message.role,
    content: sanitizeContentForLog(message.content),
  }));
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return "";
}

function isProviderIdentityOnlyResponse(content: string): boolean {
  const normalized = content
    .toLowerCase()
    .replace(/[^a-z0-9\s.'-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const hasIdentityMarker =
    /\bi\s*(am|'m)\s+glm\b/.test(normalized) ||
    /\bmade by zhipu\b/.test(normalized) ||
    /\bzhipu\s*ai\b/.test(normalized) ||
    /我是.*(glm|智谱|智譜)/.test(content) ||
    /智谱清言|智譜清言/.test(content);

  return hasIdentityMarker && normalized.length < 240;
}

function sanitizeHistoryMessages(messages?: { role: string; content: string }[]): ChatMessage[] {
  const allowedRoles = new Set(["user", "assistant"]);
  return (messages ?? [])
    .filter((message) => allowedRoles.has(message.role))
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 8000),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-8);
}

function estimatePromptSize(messages: ChatMessage[]): number {
  return messages.reduce((total, message) => {
    if (typeof message.content === "string") return total + message.content.length;
    return total + message.content.reduce((sum, part) => {
      if (part.type === "text") return sum + part.text.length;
      return sum + 1200;
    }, 0);
  }, 0);
}

function buildAttemptTimeouts(messages: ChatMessage[], needsVision: boolean): number[] {
  const text = JSON.stringify(sanitizeMessagesForLog(messages)).toLowerCase();
  const promptSize = estimatePromptSize(messages);
  const longReasoningPrompt =
    needsVision ||
    promptSize > 6000 ||
    /(hsg|hoc sinh gioi|học sinh giỏi|luyen|luyện|phan tich|phân tích|chuyen de|chuyên đề|de thi|đề thi|barem|tho nhuong|thổ nhưỡng)/i.test(text);

  return longReasoningPrompt
    ? [34000, 10000, 6000, 3000, 2000, 1500, 1200, 1000]
    : [22000, 12000, 8000, 5000, 3000, 2000, 1500, 1000];
}

async function callLLMSequence(
  messages: ChatMessage[],
  baseUrl: string,
  apiKey: string,
  needsVision = false
): Promise<LLMResult> {
  const chain = buildModelChain(needsVision);
  const attempted: string[] = [];
  let lastError = "";
  const TIMEOUTS_MS = buildAttemptTimeouts(messages, needsVision);

  for (let i = 0; i < chain.length; i++) {
    const attempt = chain[i];
    attempted.push(attempt.model);

    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const controller = new AbortController();
      const timeoutMs = TIMEOUTS_MS[i] ?? 8000;
      timer = setTimeout(() => controller.abort(), timeoutMs);
      const requestPayload = {
        model: attempt.model,
        messages,
        temperature: 0.2,
        top_p: 0.85,
        stream: false,
        max_tokens: 4096,
      };

      console.error("[api/chat] LLM request payload", {
        model: attempt.model,
        label: attempt.label,
        base_url: baseUrl,
        timeout_ms: timeoutMs,
        payload: {
          ...requestPayload,
          messages: sanitizeMessagesForLog(messages),
        },
      });

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });
      clearTimeout(timer);
      timer = null;

      const rawText = await res.text();
      if (!res.ok) {
        lastError = `${attempt.model} -> HTTP ${res.status}: ${truncateForLog(rawText, 240)}`;
        console.error("[api/chat] LLM HTTP error", {
          model: attempt.model,
          status: res.status,
          body: truncateForLog(rawText, 2000),
        });
        continue;
      }

      let data: ProviderJson;
      try {
        data = JSON.parse(rawText) as ProviderJson;
      } catch (parseErr) {
        const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        lastError = `${attempt.model} -> malformed JSON: ${msg}`;
        console.error("[api/chat] LLM malformed JSON", {
          model: attempt.model,
          body: truncateForLog(rawText, 2000),
        });
        continue;
      }

      console.error("[api/chat] LLM raw response", {
        model: attempt.model,
        status: res.status,
        finish_reason: data.choices?.[0]?.finish_reason ?? null,
        usage: data.usage ?? null,
        body: truncateForLog(rawText, 2000),
      });

      const content = extractTextContent(
        data.choices?.[0]?.message?.content ?? data.choices?.[0]?.delta?.content
      );
      if (!content) {
        lastError = `${attempt.model} -> empty response (${data.error?.message ?? "no content"})`;
        continue;
      }

      if (isProviderIdentityOnlyResponse(content)) {
        lastError = `${attempt.model} -> provider identity-only response`;
        console.error("[api/chat] LLM rejected identity-only response", {
          model: attempt.model,
          content: truncateForLog(content, 500),
        });
        continue;
      }

      return { answer: content, model: attempt.model, attempted, degraded: false };
    } catch (err) {
      if (timer) clearTimeout(timer);
      const msg = err instanceof Error ? err.message : String(err);
      lastError = `${attempt.model} -> ${msg}`;
      console.error("[api/chat] LLM request failed", {
        model: attempt.model,
        error: msg,
      });
      continue;
    }
  }

  return { answer: "", model: "", attempted, degraded: true, lastError };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      question?: string;
      messages?: { role: string; content: string }[];
      attachments?: ChatAttachment[];
    };

    const question = body.question?.trim() ?? body.messages?.findLast((m) => m.role === "user")?.content?.trim() ?? "";
    if (!question) {
      return NextResponse.json({ error: "Câu hỏi không được để trống." }, { status: 400 });
    }

    const imageAttachments = (body.attachments ?? [])
      .filter((file) => file.type?.startsWith("image/") && file.dataUrl?.startsWith("data:image/"))
      .slice(0, 4);
    const hasAttachments = imageAttachments.length > 0;

    const ctx = safeEnrich(question);

    // ── Semantic Cache: trả 0-token khi khớp chuẩn barem ──
    const cache = lookupQuestion(question);
    if (!hasAttachments && cache.tier === "exact" && cache.record) {
      return NextResponse.json({
        answer: cache.record.answer,
        entities: ctx.entityLabels,
        facts_count: ctx.facts.length,
        paths_count: ctx.causalPaths.length,
        model_used: "qa-cache-exact",
        model_attempted: [],
        cache_tier: "exact",
        cache_score: cache.score,
        cache_source: cache.record.id,
        degraded: false,
      });
    }

    const apiKey = process.env.LLM_API_KEY?.trim();
    const baseUrl = (process.env.LLM_BASE_URL ?? "https://api.apivn.tech/v1").replace(/\/+$/, "");

    // ── Không có key → KG-only ──
    if (!apiKey) {
      return NextResponse.json({
        answer: `[Chế độ KG-only — chưa cấu hình LLM_API_KEY]\n\nThực thể nhận diện: ${ctx.entityLabels.join(", ") || "không xác định"}\n\nFacts: ${ctx.facts.map((f) => `${f.indicator}: ${f.value} ${f.unit ?? ""}`).join("; ") || "không có"}`,
        entities: ctx.entityLabels,
        facts_count: ctx.facts.length,
        paths_count: ctx.causalPaths.length,
        model_used: "kg-only",
        model_attempted: [],
        degraded: true,
      });
    }

    const systemPrompt = buildSystemPrompt(question);

    // ── Cache tầng "context": bơm lời giải gốc làm context ngắn (~200 tokens) ──
    let contextPrompt = systemPrompt;
    if (!hasAttachments && cache.tier === "context" && cache.record) {
      contextPrompt = `${systemPrompt}\n\n[GỢI Ý ĐÁP ÁN CHUẨN (context ngắn)]\n${cache.record.answer.slice(0, 1200)}`;
    }

    const attachmentInstruction = hasAttachments
      ? `\n\n[FILE ẢNH ĐÍNH KÈM]\nNgười dùng đã ghim ${imageAttachments.length} ảnh. Hãy đọc chữ viết tay/nội dung ảnh trước, sau đó phân tích, chấm chữa bài theo barem HSG nếu phù hợp. Nếu ảnh mờ hoặc thiếu trang, nói rõ phần chưa đọc được.`
      : "";
    const userContent: ChatMessageContent = hasAttachments
      ? [
          { type: "text", text: `${question}${attachmentInstruction}` },
          ...imageAttachments.map((file) => ({
            type: "image_url" as const,
            image_url: { url: file.dataUrl },
          })),
        ]
      : question;

    const messages: ChatMessage[] = [
      { role: "system", content: contextPrompt },
      ...sanitizeHistoryMessages(body.messages),
      { role: "user", content: userContent },
    ];

    const result = await callLLMSequence(messages, baseUrl, apiKey, hasAttachments);

    // ── Toàn bộ chain thất bại → trả context KG thay vì lỗi trắng ──
    if (result.degraded) {
      const factLines = ctx.facts.length > 0
        ? ctx.facts.map((f) => `• **${f.indicator}**: ${f.value}${f.unit ? ` ${f.unit}` : ""}${f.year ? ` (${f.year})` : ""}`).join("\n")
        : "• (Không có facts trực tiếp cho câu hỏi này)";

      const chainLines = ctx.causalPaths.length > 0
        ? ctx.causalPaths.slice(0, 2).map((p, i) =>
            `Chuỗi ${i + 1}: ` + p.chain.map((s) => s.type === "node" ? `[${s.label}]` : `--${s.relation}-->`).join(" ")
          ).join("\n")
        : "• (Không tìm thấy chuỗi nhân quả trực tiếp)";

      return NextResponse.json({
        answer: `⚠️ **Chế độ dự phòng (KG-only)** — cả ${result.attempted.length} mô hình đều không phản hồi.\n\n**Thực thể nhận diện:** ${ctx.entityLabels.join(" | ") || "không xác định"}\n\n**Facts thực chứng:**\n${factLines}\n\n**Chuỗi nhân quả:**\n${chainLines}`,
        entities: ctx.entityLabels,
        facts_count: ctx.facts.length,
        paths_count: ctx.causalPaths.length,
        model_used: "kg-only-degraded",
        model_attempted: result.attempted,
        last_error: result.lastError ?? null,
        degraded: true,
      });
    }

    return NextResponse.json({
      answer: result.answer,
      entities: ctx.entityLabels,
      facts_count: ctx.facts.length,
      paths_count: ctx.causalPaths.length,
      model_used: result.model,
      model_attempted: result.attempted,
      cache_tier: cache.tier,
      cache_score: cache.score,
      cache_source: cache.record?.id ?? null,
      degraded: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/chat] route fatal", { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
