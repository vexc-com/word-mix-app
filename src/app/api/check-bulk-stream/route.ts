// src/app/api/check-bulk-stream/route.ts
//
// Streams NDJSON lines:
//   { "domain": "foo.com", "available": true }
//   { "domain": "bar.com", "available": false }
//   { "event": "done" }

import type { NextRequest } from "next/server";

const DYNA_BASE   = "https://api.dynadot.com/api3.json";
const API_KEY     = process.env.DYNADOT_API_KEY!;

// ───── throttle profile ─────
const DEFAULT_RPS = 1;          // 1 request / second
const BATCH_SIZE  = 2;          // 2 domains per request → ≈ 2 domains/sec
const TIMEOUT_MS  = 20_000;     // 20-second hard timeout
const MAX_RETRY   = 5;          // exponential back-off attempts
// ────────────────────────────

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function callDynadot(domains: string[]) {
  const params = domains
    .map((d, i) => `domain${i}=${encodeURIComponent(d)}`)
    .join("&");
  const url = `${DYNA_BASE}?key=${API_KEY}&command=search&${params}`;

  const ctrl = new AbortController();
  const t    = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res  = await fetch(url, { signal: ctrl.signal });
    const text = await res.text();

    const transient =
      res.status === 429 ||
      (/system_busy/i.test(text) && res.status === 200) ||
      (res.status >= 500 && res.status <= 599);

    if (transient) throw new Error("transient");
    if (!res.ok)   throw new Error(`Dynadot error ${res.status}: ${text}`);

    const json = JSON.parse(text);
    const list = json.SearchResponse?.SearchResults ?? [];

    return list.map((r: any) => ({
      domain:     String(r.Domain ?? "").toLowerCase(),
      available:  String(r.Available ?? "").toLowerCase().startsWith("y"),
    }));
  } finally {
    clearTimeout(t);
  }
}

async function callWithRetry(domains: string[]) {
  for (let a = 1; a <= MAX_RETRY; a++) {
    try {
      return await callDynadot(domains);
    } catch (err: any) {
      if (err?.message !== "transient" || a === MAX_RETRY)
        return domains.map(d => ({
          domain: d,
          available: null,
          error: err?.message ?? "unknown",
        }));
      const base   = 400 * Math.pow(2, a - 1);      // 0.4s, 0.8s, 1.6s…
      const jitter = Math.random() * base;
      await sleep(Math.min(base + jitter, 10_000));
    }
  }
  return [];
}

export async function POST(req: NextRequest) {
  const { domains = [], rps } = await req.json();
  const rate     = Math.max(0.2, Number(rps) || DEFAULT_RPS);
  const interval = Math.round(1000 / rate);

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc    = new TextEncoder();

  (async () => {
    try {
      for (let i = 0; i < domains.length; i += BATCH_SIZE) {
        const slice   = domains.slice(i, i + BATCH_SIZE).map(String);
        const startTs = Date.now();

        const results = await callWithRetry(slice);
        for (const r of results)
          await writer.write(enc.encode(JSON.stringify(r) + "\\n"));

        const wait = Math.max(0, interval - (Date.now() - startTs));
        if (wait && i + BATCH_SIZE < domains.length) await sleep(wait);
      }
      await writer.write(enc.encode(JSON.stringify({ event: "done" }) + "\\n"));
    } finally {
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
