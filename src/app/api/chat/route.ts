import { NextRequest, NextResponse } from "next/server";
import { enrichQuery } from "@/lib/mcp_runtime";

export const runtime = "nodejs";
// Vercel Hobby giới hạn 60s/function — giữ đúng trần này để không bị cắt giữa chừng.
export const maxDuration = 60;

// ─────────────── System Prompt khóa cứng ───────────────
const BASE_SYSTEM_PROMPT = `Bạn là "Trợ lý AI Bồi dưỡng Học sinh giỏi Địa lí" của ThS. Phùng Văn Tiến.
Nhiệm vụ: Giải đáp câu hỏi ôn thi HSG Địa lí lớp 8 (Tự nhiên VN) và lớp 9 (Kinh tế–Xã hội–Vùng).

QUY TẮC TUYỆT ĐỐI:
1. Chỉ dùng số liệu từ phần [FACTS THỰC CHỨNG] được cung cấp ở dưới. Nếu không có số liệu → ghi "chưa có số liệu thực chứng" thay vì bịa.
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
    : "• (Không có facts trực tiếp — yêu cầu HS tự tra cứu SGK KNTT 2026)";

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

  return `${BASE_SYSTEM_PROMPT}

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

function buildModelChain(): ModelAttempt[] {
  const chain: ModelAttempt[] = [];
  const primary = process.env.LLM_PRIMARY_MODEL?.trim();
  const fb1 = process.env.LLM_FALLBACK_MODEL_1?.trim();
  const fb2 = process.env.LLM_FALLBACK_MODEL_2?.trim();
  // LLM_MODEL là alias cũ — dùng làm mặc định cuối nếu không cấu hình chain
  const legacy = process.env.LLM_MODEL?.trim();

  if (primary) chain.push({ model: primary, label: "Primary" });
  if (fb1) chain.push({ model: fb1, label: "Fallback-1" });
  if (fb2) chain.push({ model: fb2, label: "Fallback-2" });

  if (chain.length === 0) {
    chain.push({ model: legacy || "deepseek-v4.1-flash", label: "Default" });
  }
  return chain;
}

interface LLMResult {
  answer: string;
  model: string;
  attempted: string[];
  degraded: boolean;
}

async function callLLMSequence(
  messages: { role: string; content: string }[],
  baseUrl: string,
  apiKey: string
): Promise<LLMResult> {
  const chain = buildModelChain();
  const attempted: string[] = [];
  let lastError = "";

  for (const attempt of chain) {
    attempted.push(attempt.model);
    try {
      const controller = new AbortController();
      // 18s/tầng × 3 tầng = 54s, vừa khít trần 60s của Vercel Hobby.
      const timer = setTimeout(() => controller.abort(), 18000);

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: attempt.model,
          messages,
          temperature: 0.2,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const errText = await res.text();
        lastError = `${attempt.model} → HTTP ${res.status}: ${errText.slice(0, 160)}`;
        continue; // thử tầng kế tiếp
      }

      const data = await res.json() as {
        choices?: { message?: { content?: string } }[];
        error?: { message?: string };
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        lastError = `${attempt.model} → phản hồi rỗng (${data.error?.message ?? "no content"})`;
        continue;
      }

      return { answer: content, model: attempt.model, attempted, degraded: false };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = `${attempt.model} → ${msg}`;
      continue; // thử tầng kế tiếp
    }
  }

  // Toàn bộ chain thất bại → chế độ KG-only degraded
  return { answer: "", model: "", attempted, degraded: true };
}

// ─────────────── POST /api/chat ───────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { question?: string; messages?: { role: string; content: string }[] };

    const question = body.question?.trim() ?? body.messages?.findLast((m) => m.role === "user")?.content?.trim() ?? "";
    if (!question) {
      return NextResponse.json({ error: "Câu hỏi không được để trống." }, { status: 400 });
    }

    const ctx = safeEnrich(question);
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
    const messages = [
      { role: "system", content: systemPrompt },
      ...(body.messages?.filter((m) => m.role !== "system").slice(-8) ?? []),
      ...(body.messages ? [] : [{ role: "user", content: question }]),
    ];

    const result = await callLLMSequence(messages, baseUrl, apiKey);

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
      degraded: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
