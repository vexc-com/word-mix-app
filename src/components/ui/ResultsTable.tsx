"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DomainResult } from "@/app/actions"; // shared type (must include `domain: string`)

interface Props {
  results: DomainResult[]; // list of available domains; each item has `domain: "foo.com"`
  selected: Set<string>;   // controlled selection from parent
  onSelectionChange?: (selected: Set<string>) => void;
}

const ResultsTable: React.FC<Props> = ({ results, selected, onSelectionChange }) => {

  // Select‑all helpers (controlled by parent `selected`) — use row indices as IDs
  const allSelected = results.length > 0 && results.every((_, i) => selected.has(String(i)));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = (checked: boolean) => {
    const next = new Set<string>();
    if (checked) results.forEach((_, i) => next.add(String(i)));
    onSelectionChange?.(next);
  };

  const toggle = (rowId: string) => {
    const next = new Set(selected);
    next.has(rowId) ? next.delete(rowId) : next.add(rowId);
    onSelectionChange?.(next);
  };

  return (
    <TooltipProvider>
      <ScrollArea className="h-96 border rounded-lg z-0">
        <table className="min-w-full text-sm">
        <thead>
          <tr className="sticky top-0 bg-background/70 backdrop-blur">
            <th className="w-10 text-center">
              <div className="flex items-center justify-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Checkbox
                      className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      checked={someSelected ? "indeterminate" : allSelected}
                      onCheckedChange={(c) => toggleAll(Boolean(c))}
                      aria-label="Select or deselect all domains"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center" sideOffset={12} className="z-50">
                    Select/Deselect all
                  </TooltipContent>
                </Tooltip>
              </div>
            </th>
            <th className="px-4 py-2 text-left">
              <div className="flex items-center">
                <span className="font-medium">Domain</span>
              </div>
            </th>
            <th className="px-4 py-2 text-right font-medium tabular-nums">Len.</th>
          </tr>
        </thead>
        <tbody>
          {results.map((d, i) => {
            const domain = (d as any)?.domain ?? "";
            // Handle normal TLDs and multi‑label ones (.co.uk) safely
            const parts = domain.split(".");
            const namePart = parts[0] ?? "";
            const tldPart = parts.length > 1 ? parts.slice(1).join(".") : "";
            const nameLen = namePart.length;
            const rowId = String(i);

            return (
              <tr key={rowId} className="border-t odd:bg-muted/5 hover:bg-muted/10 transition-colors">
                <td className="w-10 text-center">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      checked={selected.has(rowId)}
                      onCheckedChange={() => toggle(rowId)}
                    />
                  </div>
                </td>
                <td className="px-4 py-2 font-mono">
                  <a
                    href={"https://" + domain}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:underline focus-visible:underline focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {domain}
                  </a>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{nameLen}</td>
              </tr>
            );
          })}

          {results.length === 0 && (
            <tr>
              <td
                colSpan={3}
                className="px-3 py-6 text-center text-sm text-muted-foreground"
              >
                No results yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </ScrollArea>
    </TooltipProvider>
  );
};

export default ResultsTable;