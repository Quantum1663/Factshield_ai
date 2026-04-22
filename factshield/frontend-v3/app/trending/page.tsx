"use client";

import { useEffect, useState } from "react";
import { getTrending, TrendingItem } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, BarChart3, Share2 } from "lucide-react";

export default function TrendingPage() {
  const [trending, setTrending] = useState<TrendingItem[]>([]);

  useEffect(() => {
    getTrending().then(setTrending).catch(console.error);
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="section-label">Narrative Watch</div>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Trending narratives</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            High-impact misinformation themes surfaced from the active feed and local intelligence sources.
          </p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          Monitoring
        </div>
      </div>

      <div className="space-y-4">
        {trending.length > 0 ? trending.map((t, i) => (
          <article key={`${t.title}-${i}`} className="surface depth-lift overflow-hidden rounded-xl">
            <div className="grid gap-0 lg:grid-cols-[5px_minmax(0,1fr)_260px]">
              <div className={i === 0 ? "bg-red-500" : "bg-amber-500"} />
              <div className="p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <Badge className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                    {t.tag || "Active"}
                  </Badge>
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Impact: {t.impact || "High"}</span>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{t.title}</h2>
                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">{t.description}</p>
              </div>
              <aside className="border-t border-slate-200 bg-slate-50 p-5 lg:border-l lg:border-t-0">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                  <div className="rounded-lg bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                      <BarChart3 className="h-3.5 w-3.5" />
                      Resonance
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-950">{i === 0 ? "High" : "Medium"}</div>
                  </div>
                  <div className="rounded-lg bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                      <Share2 className="h-3.5 w-3.5" />
                      Velocity
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-950">Rising</div>
                  </div>
                </div>
              </aside>
            </div>
          </article>
        )) : (
          <div className="surface-muted rounded-lg py-24 text-center text-sm font-medium text-slate-500">
            No active narratives detected.
          </div>
        )}
      </div>
    </div>
  );
}
