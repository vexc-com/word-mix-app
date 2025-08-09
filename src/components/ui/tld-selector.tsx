"use client";

import React, { useMemo, useState } from "react";
import { Check, Search, X, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FormDescription, FormLabel } from "@/components/ui/form";
import { normalizeTld, isLikelyValidTld, isKnownTld } from "@/lib/tlds";
// ── Safety wrappers: never throw; return conservative defaults
const safeIsLikelyValid = (v: string): boolean => {
  try { return isLikelyValidTld(v); } catch { return false; }
};
const safeIsKnown = (v: string): boolean => {
  try { return isKnownTld(v); } catch { return false; }
};
import { useTldPrefs } from "@/hooks/use-tld-prefs";

export interface TldSelectorProps {
  selected: string[];
  onChange: (next: string[]) => void;
  popular: string[];
  allKnown: string[];
}

const TldSelector: React.FC<TldSelectorProps> = ({
  selected,
  onChange,
  popular,
  allKnown,
}) => {
  const [open, setOpen] = useState(false);
  const [inputError, setInputError] = useState("");
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState("");
  // Removed pendingCorrection and pendingSuggestions state
  // Step 7A: cap selected TLDs at 50 and show inline message
  const MAX_TLDS = 50;
  const [capMessage, setCapMessage] = useState("");

  const { favoriteTlds, recentTlds, addFavorite, removeFavorite, touchRecent } = useTldPrefs();

  const secondary = useMemo(
    () => allKnown.filter((t) => !popular.includes(t)),
    [allKnown, popular]
  );

  const isChecked = (tld: string) => selected?.includes(tld);
  const favSelectedCount = favoriteTlds.filter((t) => isChecked(t)).length;
  const recentSelectedCount = recentTlds.filter((t) => isChecked(t)).length;

  // Helper to cap TLDs at MAX_TLDS and show message (defensive)
  const tryAddTld = (tld: string) => {
    try {
      const norm = typeof tld === "string" ? normalizeTld(tld) : "";
      if (!norm) return false;
      const current = Array.isArray(selected) ? selected : [];
      if (current.includes(norm)) return false;
      if (current.length >= MAX_TLDS) {
        setCapMessage(`You can select up to ${MAX_TLDS} extensions.`);
        return false;
      }
      const next = [...current, norm];
      onChange(next);
      setCapMessage("");
      return true;
    } catch {
      // swallow
      return false;
    }
  };

  const toggle = (tld: string, nextChecked: boolean | string) => {
    const checked = typeof nextChecked === "string" ? !isChecked(tld) : !!nextChecked;
    if (checked) {
      if (!isChecked(tld)) {
        if (tryAddTld(tld)) {
          try { touchRecent(tld); } catch {}
        }
      }
    } else {
      onChange((selected || []).filter((v) => v !== tld));
    }
  };

  // Removed allPopularSelected and somePopularSelected as no longer needed

  // Selection counter color logic
  const count = selected?.length ?? 0;
  let counterColor = "text-muted-foreground";
  if (count >= 40 && count < MAX_TLDS) {
    counterColor = "text-amber-600 dark:text-amber-400";
  } else if (count === MAX_TLDS) {
    counterColor = "text-red-600 dark:text-red-400";
  }

  return (
    <section aria-label="Top-level domain selector">
      <div className="mb-4">
        <FormLabel className="text-lg font-medium tracking-tight text-foreground">
          Choose TLDs to check
          <span className="ml-2 text-sm font-medium text-muted-foreground">({selected?.length ?? 0} selected)</span>
        </FormLabel>
        <FormDescription className="text-sm font-normal text-muted-foreground/90">Type or select up to 50 extensions.</FormDescription>
      </div>

      {/* Toolbar Row: Search, Custom, Counter+CTA cluster */}
      <div className="grid grid-cols-12 items-center gap-x-2 mb-3 sm:grid-cols-[3fr_2fr_auto_auto]">
        {/* Search TLDs (known list + customs via Enter) */}
        <div className="col-span-12 sm:col-span-1">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                type="button"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between h-10"
              >
                Search TLDs...
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0">
              <div className="p-2 border-b border-muted/30">
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setInputError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    e.stopPropagation();
                    const val = normalizeTld(query);
                    if (!val) return;
                    if (!safeIsLikelyValid(val)) {
                      setInputError("That doesn’t look like a valid extension.");
                      return;
                    }
                    // Only add on Enter if NOT a known TLD (custom extension flow)
                    if (safeIsKnown(val)) return;
                    if (!selected?.includes(val)) {
                      if (tryAddTld(val)) {
                        try { touchRecent(val); } catch {}
                      }
                    }
                    setQuery("");
                    setOpen(false);
                  }}
                  placeholder="Search known TLDs or type a custom one..."
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Command>
                <CommandList>
                  <CommandEmpty className="p-2 text-sm text-muted-foreground">No TLDs match.</CommandEmpty>
                  <CommandGroup>
                    {secondary
                      .filter((t) => {
                        const q = query.trim().toLowerCase();
                        if (!q) return true;
                        const qDot = q.startsWith(".") ? q : `.${q}`;
                        return t.includes(qDot) || t.includes(q);
                      })
                      .map((tld) => (
                        <CommandItem
                          key={tld}
                          value={tld}
                          onSelect={(v) => {
                            if (typeof v === "string" && !isChecked(v)) {
                              if (tryAddTld(v)) {
                                try { touchRecent(v); } catch {}
                              }
                            }
                            setQuery("");
                            setOpen(false);
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${isChecked(tld) ? "opacity-100" : "opacity-0"}`} />
                          {tld}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Add custom TLD */}
        <div className="col-span-12 sm:col-span-1">
          <input
            type="text"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              setInputError("");
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              e.stopPropagation();
              const val = normalizeTld(custom);
              if (!val) return;
              if (!safeIsLikelyValid(val)) {
                setInputError("That doesn’t look like a valid extension.");
                return;
              }
              if (!selected?.includes(val)) {
                if (tryAddTld(val)) {
                  try { touchRecent(val); } catch {}
                }
              }
              setCustom("");
            }}
            placeholder="Add custom TLD…"
            aria-label="Add custom TLD"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Counter + CTA cluster */}
        <div className="col-span-12 sm:col-span-2 h-10 flex items-center justify-end gap-2">
          <div className="h-10 flex items-center text-right whitespace-nowrap">
            <span className="text-sm font-medium text-foreground/80">{selected?.length ?? 0}</span>
            {" / "}
            <span className="text-sm font-normal text-foreground/80">{MAX_TLDS}</span>
          </div>
          <Button type="button" className="min-w-[148px] h-10 font-semibold">
            ✨ Find My Domains
          </Button>
        </div>
      </div>

      {/* Inline messages under toolbar */}
      {(capMessage || inputError) && (
        <div className="mt-1 flex flex-col gap-1">
          {capMessage && (
            <p className="text-xs text-muted-foreground" aria-live="polite">{capMessage}</p>
          )}
          {inputError && (
            <p className="text-xs font-medium text-destructive" aria-live="polite">{inputError}</p>
          )}
        </div>
      )}

      {/* Favorites row */}
      {favoriteTlds.length > 0 && (
        <>
          <div className="mb-3">
            <div className="text-xs font-semibold tracking-wide text-muted-foreground mb-1">
              Favorites
              {favSelectedCount > 0 && (
                <span className="ml-2 text-[11px] font-medium text-muted-foreground">
                  ({favSelectedCount} selected)
                </span>
              )}
            </div>
            <div className="flex sm:flex-wrap flex-nowrap overflow-x-auto gap-2 whitespace-nowrap">
              {favoriteTlds.map((tld) => {
                const pressed = isChecked(tld);
                return (
                  <Button
                    key={tld}
                    variant={pressed ? "secondary" : "outline"}
                    size="sm"
                    type="button"
                    aria-pressed={pressed}
                    aria-label={`${pressed ? "Remove" : "Add"} ${tld} ${pressed ? "from" : "to"} selection`}
                    className="h-7 px-2"
                    onClick={() => {
                      if (pressed) {
                        onChange((selected || []).filter((v) => v !== tld));
                      } else {
                        if (tryAddTld(tld)) {
                          try { touchRecent(tld); } catch {}
                        }
                      }
                    }}
                  >
                    {tld}
                  </Button>
                );
              })}
            </div>
          </div>
          {/* Divider: Favorites → Recently Used */}
          <div className="border-t border-muted/30 my-3" />
        </>
      )}
      {/* Recently Used row */}
      {recentTlds.length > 0 && (
        <>
          <div className="mb-3">
            <div className="text-xs font-semibold tracking-wide text-muted-foreground mb-1">
              Recently Used
              {recentSelectedCount > 0 && (
                <span className="ml-2 text-[11px] font-medium text-muted-foreground">
                  ({recentSelectedCount} selected)
                </span>
              )}
            </div>
            <div className="flex sm:flex-wrap flex-nowrap overflow-x-auto gap-2 whitespace-nowrap">
              {recentTlds.map((tld) => {
                const pressed = isChecked(tld);
                return (
                  <Button
                    key={tld}
                    variant={pressed ? "secondary" : "outline"}
                    size="sm"
                    type="button"
                    aria-pressed={pressed}
                    aria-label={`${pressed ? "Remove" : "Add"} ${tld} ${pressed ? "from" : "to"} selection`}
                    className="h-7 px-2"
                    onClick={() => {
                      if (pressed) {
                        onChange((selected || []).filter((v) => v !== tld));
                      } else {
                        if (tryAddTld(tld)) {
                          try { touchRecent(tld); } catch {}
                        }
                      }
                    }}
                  >
                    {tld}
                  </Button>
                );
              })}
            </div>
          </div>
          {/* Divider: Recently Used → Popular */}
          <div className="border-t border-muted/30 my-3" />
        </>
      )}

      {/* Popular pills / checkboxes */}
      <div className="flex items-center gap-4 flex-wrap">
        {popular.map((tld) => (
          <div key={tld} className="flex flex-row items-center space-x-2 space-y-0">
            <Checkbox
              checked={isChecked(tld)}
              onCheckedChange={(c) => toggle(tld, c)}
              aria-label={`Toggle ${tld}`}
              className="border-primary/70"
            />
            <span className={`text-sm ${isChecked(tld) ? "font-semibold" : "font-medium"} text-foreground select-none`}>{tld}</span>
          </div>
        ))}
      </div>

      {/* Chips for selected TLDs */}
      <div className="mt-4 flex flex-wrap gap-2">
          {(selected ?? []).map((tld) => (
          <Badge key={tld} variant="secondary" className="pl-2 pr-1 flex items-center gap-1 font-semibold text-foreground">
              {tld}
              {/* Right-aligned controls */}
              <span className="ml-auto flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="h-5 w-5"
                  aria-label={favoriteTlds.includes(tld) ? `Remove ${tld} from favorites` : `Add ${tld} to favorites`}
                  onClick={() => {
                    if (favoriteTlds.includes(tld)) {
                      try { removeFavorite(tld); } catch {}
                    } else {
                      try { addFavorite(tld); } catch {}
                    }
                  }}
                  title={favoriteTlds.includes(tld) ? "Unheart" : "Heart"}
                >
                  <Heart className={`h-2.5 w-2.5 ${favoriteTlds.includes(tld) ? "text-primary fill-current" : "text-muted-foreground"}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="h-5 w-5 ml-1"
                  aria-label={`Remove ${tld}`}
                  onClick={() => onChange((selected || []).filter((v) => v !== tld))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </span>
            </Badge>
          ))}
        </div>

    </section>
  );
};

export default TldSelector;