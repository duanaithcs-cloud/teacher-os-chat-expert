# RUNBOOK — teacher-os-chat-expert

Chatbot Graph-RAG bồi dưỡng HSG Địa lí (ThS. Phùng Văn Tiến). Next.js 14 + Graph-RAG + MCP runtime, deploy Vercel.

## Đường dẫn & tài khoản

- Project: `C:\Users\Gauu\.openclaw\workspace\teacher-os-chat-expert`
- Repo: `https://github.com/duanaithcs-cloud/teacher-os-chat-expert.git`, branch `main`
- Deploy: Vercel — tự redeploy khi push `main`
- Source PPTX tự nhiên: `D:\Teacher OS\HSG\PPT_On_Thi_HSG\`
- Source PPTX vùng kinh tế: `D:\Teacher OS\Tổ KHXH\Giao_an_26_27\HSG 9\`

## Mô hình & runtime

- Fallback/load-spread tối đa 8 nấc: ưu tiên `LLM_MODEL_CHAIN` nếu có, sau đó `LLM_PRIMARY_MODEL`, `LLM_FALLBACK_MODEL_1..6`, `LLM_MODEL`; app tự bổ sung các model chịu tải mặc định `deepseek-v4.1-flash`, `glm-5.3`, `kimi-2.7`, `qwen-3.8` nếu chưa có trong chain.
- APIVN base: `https://api.apivn.tech/v1`
- Env khuyến nghị trên Vercel Dashboard: `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL_CHAIN=deepseek-v4.1-flash,glm-5.3,kimi-2.7,qwen-3.8`; vẫn tương thích env cũ `LLM_PRIMARY_MODEL`, `LLM_FALLBACK_MODEL_1..6`, `LLM_MODEL`.
- `src/app/api/chat/route.ts`: `max_tokens: 4096`; timeout động giữ dưới trần 60s Vercel Hobby. Prompt HSG dài dùng `[34000,10000,6000,3000,2000,1500,1200,1000]`; prompt thường dùng `[22000,12000,8000,5000,3000,2000,1500,1000]`.

## Cấu trúc dữ liệu (append/merge, KHÔNG đè)

- `src/data/knowledge_graph.json`: `nodes` là dict slug→`{label,lesson,grade,category,status}`; `edges` là list `{source,target,relation,lesson,level,note,grade,status}`.
- `src/data/admin_facts_2026.json`: object `{schema_version,source,status,processed_lessons,facts}`; `facts` là list `{id,indicator,value,unit,lesson,source,status,node_ref?,note?}`.
- `src/app/api/chat/route.ts`: system prompt + `enrichQuery` + `callLLMSequence` (fallback 3 tầng).

## Quy trình nạp dữ liệu mới (PPTX → KG + facts)

1. Xác định source PPTX thật ở 2 thư mục trên (KHÔNG tìm trong `hsg_slider/`).
2. Chạy `python tools/parse_hsg_pptx.py` → sinh `hsg_slider/extracted/*.json`.
3. Viết script ingest (mẫu `tools/ingest_hsg.py`, `tools/ingest_kinhte.py`): `add_node`/`add_edge`/`add_fact` dedupe theo slug / (source,target,relation) / id. Ghi UTF-8 no BOM.
4. Chạy script → validate bằng Python `json.load` kiểm tra unique id + slug.
5. `npm run build` phải EXIT 0.
6. Commit + push `main` (chỉ stage file dữ liệu + script; KHÔNG commit `.env*`, `node_modules/`, `.next/`). Vercel tự redeploy.
7. Báo cáo số node/edge/fact mới + commit hash.

## Ghi JSON trên Windows

- Python: `open(..., encoding='utf-8')` + `json.dump(ensure_ascii=False)`.
- Hoặc PowerShell: `[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))`.
- KHÔNG dùng bash heredoc; lưu file `.py` rồi chạy `python file.py`.

## Sửa logic chatbot

- Sửa `src/app/api/chat/route.ts` rồi `npm run build` → commit → push.
- Trần Vercel Hobby 60s; tổng timeout 3 tầng phải < 60s.

## Red lines

- KHÔNG đụng `C:\Users\Gauu\.openclaw\workspace\dia9dragon-openclaw-dev`.
- KHÔNG commit `.env*`, `.env.local`, `.env*.bak*`, `node_modules/`, `.next/`.
- KHÔNG ghi giá trị API key vào repo/memory/skill.
- KHÔNG xóa dữ liệu cũ trong KG/facts; chỉ append/merge.
