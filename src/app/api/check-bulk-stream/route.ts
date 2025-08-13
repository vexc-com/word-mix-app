import type { NextRequest } from "next/server";

/* ------------------------------------------------------------------ */
/* Dynadot config & simple helpers                                    */
/* ------------------------------------------------------------------ */
const DYNA_BASE   = "https://api.dynadot.com/api3.json";
const API_KEY     = process.env.DYNADOT_KEY!;
const DEFAULT_RPS = 1;        // 1 request-per-second (can be lowered by body.rps)
const BATCH_SIZE  = 2;        // 2 domains per Dynadot request
const TIMEOUT_MS  = 20_000;   // hard stop per HTTP request
const MAX_RETRY   = 5;        // exponential-back-off attempts (left in place)

/** TLDs that require multi-year minimum registration (total due at checkout) */
const MIN_YEARS: Record<string, number> = {
  ai: 2, // .AI requires 2 years
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const formatUsd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

/* ------------------------------------------------------------------ */
/* Low-level call to Dynadot “search” (with price)                     */
/* ------------------------------------------------------------------ */
async function callDynadot(domains: string[]) {
  const params = domains.map((d, i) => `domain${i}=${encodeURIComponent(d)}`).join("&");
  // Include pricing in USD so we can show $ immediately in the UI
  const url    = `${DYNA_BASE}?key=${API_KEY}&command=search&show_price=1&currency=USD&${params}`;

  const ctrl = new AbortController();
  const t    = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res  = await fetch(url, { signal: ctrl.signal });
    const text = await res.text();

    console.log("[Dynadot] URL:", url);
    console.log("[Dynadot] Status:", res.status);
    console.log("[Dynadot] Body:", text);

    /* ── transient / retryable errors ─────────────────────────────── */
    const transient =
      res.status === 429 ||
      (/system_busy/i.test(text) && res.status === 200) ||
      (res.status >= 500 && res.status <= 599);

    if (transient) throw new Error("transient");

    if (!res.ok) throw new Error(`Dynadot error ${res.status}: ${text}`);

    /* ── parse Dynadot’s SearchResponse ───────────────────────────── */
    const json     = JSON.parse(text);
    console.log("[Dynadot] Parsed:", JSON.stringify(json, null, 2));
    const rawList  = json?.SearchResponse?.SearchResults ?? [];

    return rawList.map((r: any) => {
      // Dynadot sometimes uses DomainName, sometimes Domain
      const domainName = String(r.DomainName ?? r.Domain ?? "").toLowerCase();

      const tld = domainName.split(".").pop() ?? "";
      const minYears = MIN_YEARS[tld] ?? 1;

      // Available comes back as "yes"/"no"
      const isAvailable =
        typeof r.Available === "string"
          ? r.Available.toLowerCase().startsWith("y")
          : Boolean(r.Available);

      // Price is a free-text string when show_price=1, e.g. "8.99 in USD"
      const rawPrice: string | undefined = typeof r.Price === "string" ? r.Price : undefined;
      let priceUsd: number | null = null;
      let priceDisplay: string | null = null;

      if (rawPrice) {
        const m = rawPrice.match(/([0-9]+(?:\.[0-9]+)?)/);
        if (m) {
          const base = parseFloat(m[1]);
          if (!Number.isNaN(base)) {
            const total = base * minYears; // adjust for multi-year minimums
            // round to cents to avoid FP artifacts
            priceUsd = Math.round((total + Number.EPSILON) * 100) / 100;
            // Spec: "$8.99" only (no "/yr")
            priceDisplay = formatUsd(priceUsd);
          }
        }
      }

      // Improved premium detection (updated logic)
      const lowerPrice = (rawPrice ?? "").toLowerCase();
      const isPremium = lowerPrice.includes("is a premium domain") &&
                        !lowerPrice.includes("is not a premium domain");

      return {
        domain: domainName,
        available: isAvailable,
        // New fields for UI
        priceUsd: priceUsd,                 // number | null
        price: priceDisplay,                // "$8.99" | null
        isPremium: isPremium,               // boolean
        // keep error semantics
        error: r.Status !== "success" ? r.Status : undefined,
      };
    });
  } finally {
    clearTimeout(t);
  }
}

/* Utility: split array into batches */
const chunk = <T,>(arr: T[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );

/* ------------------------------------------------------------------ */
/* POST /api/check-bulk-stream                                        */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  const body    = await req.json();
  const domains = (body.domains as string[]) ?? [];
  const rps     = Math.max(0.2, Number(body.rps) || DEFAULT_RPS);  // safety floor
  const intervalMs = Math.round(1000 / rps);

  /* stream back NDJSON */
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc    = new TextEncoder();

  (async () => {
    try {
      for (const batch of chunk(domains, BATCH_SIZE)) {
        try {
          const results = await callDynadot(batch);

          for (const r of results) {
            await writer.write(
              enc.encode(
                JSON.stringify({
                  domain:     r.domain,
                  available:  r.available,             // boolean
                  price:      r.price ?? null,         // "$8.99" or null
                  priceUsd:   r.priceUsd ?? null,      // number or null
                  premium:    r.isPremium ?? false,    // boolean
                  error:      r.error ?? null,
                }) + "\n"
              )
            );
          }
        } catch (err: any) {
          console.log("[Dynadot] BATCH ERROR:", err.message || err);

          // surface an error record for each domain in this batch
          for (const d of batch) {
            await writer.write(
              enc.encode(
                JSON.stringify({
                  domain:    d,
                  available: null,
                  price:     null,
                  priceUsd:  null,
                  premium:   false,
                  error:     err.message || String(err),
                }) + "\n"
              )
            );
          }
        }

        await sleep(intervalMs);
      }
    } catch (err: any) {
      console.log("[Dynadot] OUTER ERROR:", err.message || err);
    } finally {
      // tell the client we are finished
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
