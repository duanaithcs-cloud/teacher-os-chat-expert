import { NextRequest, NextResponse } from "next/server";
import { searchQABase, QA_BASE } from "@/lib/cache/semanticCache";

export const runtime = "nodejs";

/**
 * GET /api/qa?q=<từ khoá>&category=<mã chuyên đề>&limit=<n>
 * Tra cứu 0-token ngân hàng Q&A chuẩn barem (chạy in-process, không gọi LLM).
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const category = url.searchParams.get("category") ?? null;
    const limitParam = Number(url.searchParams.get("limit") ?? "50");
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

    const result = searchQABase(q, category, limit);

    return NextResponse.json({
      ok: true,
      total: result.total,
      bank_total: QA_BASE.length,
      items: result.items.map((r) => ({
        id: r.id,
        question: r.question,
        answer: r.answer,
        category: r.category,
        source_module: r.source_module,
        tags: r.tags,
        hit_count: r.hit_count,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
