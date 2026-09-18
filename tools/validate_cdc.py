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

# node slug uniqueness
slugs = list(nodes.keys())
dup_slugs = len(slugs) - len(set(slugs))

# edge uniqueness (source,target,relation)
ekeys = [(e['source'], e['target'], e['relation']) for e in edges]
dup_edges = len(ekeys) - len(set(ekeys))

# fact id uniqueness
fids = [f['id'] for f in facts]
dup_facts = len(fids) - len(set(fids))

# dangling edge refs
node_set = set(slugs)
dangling = [k for k in ekeys if k[0] not in node_set or k[1] not in node_set]

print("nodes:", len(nodes), "| edges:", len(edges), "| facts:", len(facts))
print("dup node slugs:", dup_slugs)
print("dup edges:", dup_edges)
print("dup fact ids:", dup_facts)
print("dangling edge refs:", len(dangling))
for d in dangling[:20]:
    print("  DANGLING:", d)
