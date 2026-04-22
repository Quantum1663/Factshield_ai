"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Database, Filter, History, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ArchiveItem = string | {
  source?: string;
  text?: string;
};

export default function ArchivePage() {
  const [archive, setArchive] = useState<ArchiveItem[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.get<ArchiveItem[]>("/archive").then((res) => setArchive(res.data)).catch(console.error);
  }, []);

  const filteredArchive = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return archive;
    return archive.filter((item) => {
      const source = typeof item === "string" ? "Memory" : item.source || "General";
      const text = typeof item === "string" ? item : item.text || "";
      return `${source} ${text}`.toLowerCase().includes(needle);
    });
  }, [archive, query]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="section-label">Evidence Archive</div>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Knowledge base</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Indexed source fragments and historical evidence used by retrieval and reasoning.
          </p>
        </div>
        <div className="surface depth-lift rounded-xl px-4 py-3">
          <div className="text-xs font-medium text-slate-500">Records</div>
          <div className="text-2xl font-semibold text-slate-950">{archive.length}</div>
        </div>
      </div>

      <section className="surface overflow-hidden rounded-xl">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 rounded-lg border-slate-200 bg-white pl-10"
              placeholder="Search evidence archive..."
            />
          </div>
          <Button variant="outline" className="h-10 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-white">
                <th className="px-5 py-3 section-label">Source</th>
                <th className="px-5 py-3 section-label">Evidence Text</th>
                <th className="px-5 py-3 section-label text-right">Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredArchive.length > 0 ? filteredArchive.map((item, i) => {
                const src = typeof item === "string" ? "Memory" : (item.source || "General");
                const txt = typeof item === "string" ? item : (item.text || "");
                return (
                  <tr key={i} className="bg-white transition-colors hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <History className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{src}</span>
                      </div>
                    </td>
                    <td className="max-w-3xl px-5 py-4">
                      <div className="line-clamp-2 text-sm leading-6 text-slate-600">{txt}</div>
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-xs text-slate-400">#{String(i + 1).padStart(4, "0")}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={3} className="px-5 py-24 text-center text-sm font-medium text-slate-500">
                    <div className="flex flex-col items-center gap-3">
                      <Database className="h-10 w-10 text-slate-300" />
                      No archive records match this search.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
