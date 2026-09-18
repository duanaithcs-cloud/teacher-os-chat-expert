# -*- coding: utf-8 -*-
import sys, os
from pathlib import Path
import win32com.client

sys.stdout.reconfigure(encoding='utf-8')

SRC_DIR = Path(r'D:\Teacher OS\HSG')
OUT = Path(r'C:\Users\Gauu\.openclaw\workspace\teacher-os-chat-expert\hsg_slider\extracted\CDC82_chu_quyen_bien_dong.txt')

target = None
for p in sorted(SRC_DIR.iterdir()):
    if p.is_file() and p.name.startswith('CĐC82') and p.suffix.lower() == '.doc':
        target = p
        break

if target is None:
    print('NO_FILE')
    sys.exit(1)

print('FOUND:', target.name)

word = win32com.client.Dispatch('Word.Application')
word.Visible = False
word.DisplayAlerts = 0
try:
    doc = word.Documents.Open(str(target), ReadOnly=True)
    text = doc.Content.Text  # Word internal Unicode — no SaveAs codepage issue
    doc.Close(False)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text, encoding='utf-8', newline='\n')
    print('OK', OUT, len(text), 'chars')
    # báo cáo số ký tự '?' và '�' nếu còn sót
    print('question_marks:', text.count('?'))
    print('replacement_chars:', text.count('\ufffd'))
finally:
    word.Quit()
