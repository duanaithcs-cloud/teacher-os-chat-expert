# -*- coding: utf-8 -*-
"""Survey cấu trúc chi tiết các file mục tiêu để xác định cách bóc tách Q&A."""
import os
import re

BASE = r"D:\Teacher OS\OpenClaw_Knowledge\02_On_Luyen_HSG"

TARGETS = [
    "KY NANG DIA LY.md",
    "Kỉ năng làm bài.md",
    "BỘ TỪ KHÓA ĐỊA LÍ VN.md",
    "FILE GHI VỞ ĐỘI TUYỂN QG HN HỌC GIÁO SƯ.md",
    "HỌC GIÁO SƯ KIÊN.md",
    "QUY LUẬT ĐỊA LÍ GIÁO SƯ.md",
    "ĐỊA NỘI DUNG VÀ CẤU TRÚC ĐỀ OLYMPIC ĐỊA 8.md",
]

OUT = r"C:\Users\Gauu\.openclaw\workspace\teacher-os-chat-expert\hsg_slider\out\skill_strategy_structure.txt"

lines = []
for name in TARGETS:
    path = os.path.join(BASE, name)
    if not os.path.exists(path):
        lines.append(f"### MISSING: {name}\n")
        continue
    with open(path, encoding="utf-8") as fh:
        content = fh.read()
    lines.append(f"\n########## {name}  ({len(content)} chars) ##########")

    # Đếm các mẫu cấu trúc
    q_count = len(re.findall(r"(?i)^\s*\**\s*C[u\u00e2]u\s+\d+", content, re.M))
    hd_count = len(re.findall(r"(?i)^\s*\*?\*?H\u01b0\u1edbng d\u1eabn", content, re.M))
    dang_count = len(re.findall(r"(?i)^\s*\*?\*?D\u1ea1ng\s+\d+", content, re.M))
    heading_count = len(re.findall(r"(?i)^\s*\*?\*?[IVX]+\.\s+\S", content, re.M))

    lines.append(f"  [COUNT] Câu N={q_count} | Hướng dẫn={hd_count} | Dạng N={dang_count} | Heading Roman={heading_count}")

    # In 60 dòng "heading-like" đầu tiên để nhìn bố cục
    heads = []
    for ln in content.split("\n"):
        s = ln.strip()
        if not s:
            continue
        if re.match(r"(?i)^\s*\*?\*?C[u\u00e2]u\s+\d+", s):
            heads.append(s[:120])
        elif re.match(r"(?i)^\s*\*?\*?D\u1ea1ng\s+\d+", s):
            heads.append(s[:120])
        elif re.match(r"(?i)^\s*\*?\*?[IVX]+\.\s+\S", s):
            heads.append(s[:120])
        if len(heads) >= 60:
            break
    lines.append("  [STRUCTURE PREVIEW]")
    for h in heads:
        lines.append("    " + h)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as fh:
    fh.write("\n".join(lines))
print("WROTE", OUT)
