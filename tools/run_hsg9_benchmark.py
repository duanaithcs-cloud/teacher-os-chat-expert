# -*- coding: utf-8 -*-
"""Run deterministic HSG9 benchmark against HUB local data.

The benchmark checks whether the HUB data has enough coverage for the
fixed HSG9 matrix. It does not ask an LLM to self-grade; it scores explicit
KG/QA/blueprint evidence so gaps are actionable.
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import defaultdict
from datetime import datetime
from pathlib import Path


sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src" / "data"
EXPORTS = ROOT / "exports"

GRAPH_PATH = DATA / "knowledge_graph.json"
FACTS_PATH = DATA / "admin_facts_2026.json"
QA_PATH = DATA / "qa_knowledge_base.json"
BLUEPRINT_PATH = DATA / "hsg9_blueprint_2025_2026_plus.json"
BENCHMARK_PATH = DATA / "hsg9_benchmark_2025_2026_plus.json"


def norm(text: str) -> str:
    text = unicodedata.normalize("NFD", str(text or ""))
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = text.replace("đ", "d").replace("Đ", "D").lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", text)).strip()


def variants(text: str) -> set[str]:
    n = norm(text)
    return {n, n.replace(" ", "_")}


def load_json(path: Path):
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def node_text(key: str, node: dict) -> str:
    parts = [
        key,
        node.get("label", ""),
        node.get("lesson", ""),
        node.get("grade", ""),
        node.get("category", ""),
        node.get("status", ""),
        " ".join(node.get("aliases") or []),
    ]
    return " ".join(map(str, parts))


def edge_text(edge: dict, nodes: dict) -> str:
    source = edge.get("source", "")
    target = edge.get("target", "")
    parts = [
        source,
        target,
        nodes.get(source, {}).get("label", ""),
        nodes.get(target, {}).get("label", ""),
        edge.get("relation", ""),
        edge.get("lesson", ""),
        edge.get("level", ""),
        edge.get("note", ""),
        edge.get("grade", ""),
        edge.get("status", ""),
        edge.get("kind", ""),
    ]
    return " ".join(map(str, parts))


def build_corpus(graph: dict, facts: dict, qa: list[dict], blueprint: dict):
    nodes = graph["nodes"]
    edges = graph["edges"]
    chunks: list[tuple[str, str, str]] = []

    for key, node in nodes.items():
        chunks.append(("node", key, node_text(key, node)))
    for i, edge in enumerate(edges):
        chunks.append(("edge", f"edge:{i}", edge_text(edge, nodes)))
    for fact in facts.get("facts", []):
        chunks.append(("fact", fact.get("id", ""), " ".join(map(str, fact.values()))))
    for rec in qa:
        chunks.append(("qa", rec.get("id", ""), " ".join([
            rec.get("question", ""),
            rec.get("answer", ""),
            rec.get("category", ""),
            rec.get("source_module", ""),
            " ".join(rec.get("tags") or []),
        ])))
    chunks.append(("blueprint", blueprint.get("id", "blueprint"), json.dumps(blueprint, ensure_ascii=False)))

    normalized = [(kind, key, norm(text), text) for kind, key, text in chunks]
    return normalized


def contains_term(corpus, term: str) -> bool:
    wanted = norm(term)
    if not wanted:
        return True
    return any(wanted in text for _, _, text, _ in corpus)


def edge_present(graph: dict, pair: list[str]) -> bool:
    if len(pair) != 2:
        return False
    a_vars = variants(pair[0])
    b_vars = variants(pair[1])
    nodes = graph["nodes"]
    for edge in graph["edges"]:
        source = edge.get("source", "")
        target = edge.get("target", "")
        source_text = norm(" ".join([source, nodes.get(source, {}).get("label", "")]))
        target_text = norm(" ".join([target, nodes.get(target, {}).get("label", "")]))
        if any(v in source_text for v in a_vars) and any(v in target_text for v in b_vars):
            return True
    return False


def grade_case(case: dict, graph: dict, corpus) -> dict:
    terms = case.get("required_terms", [])
    edges = case.get("required_edges", [])
    term_hits = [term for term in terms if contains_term(corpus, term)]
    edge_hits = [edge for edge in edges if edge_present(graph, edge)]

    term_score = len(term_hits) / len(terms) if terms else 1.0
    edge_score = len(edge_hits) / len(edges) if edges else 1.0
    # Concept coverage matters slightly more, but causal edges are mandatory
    # for HSG explanation questions.
    score = (0.6 * term_score) + (0.4 * edge_score)
    passed = score >= 0.95
    return {
        "id": case["id"],
        "section": case["section"],
        "topic": case["topic"],
        "level": case["level"],
        "points": case["points"],
        "prompt": case["prompt"],
        "score": round(score, 4),
        "passed": passed,
        "term_hits": term_hits,
        "term_missing": [term for term in terms if term not in term_hits],
        "edge_hits": edge_hits,
        "edge_missing": [edge for edge in edges if edge not in edge_hits],
    }


def main():
    graph = load_json(GRAPH_PATH)
    facts = load_json(FACTS_PATH)
    qa = load_json(QA_PATH)
    blueprint = load_json(BLUEPRINT_PATH)
    benchmark = load_json(BENCHMARK_PATH)
    corpus = build_corpus(graph, facts, qa, blueprint)

    results = [grade_case(case, graph, corpus) for case in benchmark["cases"]]
    total_points = sum(r["points"] for r in results)
    earned_points = sum(r["points"] * r["score"] for r in results)
    point_score = earned_points / total_points if total_points else 0
    pass_count = sum(1 for r in results if r["passed"])
    case_score = pass_count / len(results) if results else 0

    by_section = defaultdict(lambda: {"points": 0.0, "earned": 0.0, "cases": 0, "passed": 0})
    by_topic = defaultdict(lambda: {"points": 0.0, "earned": 0.0, "cases": 0, "passed": 0})
    for r in results:
        for bucket in (by_section[r["section"]], by_topic[r["topic"]]):
            bucket["points"] += r["points"]
            bucket["earned"] += r["points"] * r["score"]
            bucket["cases"] += 1
            bucket["passed"] += int(r["passed"])

    report = {
        "benchmark_id": benchmark["id"],
        "run_at": datetime.now().isoformat(timespec="seconds"),
        "threshold": benchmark["pass_threshold"],
        "case_count": len(results),
        "pass_count": pass_count,
        "case_score": round(case_score, 4),
        "point_score": round(point_score, 4),
        "earned_points": round(earned_points, 3),
        "total_points": round(total_points, 3),
        "passed_threshold": point_score >= benchmark["pass_threshold"],
        "by_section": {
            key: {
                "score": round(val["earned"] / val["points"], 4) if val["points"] else 0,
                "passed_cases": val["passed"],
                "cases": val["cases"],
                "points": round(val["points"], 3),
            }
            for key, val in sorted(by_section.items())
        },
        "by_topic": {
            key: {
                "score": round(val["earned"] / val["points"], 4) if val["points"] else 0,
                "passed_cases": val["passed"],
                "cases": val["cases"],
                "points": round(val["points"], 3),
            }
            for key, val in sorted(by_topic.items())
        },
        "results": results,
        "top_gaps": [
            {
                "id": r["id"],
                "topic": r["topic"],
                "score": r["score"],
                "missing_terms": r["term_missing"][:8],
                "missing_edges": r["edge_missing"][:3],
            }
            for r in sorted(results, key=lambda x: x["score"]) if not r["passed"]
        ][:12],
    }

    EXPORTS.mkdir(exist_ok=True)
    json_path = EXPORTS / "hsg9_benchmark_report.json"
    md_path = EXPORTS / "hsg9_benchmark_report.md"
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = [
        "# HSG9 Benchmark Report",
        "",
        f"- Run: {report['run_at']}",
        f"- Benchmark: `{report['benchmark_id']}`",
        f"- Point score: **{report['point_score'] * 100:.2f}%** ({report['earned_points']}/{report['total_points']} điểm chuẩn hóa)",
        f"- Case score: **{report['case_score'] * 100:.2f}%** ({report['pass_count']}/{report['case_count']} ca pass)",
        f"- Threshold: **{report['threshold'] * 100:.0f}%**",
        f"- Status: **{'PASS' if report['passed_threshold'] else 'NOT YET'}**",
        "",
        "## By Section",
        "",
    ]
    for key, val in report["by_section"].items():
        lines.append(f"- `{key}`: {val['score'] * 100:.2f}% | {val['passed_cases']}/{val['cases']} cases | {val['points']} pts")
    lines.extend(["", "## Top Gaps", ""])
    if report["top_gaps"]:
        for gap in report["top_gaps"]:
            lines.append(f"- `{gap['id']}` ({gap['topic']}): {gap['score'] * 100:.1f}%")
            if gap["missing_terms"]:
                lines.append(f"  - Missing terms: {', '.join(gap['missing_terms'])}")
            if gap["missing_edges"]:
                lines.append(f"  - Missing edges: {gap['missing_edges']}")
    else:
        lines.append("- No gaps.")
    lines.extend(["", "## All Cases", ""])
    for r in results:
        mark = "PASS" if r["passed"] else "GAP"
        lines.append(f"- `{r['id']}` {mark}: {r['score'] * 100:.1f}% - {r['prompt']}")
    md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"Benchmark: {benchmark['id']}")
    print(f"Point score: {report['point_score'] * 100:.2f}%")
    print(f"Case score: {report['case_score'] * 100:.2f}% ({pass_count}/{len(results)})")
    print(f"Status: {'PASS' if report['passed_threshold'] else 'NOT YET'}")
    print(f"Report JSON: {json_path}")
    print(f"Report MD: {md_path}")
    if report["top_gaps"]:
        print("Top gaps:")
        for gap in report["top_gaps"][:8]:
            print(f"- {gap['id']}: {gap['score'] * 100:.1f}%")


if __name__ == "__main__":
    main()
