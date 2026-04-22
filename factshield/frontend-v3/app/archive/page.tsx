"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Database, Search, Filter, History, Trash2, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ArchiveItem = string | {
  source?: string;
  text?: string;
};

export default function ArchivePage() {
  const [archive, setArchive] = useState<ArchiveItem[]>([]);

  useEffect(() => {
    api.get<ArchiveItem[]>('/archive').then((res) => setArchive(res.data)).catch(console.error);
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Evidence Archive</h1>
          <p className="text-slate-500 font-medium mt-1">Indexed historical evidence fragments and truth-verified metadata.</p>
        </div>
        <div className="flex gap-2 pb-1">
          <Button variant="outline" size="sm" className="rounded-xl gap-2 font-bold uppercase text-[10px] tracking-widest border-slate-200">
            <Download className="w-3.5 h-3.5" /> Export DB
          </Button>
          <Button variant="destructive" size="sm" className="rounded-xl gap-2 font-bold uppercase text-[10px] tracking-widest bg-red-500 hover:bg-red-600 border-none shadow-md shadow-red-100">
            <Trash2 className="w-3.5 h-3.5" /> Purge Memory
          </Button>
        </div>
      </div>

      <Card className="border-slate-200/60 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className="pl-10 h-10 rounded-xl border-slate-200 bg-white" placeholder="Search knowledge base..." />
          </div>
          <Button variant="outline" className="rounded-xl gap-2 h-10 border-slate-200 font-bold uppercase text-[10px] tracking-widest">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Filters
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/30 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type / Source</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Content Metadata</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {archive.length > 0 ? archive.map((item, i) => {
                const src = typeof item === 'string' ? 'Memory' : (item.source || 'General');
                const txt = typeof item === 'string' ? item : (item.text || '');
                return (
                  <tr key={i} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-white group-hover:text-indigo-600 transition-colors shadow-sm">
                          <History className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{src}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[13px] text-slate-500 font-medium line-clamp-1 max-w-2xl">{txt}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-xs font-bold text-indigo-600 hover:underline">Full Report</button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={3} className="px-6 py-32 text-center text-slate-400 text-sm font-medium border-t-0">
                    <div className="flex flex-col items-center gap-4">
                      <Database className="w-12 h-12 text-slate-100" />
                      <div className="uppercase tracking-widest text-xs">Knowledge Base Empty</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}