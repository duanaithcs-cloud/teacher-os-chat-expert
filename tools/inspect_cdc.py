# -*- coding: utf-8 -*-
import sys, json
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(r'C:\Users\Gauu\.openclaw\workspace\teacher-os-chat-expert')
KG = json.loads((ROOT/'src/data/knowledge_graph.json').read_text(encoding='utf-8'))
FACTS = json.loads((ROOT/'src/data/admin_facts_2026.json').read_text(encoding='utf-8'))

nodes = KG['nodes']
edges = KG['edges']
facts = FACTS['facts']

print("TOTAL nodes:", len(nodes), "| edges:", len(edges), "| facts:", len(facts))
print()
print("=== Node slugs chứa từ khóa liên quan ===")
kws = ['song_hong','song_cuu','cuu_long','me_cong','chau_tho','van_minh','bien','dao','quyen','thuy','hoang_sa','truong_sa','lua','de','thuong_cang','phu_nam','oc_eo']
for s in nodes:
    if any(k in s for k in kws):
        print(f"  [{s}] -> {nodes[s].get('label')}")

print()
print("=== Fact id chứa từ khóa liên quan ===")
fkws = ['song_hong','cuu_long','me_cong','chau_tho','bien','dao','hoang_sa','truong_sa','ngu_truong','duong_bo_bien','vung_bien']
for f in facts:
    if any(k in f['id'] for k in fkws):
        print(f"  [{f['id']}] -> {f.get('indicator')} = {f.get('value')} {f.get('unit','')}")
