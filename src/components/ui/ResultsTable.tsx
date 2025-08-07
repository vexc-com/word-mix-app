import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";   // shadcn/ui
import { ScrollArea } from "@/components/ui/scroll-area";

export interface DomainResult {
  name: string;
  tld: string;
  length: number;
}

interface Props {
  results: DomainResult[];          // list of *available* domains
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
          {results.map((d) => (
            <tr key={d.name} className="border-t hover:bg-muted/40">
              <td className="p-2">
                <Checkbox
                  checked={selected.has(d.name)}
                  onCheckedChange={() => toggle(d.name)}
                />
              </td>
              <td className="px-3 py-2 font-mono">{d.name}</td>
              <td className="px-3 py-2">{d.tld}</td>
              <td className="px-3 py-2">{d.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
};

export default ResultsTable;
