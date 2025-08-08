"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
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
    <ScrollArea className="h-96 border rounded-lg">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="sticky top-0 bg-background/70 backdrop-blur">
            <th className="w-10 p-2 text-center">
              <div className="flex justify-center">
                <Checkbox
                  checked={someSelected ? "indeterminate" : allSelected}
                  onCheckedChange={(c) => toggleAll(Boolean(c))}
                  aria-label={allSelected ? "Deselect all" : "Select all"}
                />
              </div>
            </th>
            <th className="px-3 py-2 text-left font-medium">Domain</th>
            <th className="px-3 py-2 text-left font-medium">TLD</th>
            <th className="px-3 py-2 text-left font-medium">Len.</th>
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
              <tr key={domain} className="border-t hover:bg-muted/40">
                <td className="p-2 text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={selected.has(rowId)}
                      onCheckedChange={() => toggle(rowId)}
                    />
                  </div>
                </td>
                <td className="px-3 py-2 font-mono">{namePart}</td>
                <td className="px-3 py-2">.{tldPart}</td>
                <td className="px-3 py-2">{nameLen}</td>
              </tr>
            );
          })}

          {results.length === 0 && (
            <tr>
              <td
                colSpan={4}
                className="px-3 py-6 text-center text-sm text-muted-foreground"
              >
                No results yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </ScrollArea>
  );
};

export default ResultsTable;