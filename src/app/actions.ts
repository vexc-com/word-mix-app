
"use server";

import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

const MAX_DOMAINS = 5000;

export type DomainResult = {
  domain: string;
  status: "available" | "unavailable" | "error";
  price?: number;
};

// This type will be the return type of our server action
export type CheckDomainsResult = {
  results: DomainResult[];
  error?: string;
  progress: number;
}


const formSchema = z.object({
  keywords1: z.string(),
  keywords2: z.string().optional(),
  tlds: z.array(z.string()).min(1, { message: "Please select at least one TLD." }),
});

export async function checkDomains(
  input: z.infer<typeof formSchema>
): Promise<CheckDomainsResult> {
  const apiKey = process.env.DYNADOT_KEY;

  if (!apiKey || apiKey === 'your_dynadot_api_key_here') {
    return { results: [], error: "API key not configured. Please add your Dynadot API key to the .env.local file.", progress: 100 };
  }

  const validation = formSchema.safeParse(input);
  if (!validation.success) {
    return { results: [], error: "Invalid input.", progress: 100 };
  }

  const { keywords1, keywords2, tlds } = validation.data;
  
  const splitKeywords = (keywords: string) => {
    return keywords.split(/[\n,]/).map(k => k.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')).filter(Boolean);
  }

  const list1 = splitKeywords(keywords1);
  const list2 = splitKeywords(keywords2 || "");

  const firstSet = list1.length > 0 ? list1 : [""];
  const secondSet = list2.length > 0 ? list2 : [""];
  
  const combinations: string[] = [];
  for (const part1 of firstSet) {
    for (const part2 of secondSet) {
      const base = (part1 + part2);
      if (base) {
          combinations.push(base);
      }
    }
  }

  const domainsToCheck = combinations.flatMap(combo => tlds.map(tld => `${combo}${tld}`));

  if (domainsToCheck.length > MAX_DOMAINS) {
    return { results: [], error: `Error: Job size exceeds the limit of ${MAX_DOMAINS} domains.`, progress: 100 };
  }
  
  if (domainsToCheck.length === 0) {
    return { results: [], error: "Error: No domains to check. Please provide some keywords.", progress: 100 };
  }
  
  try {
    const params = new URLSearchParams();
    params.append('key', apiKey);
    params.append('command', 'search');
    domainsToCheck.forEach((domain, index) => {
        params.append(`domain${index}`, domain);
    });
    
    const response = await fetch(`https://api.dynadot.com/api3.xml`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
    });

    const xmlText = await response.text();
    const parser = new XMLParser();
    const data = parser.parse(xmlText);

    console.log('Full Dynadot API response:', data);
    
    const dynadotResponse = data.SearchResponse;

    if (dynadotResponse?.ResponseHeader?.SuccessCode !== 0) {
        const errorMessage = dynadotResponse?.ResponseHeader?.Error || 'Unknown API error occurred.';
        console.error('Dynadot API Error:', errorMessage);
        return { results: [], error: `API Error: ${errorMessage}`, progress: 100 };
    }

    const searchResults = dynadotResponse?.SearchResults?.SearchResult;
    const results: DomainResult[] = [];

    if (Array.isArray(searchResults)) {
        for (const result of searchResults) {
            results.push({
                domain: result.DomainName,
                status: result.Available === 'yes' ? 'available' : 'unavailable',
                price: result.Price ? parseFloat(result.Price) : 0,
            });
        }
    } else if (searchResults) { // Handle single result case
         results.push({
            domain: searchResults.DomainName,
            status: searchResults.Available === 'yes' ? 'available' : 'unavailable',
            price: searchResults.Price ? parseFloat(searchResults.Price) : 0,
        });
    }

    // Dynadot may not return results for invalid domains, so we need to map back
    const finalResults = domainsToCheck.map(domain => {
        const found = results.find(r => r.domain.toLowerCase() === domain.toLowerCase());
        if (found) {
            return found;
        }
        // If not found in results, it's likely invalid or was filtered by the API
        return { domain, status: "unavailable", price: 0 }; 
    });


    return { results: finalResults, progress: 100 };

  } catch (e) {
    console.error("Failed to check domains:", e);
    if (e instanceof Error) {
        return { results: [], error: e.message, progress: 100 };
    }
    return { results: [], error: 'An unknown error occurred during domain check.', progress: 100 };
  }
}
