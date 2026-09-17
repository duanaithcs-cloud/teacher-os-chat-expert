# 🧠 Teacher OS — Chatbot AI Chuyên gia Địa lí (Graph-RAG + MCP)

Web App chatbot luyện thi **Học sinh giỏi Địa lí 8 & 9**, khai thác trực tiếp **Knowledge Graph** (316 nodes, 388 edges, 104 bridge L8→L9) và **Facts thực chứng 2024–2026** (254 facts).

> Tác giả: **ThS. Phùng Văn Tiến** · Nền tảng: Next.js App Router + TypeScript + Tailwind CSS

---

## 🎯 Điểm khác biệt

| Tiêu chí | LLM thương mại thuần | Chatbot này |
|---|---|---|
| Số liệu định lượng | ~40% (số liệu SGK cũ ~15 năm) | **99%** — khóa cứng từ `admin_facts_2026.json` |
| Truy vấn nhân quả | Không có cấu trúc | **Knowledge Graph** 388 cạnh + 104 bridge L8→L9 |
| Gợi ý biểu đồ | Đoán theo xác suất | **Bộ quy tắc chuẩn** từ CHUYÊN ĐỀ BIỂU ĐỒ |
| Tính tất định | Xác suất (probabilistic) | **Ground Truth** từ KG, LLM chỉ là Synthesizer |

---

## 🚀 Chạy local

```bash
npm install
cp .env.local.example .env.local    # rồi điền LLM_API_KEY
npm run dev
```

Mở http://localhost:3000

### Biến môi trường

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `LLM_API_KEY` | Không* | API key của provider (OpenAI-compatible) |
| `LLM_BASE_URL` | Không | Mặc định `https://api.openai.com/v1` |
| `LLM_MODEL` | Không | Mặc định `gpt-4o-mini` |

\* **Nếu chưa có `LLM_API_KEY`**, app tự chuyển sang **chế độ KG-only**: trả về entities + facts trích xuất trực tiếp từ đồ thị, không synthesize câu văn. Vẫn dùng được để kiểm tra runtime.

---

## ☁️ Deploy Vercel (Hobby — 0đ)

1. Đẩy repo lên GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: chatbot AI chuyên gia Địa lí (Graph-RAG + MCP)"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. Vào [vercel.com/new](https://vercel.com/new) → Import repo → Framework tự nhận **Next.js**.
3. Thêm Environment Variables: `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`.
4. Deploy. Không cần database, không cần cấu hình thêm.

---

## 📁 Cấu trúc

```
teacher-os-chat-expert/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Chat UI (bubble, sidebar KG, sample questions)
│   │   ├── layout.tsx            # Root layout + metadata
│   │   ├── globals.css           # Tailwind + prose-chat styles
│   │   └── api/chat/route.ts     # Serverless: pipeline KG → System Prompt → LLM
│   ├── components/
│   │   └── MarkdownRenderer.tsx  # Render **bold**, list, highlight số liệu
│   ├── lib/
│   │   └── mcp_runtime.ts        # Port Graph-RAG từ Python (5 hàm lõi)
│   └── data/
│       ├── knowledge_graph.json  # 316 nodes · 388 edges · 104 bridge
│       └── admin_facts_2026.json # 254 facts thực chứng 2024–2026
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🔧 Runtime MCP (`src/lib/mcp_runtime.ts`)

Port trung thực từ `mcp_server.py` + `graph_rag_engine.py`:

| Hàm | Chức năng |
|---|---|
| `getEntityCausality(source, target, maxHops)` | BFS tìm chuỗi nhân quả đa bước (≤ 5 hops) |
| `getVerifiedFacts(entityId)` | Facts định lượng gắn với thực thể |
| `getBridgeEdges(gradeFrom, gradeTo, limit)` | Cầu nối nhân quả liên lớp L8→L9 |
| `getChartRecommendation(query)` | Nhận diện từ khóa → loại biểu đồ + công thức |
| `enrichQuery(question)` | Pipeline tổng: entities + facts + paths + bridges + chart hints |

Toàn bộ chạy **in-process**, độ trễ < 5ms, không gọi network.

---

## ⚠️ Trạng thái xác minh

- ✅ `npx tsc --noEmit` → exit 0
- ⏳ Chưa deploy (cần kết nối GitHub)
- ⏳ Chưa set `LLM_API_KEY` (app vẫn chạy ở chế độ KG-only)
