// src/app/actions.ts
'use server';

export interface DomainResult {
  domain: string;
  status: 'available' | 'unavailable' | 'error';
  price?: string | null;     // "$8.99"
  priceUsd?: number | null;  // 8.99
  premium?: boolean;         // true if premium
}

export interface CheckDomainsResult {
  results: DomainResult[];
  error?: string;
}

async function checkDomainApi(domains: string[]): Promise<CheckDomainsResult> {
  console.log("=== DOMAIN CHECK START ===");
  console.log("Input domains:", domains);

  const dynadotApiKey = process.env.DYNADOT_KEY;
  if (!dynadotApiKey) {
    return { results: [], error: "API key not configured. Please contact support." };
  }

  // multi-year minimums for some TLDs
  const MIN_YEARS: Record<string, number> = { ai: 2 };

  const params = new URLSearchParams();
  params.append('key', dynadotApiKey);
  params.append('command', 'search');
  params.append('show_price', '1');
  params.append('currency', 'USD');
  domains.forEach((domain, index) => {
    params.append(`domain${index}`, domain);
  });

  const dynadotApiUrl = `https://api.dynadot.com/api3.json?${params.toString()}`;

  try {
    const response = await fetch(dynadotApiUrl, { method: 'GET' });
    const json = await response.json();

    if (!response.ok) {
      return { results: [], error: `API returned an error: ${response.status}` };
    }

    const rawList: any[] = json?.SearchResponse?.SearchResults ?? [];
    const results: DomainResult[] = rawList.map((r: any) => {
      const domainName = String(r.DomainName ?? r.Domain ?? "").toLowerCase();
      const available = String(r.Available ?? "").toLowerCase().startsWith("y");

      const tld = domainName.split(".").pop() ?? "";
      const minYears = MIN_YEARS[tld] ?? 1;

      const rawPrice = typeof r.Price === "string" ? r.Price : "";
      const priceMatch = rawPrice.match(/([0-9]+(?:\.[0-9]+)?)/);
      const basePrice = priceMatch ? parseFloat(priceMatch[1]) : null;
      const totalPrice = basePrice != null ? basePrice * minYears : null;
      const priceDisplay = totalPrice != null
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalPrice)
        : null;

      const lowerPrice = (rawPrice ?? "").toLowerCase();
      const isPremium = lowerPrice.includes("is a premium domain") &&
                        !lowerPrice.includes("is not a premium domain");

      return {
        domain: domainName,
        status: available ? "available" : "unavailable",
        price: priceDisplay,
        priceUsd: totalPrice,
        premium: isPremium,
      };
    });

    return { results };
  } catch (error) {
    const errorMessage = error instanceof Error ? `API Error: ${error.message}` : "Unknown API error";
    return { results: [], error: errorMessage };
  }
}

export async function checkDomains(values: { keywords1: string; keywords2?: string; tlds: string[] }): Promise<CheckDomainsResult> {
  const { keywords1, keywords2, tlds } = values;

  const list1 = keywords1.split(/[\n,]/).map(k => k.trim()).filter(Boolean);
  const list2 = (keywords2 || "").split(/[\n,]/).map(k => k.trim()).filter(Boolean);

  const domainsToCheck: string[] = [];
  const firstSet = list1.length > 0 ? list1 : [""];
  const secondSet = list2.length > 0 ? list2 : [""];

  for (const part1 of firstSet) {
    for (const part2 of secondSet) {
      const base = (part1 + part2).toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (base) {
        for (const tld of tlds) {
          domainsToCheck.push(`${base}${tld}`);
        }
      }
    }
  }

  if (domainsToCheck.length === 0) {
    return { results: [] };
  }

  const result = await checkDomainApi(domainsToCheck);
  console.log("Result from checkDomainApi before returning to client:", JSON.stringify(result, null, 2));
  return result;
}
