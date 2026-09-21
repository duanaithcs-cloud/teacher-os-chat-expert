// List model IDs actually available on the APIVN endpoint. Prints IDs only.
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(path.resolve(process.cwd()), ".env.local");
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const baseUrl = (env.LLM_BASE_URL || "https://api.apivn.tech/v1").replace(/\/+$/, "");
const res = await fetch(`${baseUrl}/models`, {
  headers: { Authorization: `Bearer ${env.LLM_API_KEY}` },
});
console.log("HTTP", res.status);
const raw = await res.text();
try {
  const data = JSON.parse(raw);
  const ids = (data?.data ?? data?.models ?? []).map((m) => m.id ?? m.name ?? String(m));
  console.log(ids.length ? ids.join("\n") : raw.slice(0, 2000));
} catch {
  console.log(raw.slice(0, 2000));
}
