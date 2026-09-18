# -*- coding: utf-8 -*-
"""Khảo sát cấu trúc file kỹ năng + chiến thuật HSG, ghi preview ra file UTF-8."""
import os
import glob
import json

BASE = r"D:\Teacher OS\OpenClaw_Knowledge\02_On_Luyen_HSG"
OUT = r"C:\Users\Gauu\.openclaw\workspace\teacher-os-chat-expert\hsg_slider\out\skill_strategy_preview.txt"

# Các file top-level (không vào hoc_sinh_gioi_k9)
files = [f for f in glob.glob(os.path.join(BASE, "*.md"))]
files.sort()

lines = []
for f in files:
    name = os.path.basename(f)
    try:
        with open(f, encoding="utf-8") as fh:
            content = fh.read()
    except Exception as e:
        lines.append(f"### {name}\n  ERROR: {e}\n")
        continue
    head = content[:600]
    lines.append(f"### {name}  ({len(content)} chars)")
    lines.append(head)
    lines.append("=" * 60)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as fh:
    fh.write("\n".join(lines))

print("WROTE", OUT)
print("FILES", len(files))
