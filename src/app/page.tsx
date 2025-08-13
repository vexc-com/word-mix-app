"use client";

import { zodResolver } from "@hookform/resolvers/zod";

import {
  Check,
  Copy,
  Download,
  Loader2,
  X,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { presetLists1, presetLists2 } from "@/lib/keywords";
import type { DomainResult } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import TiltCard from "@/components/ui/tilt-card";
import { useToast } from "@/hooks/use-toast";
import ResultsTable from "@/components/ui/ResultsTable";
import TldSelector from "@/components/ui/tld-selector";

/* ───────────────────────────────────────── */

const MAX_DOMAINS = 5000;

import { primaryTlds as popularTlds, allTlds as knownTlds } from "@/lib/tlds";

const formSchema = z.object({
  keywords1: z.string().min(1, {
    message: "Please provide at least one keyword.",
  }),
  keywords2: z.string().optional(),
  tlds: z.array(z.string()).min(1, {
    message: "Please select at least one TLD.",
  }),
});

/* ───────────────────────────────────────── */

export default function DomainSeekerPage() {
  /* ─────────── React Hooks (declare all at top, unconditional) ─────────── */
  const { toast } = useToast();

  // state
  const [availableDomains, setAvailableDomains] = useState<DomainResult[]>([]);
  const [unavailableDomains, setUnavailableDomains] = useState<DomainResult[]>(
    []
  );
  const [errors, setErrors] = useState<{ domain: string; error?: string }[]>(
    []
  );
  const [progress, setProgress] = useState(0);
  const [runTotal, setRunTotal] = useState(0);  // # of domains in this run
  const [runDone, setRunDone]   = useState(0);  // # processed in this run
  const [totalChecks, setTotalChecks] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchCancelled = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(
    new Set()
  );

  // refs to track counts
  const availableCountRef = useRef(0);
  const unavailableCountRef = useRef(0);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  // CTA sentinel for sticky footer
  const ctaSentinelRef = useRef<HTMLDivElement | null>(null);
  const [sentinelInView, setSentinelInView] = useState(true);
  const stickyVisible = isSearching || (runTotal > 0 && !sentinelInView);
  useEffect(() => {
    const el = ctaSentinelRef.current;
    if (!el) return;
    const io = new window.IntersectionObserver(([entry]) => {
      setSentinelInView(entry.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // react-hook-form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { keywords1: "", keywords2: "", tlds: [".com"] },
  });
  const formValues = form.watch();
  /* ─────────── End Hooks ─────────── */

  // helpers
  const splitKeywords = (kw: string) =>
    kw
      .split(/[\n,]/)
      .map((k) => k.trim())
      .filter(Boolean);

  // recompute totalChecks on form change
  useEffect(() => {
    const { keywords1, keywords2, tlds } = form.getValues();
    const a = splitKeywords(keywords1 || "");
    const b = splitKeywords(keywords2 || "");
    const hasAny = a.length > 0 || b.length > 0;
    const combos = hasAny ? Math.max(a.length, 1) * Math.max(b.length, 1) : 0;
    setTotalChecks(combos * (tlds?.length || 0));
  }, [formValues, form]);

  useEffect(() => {
    setProgress(runTotal ? Math.round((runDone / runTotal) * 100) : 0);
  }, [runDone, runTotal]);

  /* preset dropdown handler */
  const handlePresetChange = (
    value: string,
    list: "list1" | "list2",
    onChange: (v: string) => void
  ) => {
    if (!value) return;
    const presets = list === "list1" ? presetLists1 : presetLists2;
    const words = (presets as any)[value] || [];
    onChange(words.join(", "));
  };

  /* ─────────── onSubmit (streaming 2 domains/sec) ─────────── */
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (totalChecks > MAX_DOMAINS) {
      toast({
        variant: "destructive",
        title: "Job size too large",
        description: `Please reduce keywords or TLDs. Max ${MAX_DOMAINS} checks allowed.`,
      });
      return;
    }

    /* reset UI & refs */
    setIsSearching(true);
    setAvailableDomains([]);
    setUnavailableDomains([]);
    setErrors([]);
    setProgress(0);
    setError(null);
    // bring results into view
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    searchCancelled.current = false;
    availableCountRef.current = 0;
    unavailableCountRef.current = 0;

    /* build domain list (deduped) */
    const { keywords1, keywords2, tlds } = values;
    const list1 = splitKeywords(keywords1);
    const list2 = splitKeywords(keywords2 ?? "");
    const first = list1.length ? list1 : [""];
    const second = list2.length ? list2 : [""];

    const domainSet = new Set<string>();
    for (const a of first) {
      for (const b of second) {
        const base = (a + b).toLowerCase();
        if (!base) continue;
        for (const t of tlds) domainSet.add(base + t);
      }
    }
    const domains = Array.from(domainSet);
    setRunTotal(domains.length);
    setRunDone(0);
    setIsSearching(true);

    (async () => {
      try {
        const controller = new AbortController();
        controllerRef.current = controller;
        const res = await fetch("/api/check-bulk-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domains, rps: 1 }),
          signal: controller.signal,
        });
        if (!res.body) throw new Error("Stream unavailable");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done || searchCancelled.current) break;
          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line) continue;

            const msg: {
              domain?: string;
              available?: boolean;
              error?: string;
              event?: string;
              price?: string | null;
              priceUsd?: number | null;
              premium?: boolean;
            } = JSON.parse(line);

            // DONE event: read from refs
            if (msg.event === "done") {
              setRunDone(runTotal);
              setProgress(100);
              if (availableCountRef.current === 0) {
                toast({
                  title: "No matches found. Try again?",
                  description: "",
                });
              } else {
                toast({
                  title: "Search complete!",
                  description: `Found ${availableCountRef.current} available and ${unavailableCountRef.current} unavailable domains.`,
                });
              }
              setIsSearching(false);
              return;
            }

            if (msg.domain) {
  setRunDone((d) => d + 1);

  if (msg.available === true) {
    availableCountRef.current += 1;
    setAvailableDomains((prev) => [
      ...prev,
      {
        domain: msg.domain,
        status: "available",
        price: msg.price ?? null,
        priceUsd: msg.priceUsd ?? null,
        premium: msg.premium === true,
      } as DomainResult,
    ]);
  } else if (msg.available === false) {
    unavailableCountRef.current += 1;
    setUnavailableDomains((prev) => [
      ...prev,
      {
        domain: msg.domain,
        status: "unavailable",
        price: msg.price ?? null,
        priceUsd: msg.priceUsd ?? null,
        premium: msg.premium === true,
      } as DomainResult,
    ]);
  } else {
    setErrors((prev) => [
      ...prev,
      { domain: msg.domain ?? "?", error: msg.error },
    ]);
  }
}

        }
        }

      } catch (e) {
        const message =
          e instanceof Error ? e.message : "An unknown error occurred.";
        setError(message);
        toast({
          variant: "destructive",
          title: "Error",
          description: message,
        });
      } finally {
        if (!searchCancelled.current) setIsSearching(false);
      }
    })();
  }

  /* clipboard, CSV export, cancel */

  // Returns selected available domains (by row index), or all if none selected
  const getSelectedAvailable = () =>
    selectedDomains.size
      ? availableDomains.filter((_, i) => selectedDomains.has(String(i)))
      : availableDomains;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedDomain(text);
      toast({ title: "Copied to clipboard!", description: text });
      setTimeout(() => setCopiedDomain(null), 2000);
    });
  };

  // Copy only selected domains to clipboard (requires at least one selection)
  const copySelected = () => {
    if (!selectedDomains.size) {
      toast({
        variant: "destructive",
        title: "No selection",
        description: "Select at least one domain first.",
      });
      return;
    }
    const list = availableDomains.filter((_, i) =>
      selectedDomains.has(String(i))
    );
    const text = list.map((d) => d.domain).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied",
        description: `${list.length} domain${
          list.length === 1 ? "" : "s"
        } copied to clipboard.`,
      });
    });
  };

  /* export available → CSV (selected if any, otherwise all) */
  const exportToCsv = () => {
    const list = getSelectedAvailable();

    if (!list.length) {
      toast({
        variant: "destructive",
        title: "Nothing to export",
        description: selectedDomains.size
          ? "No selected available domains to export."
          : "Run a search first, then export.",
      });
      return;
    }

    // prepend header
    const csvText = ["Domain", ...list.map((d) => d.domain)].join("\n");

    // encode UTF-8, normalize line endings
    const blob = new Blob([csvText.replace(/\n/g, "\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);

    a.href = url;
    a.download = `wordmix-available-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({
      title: "CSV exported",
      description: `${list.length} ${
        selectedDomains.size ? "selected " : ""
      }domains saved with header row.`,
    });
  };

  /* export available → TXT (selected if any, otherwise all) */
  const exportToTxt = () => {
    const list = getSelectedAvailable();
    if (!list.length) {
      toast({
        variant: "destructive",
        title: "Nothing to export",
        description: "Run a search first, then export.",
      });
      return;
    }

    const txt = list.map((d) => d.domain).join("\n");
    const blob = new Blob([txt.replace(/\n/g, "\r\n")], {
      type: "text/plain;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `wordmix-available-${stamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({
      title: "TXT exported",
      description: `${list.length} domain${
        list.length === 1 ? "" : "s"
      } saved.`,
    });
  };

  const handleCancelSearch = () => {
    searchCancelled.current = true;
    try { controllerRef.current?.abort(); } catch {}
    controllerRef.current = null;
    setIsSearching(false);
    setRunTotal(0);
    setRunDone(0);
    setProgress(0);
  };

  /* ─────────── UI rendering ─────────── */
  return (
    <main className={"container mx-auto max-w-4xl px-4 py-16 md:py-24 " + (stickyVisible ? "pb-36 sm:pb-28" : "pb-8")}>
      {/* header */}
      <div className="bg-gradient-to-b from-purple-50 to-white dark:from-slate-900/40 dark:to-slate-950 pt-8 pb-6 text-center animate-fade-in-down">
        <h1 className="text-5xl md:text-6xl lg:text-7xl leading-tight font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-pink-500 text-transparent bg-clip-text">
          Word Mix
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground">
          Mix words. Find names. Launch faster. 🚀
        </p>
      </div>

      {/* form */}
      <div
        className="mt-12 animate-fade-in-up"
        style={{ animationDelay: "0.2s" }}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* keyword lists */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* list 1 */}
              <FormField
                control={form.control}
                name="keywords1"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center mb-2">
                      <FormLabel>Prefix Keywords</FormLabel>
                      <select
                        className="w-[180px] h-9 border rounded-md px-2 bg-background"
                        defaultValue=""
                        onChange={(e) =>
                          handlePresetChange(
                            e.target.value,
                            "list1",
                            field.onChange
                          )
                        }
                      >
                        <option value="" disabled>
                          Load a preset...
                        </option>
                        {Object.keys(presetLists1).map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Words that will go at the start (e.g., cloud, data, web)."
                        {...field}
                        rows={5}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* list 2 */}
              <FormField
                control={form.control}
                name="keywords2"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center mb-2">
                      <FormLabel>Suffix Keywords (Optional)</FormLabel>
                      <select
                        className="w-[180px] h-9 border rounded-md px-2 bg-background"
                        defaultValue=""
                        onChange={(e) =>
                          handlePresetChange(
                            e.target.value,
                            "list2",
                            field.onChange
                          )
                        }
                      >
                        <option value="" disabled>
                          Load a preset...
                        </option>
                        {Object.keys(presetLists2).map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Words that will go at the end (e.g., base, stack, flow)."
                        {...field}
                        rows={5}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* TLDs (refactored) */}
            <FormField
              control={form.control}
              name="tlds"
              render={({ field }) => (
                <>
                  <a
                    href="#tld-grid"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-primary text-primary-foreground px-3 py-2 rounded-md shadow"
                  >
                    Skip to TLD list
                  </a>
                  <section aria-labelledby="tld-heading">
                    <FormItem>
                      <h3 id="tld-heading" className="sr-only">
                        Choose TLDs to check
                      </h3>
                      <TldSelector
                        selected={field.value || []}
                        onChange={field.onChange}
                        popular={popularTlds}
                        allKnown={knownTlds}
                      />
                      <FormMessage />

                      {/* Inline CTA appears before scrolling past TLDs */}
                      {totalChecks > 0 && sentinelInView && !isSearching && (
                        <div className="mt-4 flex justify-end">
                          <Button type="submit" className="btn-gradient">
                            ✨ Find My Domains ({totalChecks})
                          </Button>
                        </div>
                      )}
                    </FormItem>
                    {/* end of TLD section */}
                    <div
                      ref={ctaSentinelRef}
                      aria-hidden="true"
                      className={stickyVisible ? "h-28" : "h-2"}
                    />
                  </section>
                </>
              )}
            />
            {totalChecks === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                Add at least one keyword to enable search.
              </p>
            )}

{/* sticky footer CTA */}
{stickyVisible ? (
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
    className="fixed left-1/2 -translate-x-1/2 bottom-4 sm:bottom-6 z-50 px-2"
  >
    <div
      className="w-fit rounded-2xl border bg-card/95 backdrop-blur p-2 shadow-lg"
      style={{ maxWidth: "min(480px, calc(100vw - 1.5rem))" }}
    >
      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
        <Button type="button" disabled className="btn-gradient h-9 px-4">Checking…</Button>
        <Button type="button" variant="outline" className="h-9 px-4" onClick={handleCancelSearch}>Cancel</Button>
        <span className="ml-2 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
          {runDone}/{runTotal || 0}
        </span>
      </div>
      <Progress
        value={runTotal ? Math.round((runDone / runTotal) * 100) : 0}
        className="h-1 mt-1"
      />
    </div>
  </div>
) : null}

            </form>
          </Form>
        </div>

        {/* done message */}
      {!isSearching && progress === 100 && (
        <div
          className="text-center mt-12 animate-fade-in-up"
          style={{ animationDelay: "0.4s" }}
        >
          <p className="text-muted-foreground">
            {`Search complete — ${availableDomains.length} available.`}
          </p>
          {availableDomains.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              💡 Tip: Add synonyms or swap word order.
            </p>
          )}
        </div>
      )}

      {/* results */}
      <div
        ref={resultsRef}
        className="mt-12 grid md:grid-cols-2 gap-8 animate-fade-in-up"
        style={{ animationDelay: "0.5s" }}
      >
        {/* available */}
        <TiltCard glowColor="#EC4899">
          <Card className="shadow-lg bg-off-white border-gray-200/50 w-full h-full">
            {/* header with CSV export */}
            <CardHeader className="flex items-center justify-between border-b border-muted/30 pb-2 mb-2">
              <CardTitle className="flex items-center text-sm font-semibold text-primary">
                <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500">
                  <Check className="h-3 w-3 text-white" />
                </div>
                Available ({availableDomains.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copySelected}
                  disabled={availableDomains.length === 0 || selectedDomains.size === 0}
                  title={
                    availableDomains.length === 0
                      ? "No results to copy"
                      : selectedDomains.size
                      ? `Copy ${selectedDomains.size} selected`
                      : "Select rows to enable"
                  }
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy ({selectedDomains.size})
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToTxt}
                  disabled={availableDomains.length === 0 || selectedDomains.size === 0}
                  title={
                    availableDomains.length === 0
                      ? "No results to export"
                      : selectedDomains.size
                      ? `Export ${selectedDomains.size} selected as .txt`
                      : "Export selected as .txt"
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  TXT ({selectedDomains.size})
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCsv}
                  disabled={availableDomains.length === 0 || selectedDomains.size === 0}
                  title={
                    availableDomains.length === 0
                      ? "No results to export"
                      : selectedDomains.size
                      ? `Export ${selectedDomains.size} selected as .csv`
                      : "Export selected as .csv"
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV ({selectedDomains.size})
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {availableDomains.length ? (
                <ResultsTable
                  results={availableDomains}
                  selected={selectedDomains}
                  onSelectionChange={setSelectedDomains}
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-10">
                  {isSearching
                    ? "Searching for available domains..."
                    : "Start your search to see which domains are free to register."}
                </p>
              )}
            </CardContent>
          </Card>
        </TiltCard>

        {/* unavailable */}
        <TiltCard glowColor="#d1d5db">
          <Card className="shadow-lg bg-off-white border-gray-200/50 w-full h-full">
            <CardHeader>
              <CardTitle className="flex items-center text-muted-foreground">
                <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-300">
                  <X className="h-3 w-3 text-white" />
                </div>
                Unavailable ({unavailableDomains.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unavailableDomains.length ? (
                <ScrollArea className="h-96">
                  <ul className="space-y-2 pr-4">
                    {unavailableDomains.map((d) => (
                      <li
                        key={d.domain}
                        className="flex justify-between items-center p-3 rounded-md"
                      >
                        <span className="font-mono text-muted-foreground line-through">
                          {d.domain}
                        </span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-10">
                  {isSearching
                    ? "Checking domains..."
                    : "We’ll list taken domains here once you check availability."}
                </p>
              )}
            </CardContent>
          </Card>
        </TiltCard>
      </div>
    </main>
  );
}
