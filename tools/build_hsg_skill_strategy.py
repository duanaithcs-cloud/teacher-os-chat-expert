# -*- coding: utf-8 -*-
"""Lấp đầy 2 tab trống:
  - KY_NANG_DIA_LI   (Kỹ năng & Số liệu)
  - PHUONG_PHAP_ON_HSG (Chiến thuật HSG)

Nguồn: D:\Teacher OS\OpenClaw_Knowledge\02_On_Luyen_HSG\*.md (top-level)
Đọc ngân hàng hiện có -> nối thêm -> dedup theo id + similarity_hash -> ghi lại.
"""
import os
import json
import re
import hashlib
import unicodedata

BASE = r"D:\Teacher OS\OpenClaw_Knowledge\02_On_Luyen_HSG"
OUT = r"C:\Users\Gauu\.openclaw\workspace\teacher-os-chat-expert\src\data\qa_knowledge_base.json"

CAT_SKILL = "KY_NANG_DIA_LI"
CAT_STRATEGY = "PHUONG_PHAP_ON_HSG"
CREATED = "2026-09-18T00:00:00Z"


def normalize(text: str) -> str:
    if not text:
        return ""
    t = unicodedata.normalize("NFD", text)
    t = "".join(ch for ch in t if unicodedata.category(ch) != "Mn")
    t = t.lower()
    t = re.sub(r"\s+", " ", t).strip()
    return t


def sim_hash(text: str) -> str:
    return hashlib.sha256(normalize(text).encode("utf-8")).hexdigest()[:24]


def slugify(text: str) -> str:
    t = normalize(text)
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:50]


def strip_md(text: str) -> str:
    t = text or ""
    # bỏ frontmatter
    t = re.sub(r"\A---\n.*?\n---\n", "", t, flags=re.S)
    # bỏ ảnh base64 / file ảnh
    t = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", t)
    # bỏ dòng ngăn cách bảng
    t = re.sub(r"(?m)^\s*\|?\s*:?-{2,}:?\s*\|?.*$", "", t)
    # bỏ ** đậm và * đầu dòng lỏng
    t = t.replace("**", "")
    t = re.sub(r"(?m)^\s*\*\s+", "- ", t)
    # nén dòng trống
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def load_records():
    with open(OUT, encoding="utf-8") as fh:
        return json.load(fh)


def save_records(records):
    records.sort(key=lambda r: r["id"])
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(records, fh, ensure_ascii=False, indent=2)


records = load_records()
seen_ids = {r["id"] for r in records}
seen_hashes = {r["similarity_hash"] for r in records}


def add(question, answer, category, module, tags, qid):
    question = (question or "").strip()
    answer = (answer or "").strip()
    if not question or not answer or len(answer) < 30:
        return
    h = sim_hash(question)
    if qid in seen_ids or h in seen_hashes:
        return
    seen_ids.add(qid)
    seen_hashes.add(h)
    records.append({
        "id": qid,
        "question": question,
        "answer": answer,
        "category": category,
        "source_module": module,
        "tags": tags,
        "similarity_hash": h,
        "hit_count": 0,
        "created_at": CREATED,
        "doc_synced": False,
    })


# ── Bộ tách "Câu N" ───────────────────────────────────────────────
CAU_RE = re.compile(
    r"(?m)^\s*(?:\*{1,3}\s*)?C\u00e2u\s+(\d+(?:\.\d+)?)\s*[:.)]?\s*(.*)$"
)
STOP_RE = re.compile(
    r"(?m)^\s*(?:\*{1,3}\s*)?(?:"
    r"PH\u1ea6N\s+[IVX]+|"
    r"D\u1ea0NG\s+\d+|"
    r"CH\u01af\u01a0NG\s+[IVX]+|"
    r"CH\u1ee6\s+\u0110\u1ec0\s+\d+|"
    r"[IVX]+\.\s+\S"
    r")"
)


def extract_cau_blocks(content, module, category, id_prefix, tags):
    lines = content.split("\n")
    # loại bỏ dòng frontmatter
    body = strip_md(content)
    blocks = []
    matches = list(CAU_RE.finditer(body))
    for i, m in enumerate(matches):
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        seg = body[start:end]
        # chặn nếu đoạn này vượt qua heading lớn (dừng sớm)
        stop = STOP_RE.search(seg)
        if stop:
            seg = seg[:stop.start()]
        q = (m.group(2) or "").strip()
        full_q = f"Câu {m.group(1)}. {q}".strip() if q else f"Câu {m.group(1)}"
        ans = seg.strip()
        if not ans or len(ans) < 30:
            continue
        # nếu câu heading quá ngắn, gắn dòng đầu tiên của body làm câu hỏi
        if len(q) < 15:
            first = ans.split("\n")[0].strip()
            if first and not first.startswith(("-", "*", "Nhận xét", "Giải thích", "Hướng dẫn")):
                full_q = full_q + " " + first
        add(full_q, ans, category, module, tags, f"{id_prefix}-{slugify(full_q)}")


# ── 1) KY_NANG_DIA_LI: kỹ năng & số liệu ──────────────────────────
skill_files = [
    ("KY NANG DIA LY.md", "02_On_Luyen_HSG/KY NANG DIA LY"),
    ("NHẬN XÉT, PHÂN TÍCH BSL 9 PRO.md", "02_On_Luyen_HSG/NHAN XET BSL 9 PRO"),
    ("Kỉ năng làm bài.md", "02_On_Luyen_HSG/Ki nang lam bai"),
    ("BỘ TỪ KHÓA ĐỊA LÍ VN.md", "02_On_Luyen_HSG/BO TU KHOA DIA LI VN"),
]
for fname, module in skill_files:
    path = os.path.join(BASE, fname)
    if not os.path.exists(path):
        print("MISS", fname)
        continue
    content = open(path, encoding="utf-8").read()
    extract_cau_blocks(content, module, CAT_SKILL, "qaskill", ["kỹ năng", "HSG"])

# BỘ TỪ KHÓA: thêm bản ghi tổng quan theo CHỦ ĐỀ
tk = open(os.path.join(BASE, "BỘ TỪ KHÓA ĐỊA LÍ VN.md"), encoding="utf-8").read()
tk_body = strip_md(tk)
for m in re.finditer(r"(?m)^\s*\**\s*(CHỦ ĐỀ\s+\d+[^\n]*|CHỦ ĐỀ[^\n]*)\**\s*$", tk_body):
    topic = m.group(1).strip()
    # lấy đoạn cho tới chủ đề tiếp theo
    start = m.end()
    nxt = re.search(r"(?m)^\s*\**\s*CHỦ ĐỀ", tk_body[start:])
    seg = tk_body[start:] if not nxt else tk_body[start:start + nxt.start()]
    seg = seg.strip()
    if len(seg) > 40:
        add(f"Từ khóa trọng tâm — {topic}", seg, CAT_SKILL,
            "02_On_Luyen_HSG/BO TU KHOA DIA LI VN",
            ["từ khóa", "kỹ năng"], f"qaskill-tukhoa-{slugify(topic)}")


# ── 2) PHUONG_PHAP_ON_HSG: chiến thuật HSG ────────────────────────
strat_files = [
    ("QUY LUẬT ĐỊA LÍ GIÁO SƯ.md", "02_On_Luyen_HSG/QUY LUAT DIA LI"),
    ("HỌC GIÁO SƯ KIÊN.md", "02_On_Luyen_HSG/HOC GIAO SU KIEN"),
    ("FILE GHI VỞ ĐỘI TUYỂN QG HN HỌC GIÁO SƯ.md", "02_On_Luyen_HSG/FILE GHI VO DOI TUYEN QG"),
]
for fname, module in strat_files:
    path = os.path.join(BASE, fname)
    if not os.path.exists(path):
        print("MISS", fname)
        continue
    content = open(path, encoding="utf-8").read()
    extract_cau_blocks(content, module, CAT_STRATEGY, "qastrat", ["chiến thuật", "HSG"])

# CẤU TRÚC ĐỀ OLYMPIC: 1 bản ghi tổng quan
olym = open(os.path.join(BASE, "ĐỊA NỘI DUNG VÀ CẤU TRÚC ĐỀ OLYMPIC ĐỊA 8.md"), encoding="utf-8").read()
olym_body = strip_md(olym)
add("Cấu trúc và ma trận đề thi Olympic Địa lí lớp 8", olym_body, CAT_STRATEGY,
    "02_On_Luyen_HSG/CAU TRUC DE OLYMPIC DIA 8",
    ["cấu trúc đề", "chiến thuật"], "qastrat-cautrucde-olympic-dia8")

# ── Ghi + validate ────────────────────────────────────────────────
save_records(records)

by_id = {}
by_hash = {}
for r in records:
    assert r["id"] not in by_id, f"dup id {r['id']}"
    assert r["similarity_hash"] not in by_hash, f"dup hash {r['similarity_hash']}"
    by_id[r["id"]] = r
    by_hash[r["similarity_hash"]] = r

cats = {}
mods = {}
for r in records:
    cats[r["category"]] = cats.get(r["category"], 0) + 1
    mods[r["source_module"]] = mods.get(r["source_module"], 0) + 1

bad = sum(1 for r in records if "\ufffd" in r["question"] or "\ufffd" in r["answer"])
print("TOTAL:", len(records))
print("CATEGORIES:", cats)
print("MODULES:", mods)
print("BAD_CHARS:", bad)
print("SIZE:", os.path.getsize(OUT))
print("SAVED:", OUT)
