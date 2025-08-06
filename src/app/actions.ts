// src/app/actions.ts
'use server'; // Essential for Next.js/React Server Components actions

import { XMLParser } from 'fast-xml-parser';

export interface DomainResult {
  domain: string;
  status: 'available' | 'unavailable' | 'error';
  price?: number;
}

export interface CheckDomainsResult {
  results: DomainResult[];
  error?: string;
}

async function checkDomainApi(domains: string[]): Promise<CheckDomainsResult> {
  console.log("=== DOMAIN CHECK START ===");
  console.log("Input domains:", domains);

  const dynadotApiKey = process.env.DYNADOT_KEY;

  console.log("DYNADOT_KEY Status (deployed):", dynadotApiKey ? "SET" : "NOT SET");
  console.log("API Key length:", dynadotApiKey ? dynadotApiKey.length : 0);

  if (!dynadotApiKey) {
    console.error("DYNADOT_KEY environment variable is not set.");
    return { results: [], error: "API key not configured. Please contact support." };
  }

  const params = new URLSearchParams();
  params.append('key', dynadotApiKey);
  params.append('command', 'search');
  domains.forEach((domain, index) => {
    params.append(`domain${index}`, domain);
  });

  const dynadotApiUrl = `https://api.dynadot.com/api3.xml?${params.toString()}`;

  try {
    const response = await fetch(dynadotApiUrl, { method: 'GET' });
    const xmlText = await response.text();

    if (!response.ok) {
      console.error(`Dynadot API HTTP Error: ${response.status}`, xmlText);
      return {
        results: [],
        error: `API returned an error: ${response.status}. See server logs for details.`
      };
    }

    // Parse Dynadot API v3 XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '', // we want plain keys like SuccessCode, DomainName, etc.
      trimValues: true
    });
    const parsed = parser.parse(xmlText);

    console.log('Full Dynadot API response:', JSON.stringify(parsed, null, 2));

    // Shape seen in logs:
    // <Results>
    //   <SearchResponse>
    //     <SearchHeader>
    //       <SuccessCode>0</SuccessCode>
    //       <DomainName>example.com</DomainName>
    //       <Status>success</Status>
    //       <Available>yes</Available>
    //       <Price>...</Price> (optional)
    //     </SearchHeader>
    //   </SearchResponse>
    //   ...
    // </Results>
    const sr = parsed?.Results?.SearchResponse;
    const items: any[] = Array.isArray(sr) ? sr : sr ? [sr] : [];

    if (items.length === 0) {
      return { results: [], error: 'Unexpected API response format from Dynadot.' };
    }

    const results: DomainResult[] = [];

    for (const entry of items) {
      const h = entry?.SearchHeader || entry;

      // Some safety: map alternative locations if Dynadot changes minor naming
      const successCode = Number(h?.SuccessCode ?? h?.ResponseCode ?? 0);

      if (Number.isFinite(successCode) && successCode !== 0) {
        const errMsg = h?.Error || h?.ResponseDescription || 'Unknown Dynadot error';
        console.error('Dynadot API Error:', errMsg, 'Full Response:', xmlText);
        return { results: [], error: `Dynadot API Error: ${errMsg}` };
      }

      const domainName: string | undefined = h?.DomainName;
      const availableText = String(h?.Available ?? '').toLowerCase();
      const isAvailable = availableText === 'yes' || availableText === 'true';
      const priceNum = h?.Price != null ? Number(h.Price) : undefined;

      if (domainName) {
        results.push({
          domain: domainName,
          status: isAvailable ? 'available' : 'unavailable',
          price: Number.isFinite(priceNum) ? priceNum : undefined,
        });
      } else {
        results.push({ domain: 'unknown', status: 'error' });
      }
    }

    return { results };
  } catch (error) {
    console.error("[checkDomainApi] An unexpected error occurred:", error);
    const errorMessage = error instanceof Error ? `API Error: ${error.message}` : "An unknown API error occurred. Please try again.";
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
// Force restart Wed Aug  6 03:46:51 PM UTC 2025
