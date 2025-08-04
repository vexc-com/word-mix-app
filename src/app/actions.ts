"use server";

import { z } from "zod";

const MAX_DOMAINS = 5000;

export type DomainResult = {
  domain: string;
  status: "available" | "unavailable" | "error";
  price?: number;
};

const formSchema = z.object({
  keywords1: z.string(),
  keywords2: z.string().optional(),
  tlds: z.array(z.string()).min(1, { message: "Please select at least one TLD." }),
});

async function checkDomainApi(domain: string, apiKey: string): Promise<Omit<DomainResult, 'domain'>> {
  const url = `https://api.dynadot.com/api3.json?key=${apiKey}&command=search&domain=${domain}`;
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.SearchResponse.SearchResults[0].Available === "yes") {
        return { status: "available", price: 0 };
    } else {
        return { status: "unavailable" };
    }
  } catch (error) {
    console.error(`Error checking domain ${domain}:`, error);
    return { status: "error" };
  }
}

export async function* checkDomains(
  input: z.infer<typeof formSchema>
): AsyncGenerator<DomainResult & { progress: number }, void, unknown> {
  const apiKey = process.env.DYNADOT_API_KEY;

  if (!apiKey || apiKey === 'your_dynadot_api_key_here') {
    yield { domain: "API key not configured. Please add your Dynadot API key to the .env.local file.", status: "error", progress: 100 };
    return;
  }

  const validation = formSchema.safeParse(input);
  if (!validation.success) {
    yield { domain: "Invalid input", status: "error", progress: 100 };
    return;
  }

  const { keywords1, keywords2, tlds } = validation.data;

  const list1 = keywords1.split("\n").map(k => k.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')).filter(Boolean);
  const list2 = (keywords2 || "").split("\n").map(k => k.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')).filter(Boolean);

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
    yield { domain: `Error: Job size exceeds the limit of ${MAX_DOMAINS} domains.`, status: "error", progress: 100 };
    return;
  }
  
  if (domainsToCheck.length === 0) {
    yield { domain: "Error: No domains to check. Please provide some keywords.", status: "error", progress: 100 };
    return;
  }
  
  let checkedCount = 0;
  for (const domain of domainsToCheck) {
    try {
      const result = await checkDomainApi(domain, apiKey);
      checkedCount++;
      const progress = (checkedCount / domainsToCheck.length) * 100;
      yield { domain, ...result, progress };
    } catch (e) {
      checkedCount++;
      const progress = (checkedCount / domainsToCheck.length) * 100;
      yield { domain, status: "error", progress };
    }
  }
}
