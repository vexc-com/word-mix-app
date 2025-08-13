"use client";

import React, { useMemo, useState } from "react";
import { Check, Search, X, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// removed Checkbox import

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
  try {
    return isLikelyValidTld(v);
  } catch {
    return false;
  }
};
const safeIsKnown = (v: string): boolean => {
  try {
    return isKnownTld(v);
  } catch {
    return false;
  }
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

  const { favoriteTlds, recentTlds, addFavorite, removeFavorite, touchRecent } =
    useTldPrefs();

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
    const checked =
      typeof nextChecked === "string" ? !isChecked(tld) : !!nextChecked;
    if (checked) {
      if (!isChecked(tld)) {
        if (tryAddTld(tld)) {
          try {
            touchRecent(tld);
          } catch {}
        }
      }
    } else {
      onChange((selected || []).filter((v) => v !== tld));
    }
  };

  // Removed allPopularSelected and somePopularSelected as no longer needed

  // Selection counter color logic
  const count = selected?.length ?? 0;
  const selectedCount = count;
  let counterColor = "text-muted-foreground";
  if (count >= 40 && count < MAX_TLDS) {
    counterColor = "text-amber-600 dark:text-amber-400";
  } else if (count === MAX_TLDS) {
    counterColor = "text-red-600 dark:text-red-400";
  }

  return (
    <section aria-label="Top-level domain selector">
      <div>
        <FormLabel className="mb-1 block text-lg font-medium tracking-tight text-foreground">
          Choose TLDs to check
          <span className="ml-2 text-sm font-medium text-muted-foreground">
            ({selected?.length ?? 0} selected)
          </span>
        </FormLabel>
        <FormDescription className="mt-0 mb-2 text-sm font-normal text-muted-foreground">
          Type or select up to 50 extensions.
        </FormDescription>
      </div>

      {/* Toolbar Row: Search, Custom, Counter+CTA cluster */}
      <div
        role="toolbar"
        aria-label="TLD tools"
        className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2 sm:mb-2.5"
      >
        {/* Search (Popover Combobox) */}
        <div className="flex-1 min-w-[220px] sm:min-w-[260px]">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                type="button"
                role="combobox"
                aria-expanded={open}
                aria-label="Search TLDs"
                className="w-full justify-between h-10 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
                      setInputError(
                        "That doesn’t look like a valid extension."
                      );
                      return;
                    }
                    // Only add on Enter if NOT a known TLD (custom extension flow)
                    if (safeIsKnown(val)) return;
                    if (!selected?.includes(val)) {
                      if (tryAddTld(val)) {
                        try {
                          touchRecent(val);
                        } catch {}
                      }
                    }
                    setQuery("");
                    setOpen(false);
                  }}
                  placeholder="Search known TLDs or type a custom one..."
                  aria-label="Search known TLDs or type a custom one"
                  aria-controls="tld-grid"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2 focus:ring-offset-background"
                />
              </div>
              <Command>
                <CommandList>
                  <CommandEmpty className="p-2 text-sm text-muted-foreground">
                    No TLDs match.
                  </CommandEmpty>
                  <CommandGroup>
                    {allKnown
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
                              if (tryAddTld(v)) { try { touchRecent(v); } catch {} }
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
        <div className="flex-1 min-w-[220px] sm:min-w-[260px]">
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
                  try {
                    touchRecent(val);
                  } catch {}
                }
              }
              setCustom("");
            }}
            placeholder="Add custom TLD…"
            aria-label="Add custom TLD"
            aria-describedby="tld-live"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2 focus:ring-offset-background"
          />
        </div>

        {/* Counter */}
        <span className="shrink-0 tabular-nums text-sm text-muted-foreground">
          {selected?.length ?? 0}/{MAX_TLDS}
          <span className="sr-only" role="status" aria-live="polite">{`${
            selected?.length ?? 0
          } of ${MAX_TLDS} TLDs selected`}</span>
        </span>

        {/* toolbar CTA removed; sticky footer handles submit */}
      </div>

      {/* Screen‑reader helpers + live region */}
      <p id="tld-help" className="sr-only">
        Type to filter TLDs. Use Tab to move to the list and Space to toggle
        items.
      </p>
      <p id="tld-add-help" className="sr-only">
        Enter a TLD (like com or io) and press Enter to add.
      </p>
      <span id="tld-live" aria-live="polite" className="sr-only">
        {selectedCount} TLD{selectedCount === 1 ? "" : "s"} selected out of 50.
      </span>
      <a href="#tld-grid" className="sr-only focus:not-sr-only focus:underline">
        Skip to TLD list
      </a>

      {/* Inline messages under toolbar */}
      {(capMessage || inputError) && (
        <div className="mt-1 flex flex-col gap-1">
          {capMessage && (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {capMessage}
            </p>
          )}
          {inputError && (
            <p
              className="text-xs font-medium text-destructive"
              aria-live="polite"
            >
              {inputError}
            </p>
          )}
        </div>
      )}

      {(favoriteTlds.length > 0 || recentTlds.length > 0) && (
        <>
          {/* ───────────────── Final Combined Meta Row: Favorites + Recently Used ───────────────── */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap -mx-1 px-1">
            {/* Favorites */}
            <div className="flex items-center gap-x-2 shrink-0">
              <span className="shrink-0 mr-1.5">Favorites:</span>
              {(favoriteTlds ?? []).map((tld: string) => {
                const pressed = isChecked(tld);
                return (
                  <span
                    key={`fav-${tld}`}
                    className="inline-block align-middle"
                  >
                    <Button
                      variant={pressed ? "secondary" : "outline"}
                      size="sm"
                      type="button"
                      aria-pressed={pressed}
                      aria-label={`${pressed ? "Remove" : "Add"} ${tld} ${
                        pressed ? "from" : "to"
                      } selection`}
                      className="h-7 px-2 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      onClick={() => {
                        if (pressed) {
                          onChange((selected || []).filter((v) => v !== tld));
                        } else {
                          if (tryAddTld(tld)) {
                            try {
                              touchRecent(tld);
                            } catch {}
                          }
                        }
                      }}
                    >
                      {tld}
                    </Button>
                  </span>
                );
              })}
            </div>
            {/* Recently used */}
            <div className="flex items-center gap-x-2 shrink-0">
              <span className="shrink-0 mr-1.5">Recently used:</span>
              {(recentTlds ?? []).map((tld: string) => {
                const pressed = isChecked(tld);
                return (
                  <span
                    key={`rec-${tld}`}
                    className="inline-block align-middle"
                  >
                    <Button
                      variant={pressed ? "secondary" : "outline"}
                      size="sm"
                      type="button"
                      aria-pressed={pressed}
                      aria-label={`${pressed ? "Remove" : "Add"} ${tld} ${
                        pressed ? "from" : "to"
                      } selection`}
                      className="h-7 px-2 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      onClick={() => {
                        if (pressed) {
                          onChange((selected || []).filter((v) => v !== tld));
                        } else {
                          if (tryAddTld(tld)) {
                            try {
                              touchRecent(tld);
                            } catch {}
                          }
                        }
                      }}
                    >
                      {tld}
                    </Button>
                  </span>
                );
              })}
            </div>
          </div>
          {/* ───────────────── End Final Combined Meta Row ───────────────── */}
        </>
      )}
      {/* Divider: Recently Used → Popular */}

      {/* selectable tlds — auto‑fill grid */}
      <>
        <h4 id="tld-grid-label" className="sr-only">
          Available TLD options
        </h4>
        <div
          id="tld-grid"
          role="listbox"
          aria-labelledby="tld-grid-label"
          aria-multiselectable="true"
          className="
      grid
      grid-cols-[repeat(auto-fill,minmax(100px,1fr))]
      max-sm:grid-cols-[repeat(auto-fill,minmax(90px,1fr))]
      gap-2 sm:gap-2.5
      items-start
      mt-1 sm:mt-2
    "
        >
          {[...popular, ...secondary].map((tld) => (
            <div
              key={tld}
              role="option"
              aria-selected={isChecked(tld)}
              tabIndex={0}
              onClick={() => toggle(tld, !isChecked(tld))}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  toggle(tld, !isChecked(tld));
                }
              }}
              className={`min-w-0 min-h-[40px] flex items-center gap-2 h-7 px-2 rounded-md cursor-pointer select-none transition-colors transition-transform duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:bg-accent hover:text-accent-foreground ${
                isChecked(tld)
                  ? "font-semibold bg-accent text-accent-foreground"
                  : "font-medium"
              }`}
            >
              <span
                aria-hidden="true"
                tabIndex={-1}
                className={`h-4 w-4 shrink-0 rounded-sm border border-primary pointer-events-none flex items-center justify-center ${
                  isChecked(tld) ? "bg-primary text-primary-foreground" : ""
                }`}
              />
              <span
                title={tld}
                className={`truncate text-sm ${
                  isChecked(tld) ? "font-semibold" : "font-medium"
                } text-foreground select-none`}
              >
                {tld}
              </span>
            </div>
          ))}
        </div>
      </>

      {/* Chips for selected TLDs */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-2.5">
        {(selected ?? []).map((tld) => (
          <Badge
            key={tld}
            variant="secondary"
            className="pl-2 pr-1 flex items-center gap-1 font-semibold text-foreground"
          >
            {tld}
            {/* Right-aligned controls */}
            <span className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="h-5 w-5"
                aria-label={
                  favoriteTlds.includes(tld)
                    ? `Remove ${tld} from favorites`
                    : `Add ${tld} to favorites`
                }
                onClick={() => {
                  if (favoriteTlds.includes(tld)) {
                    try {
                      removeFavorite(tld);
                    } catch {}
                  } else {
                    try {
                      addFavorite(tld);
                    } catch {}
                  }
                }}
                title={favoriteTlds.includes(tld) ? "Unheart" : "Heart"}
              >
                <Heart
                  className={`h-2.5 w-2.5 ${
                    favoriteTlds.includes(tld)
                      ? "text-primary fill-current"
                      : "text-muted-foreground"
                  }`}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="h-5 w-5 ml-1"
                aria-label={`Remove ${tld}`}
                onClick={() =>
                  onChange((selected || []).filter((v) => v !== tld))
                }
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
