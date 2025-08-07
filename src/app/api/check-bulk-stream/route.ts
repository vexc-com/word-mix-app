import type { NextRequest } from "next/server";

const DYNA_BASE = "https://api.dynadot.com/api3.json";
const API_KEY = process.env.DYNADOT_KEY!;
const DEFAULT_RPS = 1; // 1 request/second for now
const BATCH_SIZE = 2;  // 2 domains per batch
const TIMEOUT_MS = 20000;
const MAX_RETRY = 5;

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function callDynadot(domains: string[]) {
  const params = domains
    .map((d, i) => `domain${i}=${encodeURIComponent(d)}`)
    .join("&");
  const url = `${DYNA_BASE}?key=${API_KEY}&command=search&${params}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const text = await res.text();

    // LOG every Dynadot response
    console.log("[Dynadot] URL:", url);
    console.log("[Dynadot] Status:", res.status);
    console.log("[Dynadot] Body:", text);

    // Retry on system_busy, 429, or 5xx
    const transient =
      res.status === 429 ||
      (/system_busy/i.test(text) && res.status === 200) ||
      (res.status >= 500 && res.status <= 599);

    if (transient) throw new Error("transient");

    if (!res.ok) throw new Error(`Dynadot error ${res.status}: ${text}`);

    // Parse according to Dynadot's real response format
    const json = JSON.parse(text);
    const results = json?.SearchResponse?.SearchResults || [];
    return results.map((r: any) => ({
      domain: r.Domain,
      available: String(r.Available ?? "").toLowerCase().startsWith("y"),
      error: r.Status !== "success" ? r.Status : undefined,
    }));
  } catch (e: any) {
    console.log("[Dynadot] FETCH ERROR", e.message || e);
    throw e;
  } finally {
    clearTimeout(t);
  }
}

// Helper to chunk an array
function chunk<T>(arr: T[], size: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

export async function POST(req: NextRequest) {
const body = await req.json();
const domains = body.domains as string[];
const rps = body.rps;

  const rate = Math.max(0.2, Number(rps) || DEFAULT_RPS);
  const interval = Math.round(1000 / rate);

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();

  (async () => {
    let doneCount = 0;
    try {
      const domainChunks = chunk(domains, BATCH_SIZE);

      for (const batch of domainChunks) {
        try {
          const results = await callDynadot(batch);
          for (const result of results) {
            doneCount++;
            await writer.write(
              enc.encode(
                JSON.stringify({
                  domain: result.domain,
                  available: !!result.available,
                  error: result.error,
                }) + "\n"
              )
            );
          }
        } catch (err: any) {
          // Log batch-level error
          console.log("[Dynadot] BATCH ERROR:", err.message || err);

          // Still write an error line for each domain in this batch
          for (const d of batch) {
            doneCount++;
            await writer.write(
              enc.encode(
                JSON.stringify({
                  domain: d,
                  available: null,
                  error: err.message || String(err),
                }) + "\n"
              )
            );
          }
        }
        await sleep(interval);
      }
    } catch (err: any) {
      console.log("[Dynadot] OUTER ERROR:", err.message || err);
    } finally {
      await writer.write(enc.encode(JSON.stringify({ event: "done" }) + "\n"));
      writer.close();
    }
  })();

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
    },
  });
}
