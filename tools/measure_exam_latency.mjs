// Measure how long a full exam generation takes per model via APIVN.
// Prints timing only; never prints the API key.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const envPath = path.join(root, ".env.local");
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const baseUrl = (env.LLM_BASE_URL || "https://api.apivn.tech/v1").replace(/\/+$/, "");
const apiKey = env.LLM_API_KEY;
const models = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [env.LLM_PRIMARY_MODEL, env.LLM_FALLBACK_MODEL_1, env.LLM_FALLBACK_MODEL_2].filter(Boolean);

const prompt = process.argv.includes("--prompt")
  ? process.argv[process.argv.indexOf("--prompt") + 1]
  : "Soạn 1 đề HSG Địa lí 9 đầy đủ theo ma trận Sở Hà Nội, kèm hướng dẫn chấm.";

for (const model of models) {
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 180000);
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "Bạn là trợ lý ra đề HSG Địa lí 9. Trả lời đầy đủ ma trận, đề, hướng dẫn chấm." },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
      }),
    });
    clearTimeout(timer);
    const ms = Date.now() - t0;
    if (!res.ok) {
      const body = await res.text();
      console.log(`${model}\tHTTP ${res.status}\t${ms}ms\t${body.slice(0, 160).replace(/\s+/g, " ")}`);
      continue;
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    const usage = data?.usage ?? {};
    console.log(`${model}\tOK\t${ms}ms\tchars=${text.length}\tcompletion_tokens=${usage.completion_tokens ?? "?"}`);
  } catch (e) {
    console.log(`${model}\tERR\t${Date.now() - t0}ms\t${String(e).slice(0, 160)}`);
  }
}
