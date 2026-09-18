# -*- coding: utf-8 -*-
import sys, os
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')

SRC_DIR = Path(r'D:\Teacher OS\HSG')
diag = Path(r'C:\Users\Gauu\.openclaw\workspace\teacher-os-chat-expert\hsg_slider\out\cdc82_diag.txt')

rows = []
for p in sorted(SRC_DIR.iterdir()):
    if p.is_file() and p.suffix.lower() in ('.doc', '.docx'):
        rows.append(f"{p.name}\t{p.suffix}\t{p.stat().st_size}")

diag.parent.mkdir(parents=True, exist_ok=True)
diag.write_text("\n".join(rows), encoding='utf-8')

# Tìm file CDC82
target = None
for p in SRC_DIR.iterdir():
    if p.is_file() and p.name.startswith('CDC82'):
        target = p
        break

if target is None:
    print("NO_CDC82_FILE")
else:
    print("FOUND:", target.name)
    print("FULL:", target)
