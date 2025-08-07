"use client";

import { zodResolver } from "@hookform/resolvers/zod";

import {
  Check,
  Copy,
  Download,
  Loader2,
  Search,
  Sparkles,
  X,
  MoreHorizontal,
  Trash2,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { presetLists1, presetLists2 } from "@/lib/keywords";
import type { DomainResult } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import TiltCard from "@/components/ui/tilt-card";
import { useToast } from "@/hooks/use-toast";
import ResultsTable from "@/components/ui/ResultsTable";



/* ───────────────────────────────────────── */

const MAX_DOMAINS = 5000;

const primaryTlds = [".com", ".net", ".org", ".io", ".ai", ".co"];
const allTlds = [
  ".com",
  ".net",
  ".org",
  ".io",
  ".ai",
  ".co",
  ".dev",
  ".app",
  ".xyz",
  ".tech",
  ".store",
  ".online",
  ".info",
  ".biz",
  ".mobi",
  ".me",
  ".tv",
  ".ws",
  ".cc",
  ".ca",
  ".us",
  ".uk",
  ".de",
  ".jp",
  ".fr",
  ".au",
  ".ru",
  ".ch",
  ".it",
  ".nl",
  ".se",
  ".no",
  ".es",
  ".mil",
  ".edu",
  ".gov",
  ".int",
  ".arpa",
];
const secondaryTlds = allTlds.filter((t) => !primaryTlds.includes(t));

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
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  /* state */
  const [availableDomains, setAvailableDomains] = useState<DomainResult[]>([]);
  const [unavailableDomains, setUnavailableDomains] = useState<DomainResult[]>(
    [],
  );
  const [errors, setErrors] = useState<
    { domain: string; error?: string }[]
  >([]);
  const [progress, setProgress] = useState(0);
  const [totalChecks, setTotalChecks] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);
  const [openTldPopover, setOpenTldPopover] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchCancelled = useRef(false);
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());


  // refs to track counts
  const availableCountRef = useRef(0);
  const unavailableCountRef = useRef(0);

  /* react-hook-form */
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { keywords1: "", keywords2: "", tlds: [".com"] },
  });
  const selectedTlds = form.watch("tlds");
  const formValues = form.watch();

  /* helpers */
  const splitKeywords = (kw: string) =>
    kw
      .split(/[\n,]/)
      .map((k) => k.trim())
      .filter(Boolean);

  /* recompute totalChecks on form change */
  useEffect(() => {
    const { keywords1, keywords2, tlds } = form.getValues();
    const a = splitKeywords(keywords1 || "") || [""];
    const b = splitKeywords(keywords2 || "") || [""];
    const combos = (a.length || 1) * (b.length || 1);
    setTotalChecks(combos * (tlds?.length || 0));
  }, [formValues, form]);

  /* preset dropdown handler */
  const handlePresetChange = (
    value: string,
    list: "list1" | "list2",
    onChange: (v: string) => void,
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
    searchCancelled.current = false;
    availableCountRef.current = 0;
    unavailableCountRef.current = 0;

    /* build domain list */
    const { keywords1, keywords2, tlds } = values;
    const list1 = splitKeywords(keywords1);
    const list2 = splitKeywords(keywords2 ?? "");
    const first = list1.length ? list1 : [""];
    const second = list2.length ? list2 : [""];

    const domains: string[] = [];
    for (const a of first) {
      for (const b of second) {
        const base = (a + b).toLowerCase();
        if (!base) continue;
        for (const t of tlds) domains.push(base + t);
      }
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/check-bulk-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domains, rps: 1 }),
        });
        if (!res.body) throw new Error("Stream unavailable");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let doneCnt = 0;

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
            } = JSON.parse(line);

            // DONE event: read from refs
            if (msg.event === "done") {
              setProgress(100);
              toast({
                title: "Search complete!",
                description: `Found ${availableCountRef.current} available and ${unavailableCountRef.current} unavailable domains.`,
              });
              setIsSearching(false);
              return;
            }

            if (msg.domain) {
              doneCnt += 1;
              setProgress(Math.round((doneCnt / domains.length) * 100));

              if (msg.available === true) {
                availableCountRef.current += 1;
                setAvailableDomains((prev) => [
                  ...prev,
                  { domain: msg.domain, status: "available" } as DomainResult,
                ]);
              } else if (msg.available === false) {
                unavailableCountRef.current += 1;
                setUnavailableDomains((prev) => [
                  ...prev,
                  { domain: msg.domain, status: "unavailable" } as DomainResult,
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
    });
  }

  /* clipboard, CSV export, cancel */
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedDomain(text);
      toast({ title: "Copied to clipboard!", description: text });
      setTimeout(() => setCopiedDomain(null), 2000);
    });
  };

  /* export available → CSV (now with header) */
  const exportToCsv = () => {
    if (!availableDomains.length) {
      toast({
        variant: "destructive",
        title: "No available domains",
        description: "Run a search first, then export.",
      });
      return;
    }

    // prepend header
    const csvText = ["Domain", ...availableDomains.map((d) => d.domain)].join("\n");

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
      description: `${availableDomains.length} domains saved with header row.`,
    });
  };


  const handleCancelSearch = () => {
    searchCancelled.current = true;
    setIsSearching(false);
    setProgress(0);
  };

  /* ─────────── UI rendering ─────────── */
  return (
    <main className="container mx-auto max-w-4xl px-4 py-16 md:py-24">
      {/* header */}
      <div className="text-center animate-fade-in-down">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl bg-gradient-to-r from-indigo-600 to-pink-500 text-transparent bg-clip-text">
          Word Mix
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
          Combine keyword lists to discover unique, available domain names
          instantly.
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
                      <FormLabel>Keyword List 1</FormLabel>
                      <Select
                        onValueChange={(v) =>
                          handlePresetChange(v, "list1", field.onChange)
                        }
                      >
                        <div className="relative group gradient-border rounded-md">
                          <SelectTrigger className="w-[180px] h-9 border-2 border-transparent">
                            <SelectValue placeholder="Load a preset..." />
                          </SelectTrigger>
                        </div>
                        <SelectContent>
                          {Object.keys(presetLists1).map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="cloud, data, web"
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
                      <FormLabel>Keyword List 2 (optional)</FormLabel>
                      <Select
                        onValueChange={(v) =>
                          handlePresetChange(v, "list2", field.onChange)
                        }
                      >
                        <div className="relative group gradient-border rounded-md">
                          <SelectTrigger className="w-[180px] h-9 border-2 border-transparent">
                            <SelectValue placeholder="Load a preset..." />
                          </SelectTrigger>
                        </div>
                        <SelectContent>
                          {Object.keys(presetLists2).map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="base, stack, flow"
                        {...field}
                        rows={5}
                      />
                    </FormControl>
                    <FormDescription>
                      Combine with List 1 to form names like “cloudbase”.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>

            {/* TLDs */}
            <FormField
              control={form.control}
              name="tlds"
              render={({ field }) => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Top-Level Domains (TLDs)</FormLabel>
                    <FormDescription>
                      Select which TLDs you want to check against.
                    </FormDescription>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    {primaryTlds.map((tld) => (
                      <FormItem
                        key={tld}
                        className="flex flex-row items-center space-x-2 space-y-0"
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(tld)}
                            onCheckedChange={(checked) => {
                              const newVal = checked
                                ? [...(field.value || []), tld]
                                : field.value?.filter((v) => v !== tld);
                              field.onChange(newVal);
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">{tld}</FormLabel>
                      </FormItem>
                    ))}
                    {/* dropdown */}
                    <Popover
                      open={openTldPopover}
                      onOpenChange={setOpenTldPopover}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openTldPopover}
                          className="w-[200px] justify-between"
                        >
                          Search more TLDs...
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0">
                        <Command>
                          <CommandInput placeholder="Search TLD..." />
                          <CommandEmpty>No TLD found.</CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              {secondaryTlds.map((tld) => (
                                <CommandItem
                                  key={tld}
                                  value={tld}
                                  onSelect={(v) => {
                                    const cur = form.getValues("tlds") || [];
                                    if (!cur.includes(v))
                                      form.setValue("tlds", [...cur, v]);
                                    setOpenTldPopover(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${selectedTlds.includes(tld)
                                        ? "opacity-100"
                                        : "opacity-0"
                                      }`}
                                  />
                                  {tld}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  {/* chips for extra tlds */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(selectedTlds ?? [])
                      .filter((t) => !primaryTlds.includes(t))
                      .map((tld) => (
                        <Badge
                          key={tld}
                          variant="secondary"
                          className="pl-2 pr-1"
                        >
                          {tld}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 ml-1"
                            onClick={() =>
                              field.onChange(
                                field.value?.filter((v) => v !== tld),
                              )
                            }
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* submit + cancel */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
              <div className="flex items-center gap-4">
                <Button
                  type="submit"
                  size="lg"
                  disabled={
                    isSearching || totalChecks > MAX_DOMAINS || totalChecks === 0
                  }
                  className="w-full sm:w-auto btn-gradient"
                >
                  {isSearching ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {isSearching ? "Checking..." : "Find Domains"}
                </Button>
                {isSearching && (
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    onClick={handleCancelSearch}
                    className="w-full sm:w-auto"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                )}
              </div>
              <div
                className={`text-sm ${totalChecks > MAX_DOMAINS
                    ? "text-red-500"
                    : "text-muted-foreground"
                  }`}
              >
                {totalChecks} / {MAX_DOMAINS} domains
              </div>
            </div>
          </form>
        </Form>
      </div>

      {/* progress bar / messages */}
      {isSearching && progress < 100 && (
        <div className="mt-12 px-2">
          <p className="text-sm text-center text-muted-foreground">
            Checking {totalChecks} domains. This may take a moment...
          </p>
          <Progress value={progress} className="mt-4" />
        </div>
      )}

      {/* done message */}
      {!isSearching && progress === 100 && (
        <div
          className="text-center mt-12 animate-fade-in-up"
          style={{ animationDelay: "0.4s" }}
        >
          <p className="text-muted-foreground">
            Search complete. Found {availableDomains.length} available domains.
          </p>
        </div>
      )}

      {/* results */}
      <div
        className="mt-12 grid md:grid-cols-2 gap-8 animate-fade-in-up"
        style={{ animationDelay: "0.5s" }}
      >
        {/* available */}
        <TiltCard glowColor="#EC4899">
          <Card className="shadow-lg bg-off-white border-gray-200/50 w-full h-full">
            {/* header with CSV export */}
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-primary flex items-center">
                <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500">
                  <Check className="h-3 w-3 text-white" />
                </div>
                Available ({availableDomains.length})
              </CardTitle>

              <Button
                variant="outline"
                size="sm"
                onClick={exportToCsv}
                disabled={!availableDomains.length}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </CardHeader>
            <CardContent>
              {availableDomains.length ? (
                <ResultsTable
                  results={availableDomains}
                  onSelectionChange={setSelectedDomains}
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-10">
                  {isSearching
                    ? "Searching for available domains..."
                    : "No available domains found."}
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
                    : "No unavailable domains found."}
                </p>
              )}
            </CardContent>
          </Card>
        </TiltCard>
      </div>
    </main>
  );
}
