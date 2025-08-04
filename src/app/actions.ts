
"use server";

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

async function checkDomainApi(domain: string, apiKey: string): Promise<Omit<DomainResult, 'domain'>> {
  const url = `https://api.dynadot.com/api3.json?key=${apiKey}&command=search&domain=${domain}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
        console.error(`Error fetching from Dynadot API for ${domain}: ${response.statusText}`);
        return { status: "error" };
    }
    
    const data = await response.json();

    console.log('Full Dynadot API response:', data);

    if (data.SearchResponse?.ResponseCode !== 0) {
        return { status: "error" };
    }

    const searchResult = data.SearchResponse.SearchResults?.[0];
    if (searchResult?.Available === "yes") {
        // Dynadot API doesn't provide price in search, so we set to 0 as a placeholder
        return { status: "available", price: 0 };
    } else {
        return { status: "unavailable" };
    }
  } catch (error) {
    console.error(`Error checking domain ${domain}:`, error);
    return { status: "error" };
  }
}

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
  
  const results: DomainResult[] = [];
  // We can run checks in parallel to speed things up
  const allChecks = domainsToCheck.map(async (domain) => {
    try {
      const result = await checkDomainApi(domain, apiKey);
      return { domain, ...result };
    } catch (e) {
      return { domain, status: "error" as const };
    }
  });

  const settledResults = await Promise.all(allChecks);
  results.push(...settledResults);
  
  return { results, progress: 100 };
}
