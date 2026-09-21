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
  const configuredChain = (process.env.LLM_MODEL_CHAIN ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const chain = [
    process.env.LLM_VISION_MODEL?.trim(),
    ...configuredChain,
    process.env.LLM_PRIMARY_MODEL?.trim(),
    process.env.LLM_FALLBACK_MODEL_1?.trim(),
    process.env.LLM_FALLBACK_MODEL_2?.trim(),
    process.env.LLM_FALLBACK_MODEL_3?.trim(),
    process.env.LLM_FALLBACK_MODEL_4?.trim(),
    process.env.LLM_FALLBACK_MODEL_5?.trim(),
    process.env.LLM_FALLBACK_MODEL_6?.trim(),
    process.env.LLM_MODEL?.trim(),
    "deepseek-v4.1-flash",
    "glm-5.3",
    "kimi-2.7",
    "qwen-3.8",
  ].filter(Boolean)
    .filter((model, index, list) => list.indexOf(model) === index)
    .slice(0, 8);

  return NextResponse.json({
    status: kgOk ? "ok" : "degraded",
    kg_loaded: kgOk,
    kg_detail: kgDetail,
    llm_configured: Boolean(process.env.LLM_API_KEY?.trim()),
    llm_base_url: baseUrl,
    model_chain: chain,
    model_chain_size: chain.length,
    latency_ms: Date.now() - started,
    timestamp: new Date().toISOString(),
  });
}
