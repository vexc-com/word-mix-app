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
  const dynadotApiKey = process.env.DYNADOT_KEY;

  if (!dynadotApiKey) {
    console.error("DYNADOT_KEY environment variable is not set.");
    return { 
      results: [],
      error: "API key not configured. Please contact support." 
    };
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

    const parser = new XMLParser({ ignoreAttributes: false });
    const parsedResult = parser.parse(xmlText);
    
    console.log('Full Dynadot API response:', JSON.stringify(parsedResult, null, 2));

    const searchResponses = parsedResult?.DynadotAPIResponse?.SearchResponse;
    const header = parsedResult?.DynadotAPIResponse?.ResponseHeader;

    if (header?.SuccessCode !== 0) {
      const errorMessage = header?.Error || 'Unknown API error from Dynadot.';
      console.error('Dynadot API Error:', errorMessage);
      return { results: [], error: `Dynadot API Error: ${errorMessage}` };
    }
    
    if (!searchResponses) {
        return { results: [], error: 'Unexpected API response format.' };
    }
    
    // Ensure searchResponses is an array
    const responsesArray = Array.isArray(searchResponses) ? searchResponses : [searchResponses];

    const results: DomainResult[] = responsesArray.map((res: any) => {
      const domainInfo = res?.DomainInfo;
      if (!domainInfo) {
        return { domain: 'unknown', status: 'error' };
      }
      const isAvailable = domainInfo.Available === 'yes';
      const price = parseFloat(domainInfo.Price);
      return {
        domain: domainInfo.DomainName,
        status: isAvailable ? 'available' : 'unavailable',
        price: isNaN(price) ? undefined : price,
      };
    });

    return { results };

  } catch (error) {
    console.error("[checkDomainApi] An unexpected error occurred:", error);
    let errorMessage = "An unknown API error occurred. Please try again.";
    if (error instanceof Error) {
      errorMessage = `API Error: ${error.message}`;
    }
    return { 
      results: [],
      error: errorMessage 
    };
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
  
  return await checkDomainApi(domainsToCheck);
}
