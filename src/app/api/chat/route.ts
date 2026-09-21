import { NextRequest, NextResponse } from "next/server";
import { enrichQuery } from "@/lib/mcp_runtime";
import { lookupQuestion, getQARecord } from "@/lib/cache/semanticCache";
import hsgSkillModules from "@/data/hsg_skill_modules.json";
import hsg9Blueprint from "@/data/hsg9_blueprint_2025_2026_plus.json";

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

function normalizeIntentText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function isExamGenerationRequest(question: string): boolean {
  const text = normalizeIntentText(question);
  return /(soan|ra|tao|sinh).{0,24}(de)|de hsg|ma tran|huong dan cham|barem|chuan so/.test(text);
}

function hasExamIntent(messages: ChatMessage[]): boolean {
  return isExamGenerationRequest(JSON.stringify(sanitizeMessagesForLog(messages)));
}

function buildCompactExamSystemPrompt(): string {
  const blueprint = hsg9Blueprint as {
    matrix: Array<{ section: string; type: string; topic?: string; points: number; topics?: Array<{ name: string; points: number }> }>;
  };
  const matrixLines = blueprint.matrix.map((item) => {
    const topic = item.topic ?? item.topics?.map((t) => `${t.name} ${t.points}đ`).join("; ") ?? "";
    return `- ${item.section}: ${item.type}, ${item.points} điểm. ${topic}`;
  }).join("\n");

  return `Bạn là trợ lý ra đề HSG Địa lí 9 Hà Nội trong HUB Teacher OS.
Nhiệm vụ hiện tại là SOẠN ĐỀ, HDC, MA TRẬN theo phong cách Sở, không giải thích dài về hệ thống.

Luật bắt buộc:
- Tổng điểm 20, thời gian 150 phút.
- Phần A: 4 điểm, gồm 8 câu lựa chọn + 2 câu đúng/sai.
- 8 câu lựa chọn phải cân bằng đáp án A/B/C/D = 2/2/2/2.
- Mỗi câu đúng/sai có 4 ý a,b,c,d; HDC đúng/sai chấm lũy tiến: 1 ý = 0,10; 2 ý = 0,25; 3 ý = 0,50; 4 ý = 1,00.
- Phần B tự luận 16 điểm: Tự nhiên Việt Nam 3,5; Dân cư + ngành kinh tế 4,5; TDMNPB + ĐBSH 4,0; biểu đồ 4,0.
- Tỉ lệ nhận thức toàn đề: NB 20%, TH 45%, VD 35%.
- Giữ nền lớp 8/Tự nhiên Việt Nam; không sao chép đề gốc của Sở.
- Câu hỏi phải khác đề mẫu nhưng cùng cấu trúc, cùng kiểu tư duy.
- HDC phải có barem điểm chi tiết, chấp nhận cách diễn đạt khác nếu đúng bản chất.
- Biểu đồ ưu tiên dạng kết hợp cột - đường khi có hai đại lượng khác đơn vị.

Ma trận khóa:
${matrixLines}

Đầu ra bắt buộc:
1. MA TRẬN TÓM TẮT.
2. ĐỀ THI.
3. ĐÁP ÁN/HƯỚNG DẪN CHẤM.
4. AUDIT NGẮN: tổng điểm, A/B/C/D, đúng/sai, tỉ lệ nhận thức, điểm biểu đồ.`;
}

function buildExamGenerationFallback(attempted: string[], lastError?: string): string {
  return `⚠️ **LLM đang quá tải, HUB dùng bộ sinh đề chuẩn Sở nội bộ để không rơi KG-only.**

**1. Ma trận tóm tắt**
- Tổng điểm: 20,0; thời gian: 150 phút.
- Phần A: 4,0 điểm gồm 8 câu lựa chọn và 2 câu đúng/sai.
- Phần B: 16,0 điểm gồm Tự nhiên Việt Nam 3,5; Dân cư + ngành kinh tế 4,5; Vùng TDMNPB + ĐBSH 4,0; biểu đồ 4,0.
- Nhận thức: NB 20%, TH 45%, VD 35%.

**2. Đề thi mẫu khác đề Sở**

**A. Trắc nghiệm khách quan - 4,0 điểm**
*I. Lựa chọn đáp án đúng nhất. Mỗi câu 0,25 điểm.*

1. Nhân tố làm thiên nhiên Việt Nam có tính nhiệt đới rõ là
A. nằm trong khu vực nội chí tuyến. B. có nhiều cao nguyên. C. có đồng bằng rộng. D. có nhiều đô thị.

2. Ảnh hưởng của Biển Đông đến thiên nhiên nước ta thể hiện rõ ở
A. làm khí hậu khô hạn. B. làm tăng tính ẩm và lượng mưa. C. làm mất tính mùa. D. làm giảm bão.

3. Đất feralit ở nước ta phổ biến chủ yếu do
A. khí hậu lạnh quanh năm. B. ít mưa. C. khí hậu nóng ẩm, mưa nhiều và rửa trôi mạnh. D. địa hình bằng phẳng.

4. Vùng thuận lợi phát triển cây công nghiệp, cây dược liệu cận nhiệt ở TDMNPB là nơi có
A. bãi triều rộng. B. khí hậu phân hóa theo độ cao. C. đất phèn lớn. D. mạng lưới kênh rạch dày.

5. Đặc điểm nổi bật của dân cư Đồng bằng sông Hồng là
A. thưa dân. B. mật độ dân số thấp. C. thiếu lao động. D. dân cư đông, mật độ cao.

6. Nhân tố tự nhiên tạo cơ sở cho công nghiệp khai khoáng là
A. thị trường. B. khoáng sản. C. lao động. D. chính sách.

7. Biểu đồ phù hợp nhất khi thể hiện một đại lượng tuyệt đối và một đại lượng tốc độ tăng trưởng là
A. biểu đồ tròn. B. biểu đồ miền. C. biểu đồ cột chồng. D. biểu đồ kết hợp.

8. Khi nhận xét bảng số liệu HSG, thao tác bắt buộc là
A. nêu xu hướng, so sánh và dẫn số liệu. B. chỉ đọc lại từng số. C. bỏ qua đơn vị. D. nêu cảm tính.

*II. Đúng/Sai. Mỗi câu có 4 ý; chấm lũy tiến theo HDC.*

9. Về tự nhiên Việt Nam:
a) Vị trí nội chí tuyến làm nước ta có nền nhiệt cao.
b) Biển Đông làm thiên nhiên nước ta hoàn toàn khô hạn.
c) Lãnh thổ kéo dài góp phần làm thiên nhiên phân hóa Bắc - Nam.
d) Khí hậu nóng ẩm thúc đẩy phong hóa hóa học và feralit hóa.

10. Về dân cư, kinh tế và vùng:
a) ĐBSH có dân cư đông, lao động dồi dào nhưng chịu sức ép lớn về việc làm, đất đai, môi trường.
b) TDMNPB không có tiềm năng thủy điện.
c) Khoáng sản là cơ sở để phát triển một số ngành công nghiệp ở TDMNPB.
d) Liên kết TDMNPB - ĐBSH giúp bổ sung nguyên liệu, năng lượng, thị trường và lao động.

**B. Tự luận - 16,0 điểm**

**Câu I. Tự nhiên Việt Nam - 3,5 điểm**
1. Phân tích ảnh hưởng của vị trí địa lí và phạm vi lãnh thổ đến khí hậu, sinh vật và cảnh quan thiên nhiên Việt Nam. 2,0 điểm.
2. Giải thích vì sao đất feralit phổ biến ở vùng đồi núi nước ta và nêu vấn đề bảo vệ đất ở khu vực này. 1,5 điểm.

**Câu II. Dân cư và ngành kinh tế - 4,5 điểm**
1. Trình bày đặc điểm quần cư thành thị ở nước ta và giải thích xu hướng tăng tỉ lệ dân thành thị. 2,0 điểm.
2. Phân tích tác động của các nhân tố tự nhiên đến sự phát triển và phân bố công nghiệp nước ta. 2,5 điểm.

**Câu III. Vùng kinh tế - 4,0 điểm**
1. Chứng minh điều kiện tự nhiên và tài nguyên thiên nhiên của TDMNPB tạo thuận lợi cho phát triển nông nghiệp hàng hóa, du lịch, thủy điện và khai khoáng. 2,5 điểm.
2. Phân tích đặc điểm dân cư ĐBSH và giải thích vì sao cần tăng cường liên kết kinh tế giữa ĐBSH với TDMNPB. 1,5 điểm.

**Câu IV. Kĩ năng biểu đồ - 4,0 điểm**
Cho bảng số liệu giả định:
Năm: 2015 | 2017 | 2019 | 2021 | 2023
GDP, tỉ USD: 95 | 112 | 138 | 160 | 196
Tốc độ tăng trưởng GDP, %: 6,2 | 6,6 | 7,0 | 5,1 | 7,3

1. Vẽ biểu đồ thích hợp nhất thể hiện GDP và tốc độ tăng trưởng GDP giai đoạn 2015-2023. 2,0 điểm.
2. Nhận xét GDP và tốc độ tăng trưởng GDP giai đoạn trên. 1,5 điểm.
3. Giải thích vì sao biểu đồ đã chọn là phù hợp. 0,5 điểm.

**3. Đáp án/HDC tóm tắt**
- Lựa chọn: 1A 2B 3C 4B 5D 6B 7D 8A. A/B/C/D = 2/2/2/2.
- Đúng/Sai: 9: a Đ, b S, c Đ, d Đ. 10: a Đ, b S, c Đ, d Đ. Chấm mỗi câu theo thang lũy tiến: 1 ý 0,10; 2 ý 0,25; 3 ý 0,50; 4 ý 1,00.
- Tự luận chấm theo barem luận điểm, cơ chế, dẫn chứng; chấp nhận cách diễn đạt khác nếu đúng bản chất.
- Câu IV: biểu đồ kết hợp cột - đường; đủ tên, chú giải, đơn vị, 2 trục; nhận xét GDP tăng, tốc độ tăng trưởng biến động.

**4. Audit**
- Cấu trúc: 8 lựa chọn + 2 đúng/sai + tự luận 16 điểm.
- Tổng điểm: 20,0.
- Đáp án lựa chọn cân bằng A/B/C/D = 2/2/2/2.
- Có thang đúng/sai lũy tiến đúng HDC Sở.
- Không sao chép đề Sở; giữ cùng ma trận và kiểu tư duy.

**Kĩ thuật:** model đã thử: ${attempted.join(", ") || "không có"}${lastError ? `; lỗi cuối: ${lastError}` : ""}.`;
}

// ─────────────── Cơ chế Fallback tuần tự 3 tầng (APIVN) ───────────────

interface ModelAttempt {
  model: string;
  label: string;
}

const DEFAULT_LOAD_SPREAD_MODELS = [
  // Model ID phai ton tai tren APIVN; xep theo do tre do duoc thuc te.
  "gemini-3.7-flash",
  "deepseek-v4.1-flash",
  "gemini-3.8-flash",
  "qwen3.8-flash",
  "kimi-k2.6",
  "glm-5.3-flash",
  "glm-5.3",
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
  const text = normalizeIntentText(JSON.stringify(sanitizeMessagesForLog(messages)));
  const promptSize = estimatePromptSize(messages);
  const examGenerationPrompt = /(soan|ra|tao|sinh).{0,24}(de)|de hsg|ma tran|huong dan cham|chuan so/.test(text);
  const longReasoningPrompt =
    needsVision ||
    promptSize > 6000 ||
    /(hsg|hoc sinh gioi|học sinh giỏi|luyen|luyện|phan tich|phân tích|chuyen de|chuyên đề|de thi|đề thi|barem|tho nhuong|thổ nhưỡng)/i.test(text);

  if (examGenerationPrompt) {
    return [40000, 12000, 4000, 2000, 1000, 500, 500, 500];
  }

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
      const examIntent = hasExamIntent(messages);
      const requestPayload = {
        model: attempt.model,
        messages,
        temperature: 0.2,
        top_p: 0.85,
        stream: false,
        max_tokens: examIntent ? 8000 : 4096,
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

    const isExamRequest = isExamGenerationRequest(question);
    const systemPrompt = isExamRequest ? buildCompactExamSystemPrompt() : buildSystemPrompt(question);

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
      if (isExamRequest && !hasAttachments) {
        return NextResponse.json({
          answer: buildExamGenerationFallback(result.attempted, result.lastError),
          entities: ctx.entityLabels,
          facts_count: ctx.facts.length,
          paths_count: ctx.causalPaths.length,
          model_used: "hsg9-template-degraded",
          model_attempted: result.attempted,
          last_error: result.lastError ?? null,
          degraded: true,
        });
      }

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
