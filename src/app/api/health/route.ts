import { NextResponse } from "next/server";
import { enrichQuery } from "@/lib/mcp_runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — health check cho HUB và 3 app vệ tinh ping trước khi gọi.
 * Kiểm tra: runtime sống, KG nạp được, LLM config có mặt (không lộ giá trị).
 */
export async function GET() {
  const started = Date.now();
  let kgOk = false;
  let kgDetail = "";

  try {
    const probe = enrichQuery("đồng bằng sông Cửu Long");
    kgOk = Array.isArray(probe.entityLabels);
    kgDetail = `${probe.entityLabels.length} entities · ${probe.facts.length} facts`;
  } catch (err) {
    kgDetail = err instanceof Error ? err.message : String(err);
  }

  const baseUrl = (process.env.LLM_BASE_URL ?? "https://api.apivn.tech/v1").replace(/\/+$/, "");
  const chain = [
    process.env.LLM_PRIMARY_MODEL?.trim(),
    process.env.LLM_FALLBACK_MODEL_1?.trim(),
    process.env.LLM_FALLBACK_MODEL_2?.trim(),
  ].filter(Boolean);

  return NextResponse.json({
    status: kgOk ? "ok" : "degraded",
    kg_loaded: kgOk,
    kg_detail: kgDetail,
    llm_configured: Boolean(process.env.LLM_API_KEY?.trim()),
    llm_base_url: baseUrl,
    model_chain: chain,
    latency_ms: Date.now() - started,
    timestamp: new Date().toISOString(),
  });
}
