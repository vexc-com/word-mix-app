"use client";

import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DomainResult } from "@/app/actions"; // shared type (must include `domain: string`)

interface Props {
  results: DomainResult[]; // list of available domains; each item has `domain: "foo.com"`
  onSelectionChange?: (selected: Set<string>) => void;
}

const ResultsTable: React.FC<Props> = ({ results, onSelectionChange }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (domain: string) => {
    const next = new Set(selected);
    next.has(domain) ? next.delete(domain) : next.add(domain);
    setSelected(next);
    onSelectionChange?.(next);
  };

  return (
    <ScrollArea className="h-96 border rounded-lg">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="sticky top-0 bg-background/70 backdrop-blur">
            <th className="w-4 p-2" />
            <th className="px-3 py-2 text-left font-medium">Domain</th>
            <th className="px-3 py-2 text-left font-medium">TLD</th>
            <th className="px-3 py-2 text-left font-medium">Len.</th>
          </tr>
        </thead>
        <tbody>
          {results.map((d) => {
            const domain = (d as any)?.domain ?? "";
            // Handle normal TLDs and multi‑label ones (.co.uk) safely
            const parts = domain.split(".");
            const namePart = parts[0] ?? "";
            const tldPart = parts.length > 1 ? parts.slice(1).join(".") : "";
            const nameLen = namePart.length;

            return (
              <tr key={domain} className="border-t hover:bg-muted/40">
                <td className="p-2">
                  <Checkbox
                    checked={selected.has(domain)}
                    onCheckedChange={() => toggle(domain)}
                  />
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