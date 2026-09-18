# -*- coding: utf-8 -*-
import sys, json
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(r'C:\Users\Gauu\.openclaw\workspace\teacher-os-chat-expert')
KG_PATH = ROOT / 'src/data/knowledge_graph.json'
FACTS_PATH = ROOT / 'src/data/admin_facts_2026.json'

kg = json.loads(KG_PATH.read_text(encoding='utf-8'))
facts_doc = json.loads(FACTS_PATH.read_text(encoding='utf-8'))

# 1) Sửa edge tham chiếu sai slug
fixed_edge = 0
for e in kg['edges']:
    if e.get('source') == 'vung_bien_viet_nam':
        e['source'] = 'vung bien viet nam'; fixed_edge += 1
    if e.get('target') == 'vung_bien_viet_nam':
        e['target'] = 'vung bien viet nam'; fixed_edge += 1

# 2) Sửa fact node_ref sai slug
fixed_ref = 0
for f in facts_doc['facts']:
    if f.get('node_ref') == 'vung_dac_quyen_kinh_te':
        f['node_ref'] = 'vung dac quyen kinh te'; fixed_ref += 1

def write_json(p, obj):
    txt = json.dumps(obj, ensure_ascii=False, indent=2)
    p.write_text(txt + '\n', encoding='utf-8', newline='\n')

write_json(KG_PATH, kg)
write_json(FACTS_PATH, facts_doc)
print("fixed edge refs:", fixed_edge)
print("fixed fact node_refs:", fixed_ref)
