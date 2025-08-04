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

// This is a mock function that simulates calling an API like Dynadot.
async function checkDomainApi(domain: string): Promise<Omit<DomainResult, 'domain'>> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 100 + 50));
  
  // Simulate API response
  const isAvailable = Math.random() > 0.6; // ~40% available
  if (isAvailable) {
    const price = parseFloat((Math.random() * (49.99 - 9.99) + 9.99).toFixed(2));
    return { status: "available", price };
  } else {
    return { status: "unavailable" };
  }
}

export async function* checkDomains(
  input: z.infer<typeof formSchema>
): AsyncGenerator<DomainResult & { progress: number }, void, unknown> {
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
      const result = await checkDomainApi(domain);
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
