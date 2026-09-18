# -*- coding: utf-8 -*-
"""Bóc tách Q&A từ dia8dragon (33 chuyên đề L8) + dia9dragon (20 chuyên đề L9)
=> hợp nhất vào src/data/qa_knowledge_base.json
Cấu trúc bản ghi:
  { id, question, answer, category, source_module, tags, similarity_hash,
    hit_count, created_at, doc_synced }
"""
import os
import json
import re
import hashlib
import unicodedata
from datetime import datetime, timezone

WS = r"C:\Users\Gauu\.openclaw\workspace"
DIA8 = os.path.join(WS, "dia8dragon-openclaw-dev", "dist", "data", "topics")
DIA9 = os.path.join(WS, "dia9dragon-cryptobubbles-test", "dist", "data", "topics")
OUT = os.path.join(WS, "teacher-os-chat-expert", "src", "data", "qa_knowledge_base.json")

CAT_L8 = "CHUYEN_DE_TU_NHIEN_L8"
CAT_L9 = "CHUYEN_DE_KINH_TE_L9"
CREATED = "2026-09-18T00:00:00Z"


def normalize(text: str) -> str:
    """Chuẩn hoá: bỏ dấu, lowercase, gộp khoảng trắng — dùng cho hash + so khớp."""
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
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


records = []
seen_ids = set()
seen_hashes = set()


def add(question, answer, category, module, tags, qid):
    question = (question or "").strip()
    answer = (answer or "").strip()
    if not question or not answer:
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


def clean_answer(lines):
    """Loại bỏ dòng 'Hướng dẫn' thừa và nối mạch lạc."""
    out = []
    for ln in lines:
        ln = ln.strip()
        if not ln:
            continue
        if re.match(r"^H\u01b0\u1edbng d\u1eabn\b", ln, re.IGNORECASE):
            continue
        out.append(ln)
    return "\n".join(out)


# ─────────────── DIA8: 33 chuyên đề L8 ───────────────
manifest8 = json.load(open(os.path.join(DIA8, "manifest.json"), encoding="utf-8"))
for t in manifest8.get("topics", []):
    tid = t["topic_id"]
    label = t["label"].strip()
    path = os.path.join(DIA8, f"topic-{tid:02d}.json")
    if not os.path.exists(path):
        continue
    data = json.load(open(path, encoding="utf-8"))
    full_text = data.get("full_text") or ""
    summary = data.get("summary") or ""
    tags = [label, "L8", slugify(label)]

    # 1) Bản ghi tổng quan chuyên đề
    overview_answer = full_text or summary
    add(f"Tr\u00ecnh b\u00e0y: {label}", overview_answer, CAT_L8, "dia8dragon", tags, f"qa8-{tid:02d}-overview")

    # 2) Các câu tự luận (essay_items)
    for it in data.get("essay_items", []):
        q = it.get("question") or ""
        guide = it.get("guide") or ""
        ans = guide or full_text
        if not q:
            continue
        eid = it.get("id") or f"essay-{tid:02d}-{it.get('source_no', 0)}"
        add(q, ans, CAT_L8, "dia8dragon", tags + ["t\u1ef1 lu\u1eadn"], f"qa8-{tid:02d}-{slugify(eid)[:40]}")

# ─────────────── DIA9: 20 chuyên đề L9 ───────────────
manifest9 = json.load(open(os.path.join(DIA9, "manifest.json"), encoding="utf-8"))
Q_RE = re.compile(r"^C[u\u00e2]u\s+(\d+)\s*[:.]")

for t in manifest9:
    tid = t["topic_id"]
    label = t["label"].strip()
    path = os.path.join(DIA9, f"topic-{tid:02d}.json")
    if not os.path.exists(path):
        continue
    data = json.load(open(path, encoding="utf-8"))
    group = (data.get("group") or label).strip()
    blocks = data.get("blocks", [])
    tags = [label, group, "L9", slugify(label)]

    # Duyệt tuần tự: gom câu hỏi + đáp án (chỉ giữ câu có "Hướng dẫn")
    cur_q = None
    cur_lines = []
    saw_guide = False

    def flush():
        global cur_q, cur_lines, saw_guide
        if cur_q and saw_guide:
            ans = clean_answer(cur_lines)
            if ans:
                add(cur_q, ans, CAT_L9, "dia9dragon", tags + ["t\u1ef1 lu\u1eadn"],
                    f"qa9-{tid:02d}-{slugify(cur_q)[:40]}")
        cur_q = None
        cur_lines = []
        saw_guide = False

    for b in blocks:
        text = (b.get("text") or "").strip()
        if not text:
            continue
        m = Q_RE.match(text)
        if m:
            flush()
            cur_q = text
            cur_lines = []
            saw_guide = False
            continue
        if cur_q is not None:
            if re.match(r"^H\u01b0\u1edbng d\u1eabn", text, re.IGNORECASE):
                saw_guide = True
                cur_lines.append(text)
            else:
                cur_lines.append(text)
    flush()

# Sắp xếp ổn định theo id
records.sort(key=lambda r: r["id"])

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8", newline="\n") as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

# ─────────────── Validate ───────────────
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
