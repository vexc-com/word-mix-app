
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { presetLists1, presetLists2 } from '@/lib/keywords';
import { Check, Copy, Loader2, Search, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { checkDomains, type DomainResult, type CheckDomainsResult } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import TiltCard from "@/components/ui/tilt-card";
import { useToast } from "@/hooks/use-toast";

const MAX_DOMAINS = 5000;

const primaryTlds = ['.com', '.net', '.org', '.io', '.ai', '.co'];
const allTlds = ['.com', '.net', '.org', '.io', '.ai', '.co', '.dev', '.app', '.xyz', '.tech', '.store', '.online', '.info', '.biz', '.mobi', '.me', '.tv', '.ws', '.cc', '.ca', '.us', '.uk', '.de', '.jp', '.fr', '.au', '.ru', '.ch', '.it', '.nl', '.se', '.no', '.es', '.mil', '.edu', '.gov', '.int', '.arpa'];
const secondaryTlds = allTlds.filter(tld => !primaryTlds.includes(tld));


const formSchema = z.object({
  keywords1: z.string().min(1, { message: "Please provide at least one keyword." }),
  keywords2: z.string().optional(),
  tlds: z.array(z.string()).min(1, { message: "Please select at least one TLD." }),
});


export default function DomainSeekerPage() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [availableDomains, setAvailableDomains] = useState<DomainResult[]>([]);
  const [unavailableDomains, setUnavailableDomains] = useState<DomainResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [totalChecks, setTotalChecks] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);
  const [openTldPopover, setOpenTldPopover] = useState(false);
  
  const searchCancelled = useRef(false);
  const [isSearching, setIsSearching] = useState(false);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      keywords1: "",
      keywords2: "",
      tlds: [".com"],
    },
  });
  
  const selectedTlds = form.watch('tlds');

  const handlePresetChange = (
    value: string,
    list: 'list1' | 'list2',
    onChange: (value: string) => void
  ) => {
    if (!value) return;
    const presets = list === 'list1' ? presetLists1 : presetLists2;
    const keywords = (presets as any)[value] || [];
    onChange(keywords.join(', '));
  };

  const formValues = form.watch();
  
  const splitKeywords = (keywords: string) => {
    return keywords.split(/[\n,]/).map(k => k.trim()).filter(Boolean);
  }

  useEffect(() => {
    const { keywords1, keywords2, tlds } = form.getValues();
    const list1 = splitKeywords(keywords1 || "");
    const list2 = splitKeywords(keywords2 || "");
    const selectedTlds = tlds || [];

    const firstSet = list1.length > 0 ? list1 : [""];
    const secondSet = list2.length > 0 ? list2 : [""];

    let combinations = 0;
    for (const part1 of firstSet) {
        for (const part2 of secondSet) {
            const base = (part1 + part2);
            if (base) {
                combinations++;
            }
        }
    }
    
    const count = combinations * selectedTlds.length;

    setTotalChecks(count);
  }, [formValues, form]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (totalChecks > MAX_DOMAINS) {
      toast({
        variant: "destructive",
        title: "Job size too large",
        description: `Please reduce keywords or TLDs. Max ${MAX_DOMAINS} checks allowed.`,
      });
      return;
    }

    setIsSearching(true);
    setAvailableDomains([]);
    setUnavailableDomains([]);
    setProgress(0);
    setError(null);
    setCopiedDomain(null);
    searchCancelled.current = false;

    startTransition(async () => {
      try {
        console.log("Calling checkDomains with values:", values);
        const result: CheckDomainsResult = await checkDomains(values);
        console.log("Received result from checkDomains:", result);

        if (searchCancelled.current) {
          toast({ title: "Search cancelled." });
          setIsSearching(false);
          return;
        }

        if (result.error) {
           setError(result.error);
           toast({ variant: "destructive", title: "Error", description: result.error });
        } else {
            const available = (result.results ?? []).filter(d => d.status === 'available');
            const unavailable = (result.results ?? []).filter(d => d.status !== 'available');
            setAvailableDomains(available);
            setUnavailableDomains(unavailable);
            toast({ title: "Search complete!", description: `Found ${available.length} available domains.` });
            setProgress(100);
        }

      } catch (e) {
        if (!searchCancelled.current) {
          const errorMsg = e instanceof Error ? e.message : "An unknown error occurred.";
          setError(errorMsg);
          toast({ variant: "destructive", title: "An Error Occurred", description: errorMsg });
        }
      } finally {
        if (!searchCancelled.current) {
          setIsSearching(false);
        }
      }
    });
  }
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        setCopiedDomain(text);
        toast({ title: "Copied to clipboard!", description: text });
        setTimeout(() => setCopiedDomain(null), 2000);
    });
  };

  const TldSearchableDropdown = () => (
      <Popover open={openTldPopover} onOpenChange={setOpenTldPopover}>
          <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={openTldPopover} className="w-[200px] justify-between">
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
                                  onSelect={(currentValue) => {
                                      const currentTlds = form.getValues("tlds") || [];
                                      if (!currentTlds.includes(currentValue)) {
                                          form.setValue("tlds", [...currentTlds, currentValue]);
                                      }
                                      setOpenTldPopover(false);
                                  }}
                              >
                                  <Check className={`mr-2 h-4 w-4 ${selectedTlds.includes(tld) ? "opacity-100" : "opacity-0"}`} />
                                  {tld}
                              </CommandItem>
                          ))}
                      </CommandGroup>
                  </CommandList>
              </Command>
          </PopoverContent>
      </Popover>
  );

  const handleCancelSearch = () => {
    searchCancelled.current = true;
    setIsSearching(false);
    setProgress(0);
  };
  
  return (
    <main className="container mx-auto max-w-4xl px-4 py-16 md:py-24">
      <div className="text-center animate-fade-in-down">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl bg-gradient-to-r from-indigo-600 to-pink-500 text-transparent bg-clip-text">
          Word Mix
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
          Combine keyword lists to discover unique, available domain names instantly.
        </p>
      </div>

      <div className="mt-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="keywords1"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center mb-2">
                        <FormLabel>Keyword List 1</FormLabel>
                        <Select onValueChange={(value) => handlePresetChange(value, 'list1', field.onChange)}>
                           <div className="relative group gradient-border rounded-md">
                                <SelectTrigger className="w-[180px] h-9 border-2 border-transparent">
                                    <SelectValue placeholder="Load a preset..." />
                                </SelectTrigger>
                            </div>
                            <SelectContent>
                                {Object.keys(presetLists1).map(name => (
                                    <SelectItem key={name} value={name}>{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <FormControl>
                      <Textarea placeholder="cloud, data, web" {...field} rows={5} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="keywords2"
                render={({ field }) => (
                  <FormItem>
                     <div className="flex justify-between items-center mb-2">
                        <FormLabel>Keyword List 2 (optional)</FormLabel>
                        <Select onValueChange={(value) => handlePresetChange(value, 'list2', field.onChange)}>
                           <div className="relative group gradient-border rounded-md">
                                <SelectTrigger className="w-[180px] h-9 border-2 border-transparent">
                                    <SelectValue placeholder="Load a preset..." />
                                </SelectTrigger>
                            </div>
                            <SelectContent>
                                {Object.keys(presetLists2).map(name => (
                                    <SelectItem key={name} value={name}>{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <FormControl>
                      <Textarea placeholder="base, stack, flow" {...field} rows={5} />
                    </FormControl>
                    <FormDescription>Combine with List 1 to form names like 'cloudbase'.</FormDescription>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tlds"
              render={({ field }) => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Top-Level Domains (TLDs)</FormLabel>
                    <FormDescription>Select which TLDs you want to check against.</FormDescription>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                      {primaryTlds.map((tld) => (
                          <FormItem key={tld} className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                  <Checkbox
                                      checked={field.value?.includes(tld)}
                                      onCheckedChange={(checked) => {
                                          const newValue = checked
                                              ? [...(field.value || []), tld]
                                              : field.value?.filter((value) => value !== tld);
                                          field.onChange(newValue);
                                      }}
                                  />
                              </FormControl>
                              <FormLabel className="font-normal">{tld}</FormLabel>
                          </FormItem>
                      ))}
                      <TldSearchableDropdown />
                  </div>
                   <div className="mt-4 flex flex-wrap gap-2">
                    {(selectedTlds ?? []).filter(tld => !primaryTlds.includes(tld)).map(tld => (
                      <Badge key={tld} variant="secondary" className="pl-2 pr-1">
                        {tld}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 ml-1"
                          onClick={() => field.onChange(field.value?.filter(v => v !== tld))}
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

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
              <div className="flex items-center gap-4">
                <Button type="submit" size="lg" disabled={isSearching || totalChecks > MAX_DOMAINS || totalChecks === 0} className="w-full sm:w-auto btn-gradient">
                  {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  {isSearching ? `Checking...` : "Seek Domains"}
                </Button>
                {isSearching && (
                  <Button type="button" size="lg" variant="outline" onClick={handleCancelSearch} className="w-full sm:w-auto">
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                )}
              </div>
              <div className={`text-sm ${totalChecks > MAX_DOMAINS ? 'text-red-500' : 'text-muted-foreground'}`}>
                {totalChecks} / {MAX_DOMAINS} domains
              </div>
            </div>
          </form>
        </Form>
      </div>

      {isSearching && progress < 100 && (
        <div className="mt-12 px-2">
          <p className="text-sm text-center text-muted-foreground">Checking {totalChecks} domains. This may take a moment...</p>
        </div>
      )}
      
      {!isSearching && progress === 100 && (
         <div className="text-center mt-12 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <p className="text-muted-foreground">Search complete. Found {availableDomains.length} available domains.</p>
        </div>
      )}


      <div className="mt-12 grid md:grid-cols-2 gap-8 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
        <TiltCard glowColor="#EC4899">
          <Card className="shadow-lg bg-off-white border-gray-200/50 w-full h-full">
            <CardHeader>
              <CardTitle className="text-primary flex items-center">
                <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500">
                    <Check className="h-3 w-3 text-white" />
                </div>
                Available ({availableDomains.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {availableDomains.length > 0 ? (
                 <ScrollArea className="h-96">
                    <ul className="space-y-2 pr-4">
                      {(availableDomains ?? []).map((d) => (
                        <li key={d.domain} className="flex justify-between items-center p-3 rounded-md hover:bg-secondary">
                          <span className="font-medium text-indigo-600">{d.domain}</span>
                          <div className="flex items-center gap-2">
                              {d.price !== undefined && (
                                <span className="text-sm text-foreground font-semibold">${d.price?.toFixed(2)}</span>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(d.domain)}>
                                 {copiedDomain === d.domain ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                              </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                </ScrollArea>
              ) : (
                  <p className="text-sm text-muted-foreground text-center py-10">
                      {isSearching ? "Searching for available domains..." : "No available domains found."}
                  </p>
              )}
            </CardContent>
          </Card>
        </TiltCard>
        
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
              {unavailableDomains.length > 0 ? (
                   <ScrollArea className="h-96">
                      <ul className="space-y-2 pr-4">
                          {(unavailableDomains ?? []).map((d) => (
                          <li key={d.domain} className="flex justify-between items-center p-3 rounded-md">
                              <span className="font-mono text-muted-foreground line-through">{d.domain}</span>
                          </li>
                          ))}
                      </ul>
                   </ScrollArea>
                   ) : (
                      <p className="text-sm text-muted-foreground text-center py-10">
                          {isSearching ? "Checking domains..." : "No unavailable domains found."}
                      </p>
                  )}
              </CardContent>
          </Card>
        </TiltCard>
      </div>
    </main>
  );
}
