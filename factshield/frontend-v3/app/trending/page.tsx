"use client";

import { useEffect, useMemo, useState } from "react";
import { getTrending, TrendingItem } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowUpRight, BarChart3, Radar, Share2, Siren, Waves } from "lucide-react";

export default function TrendingPage() {
  const [trending, setTrending] = useState<TrendingItem[]>([]);

  useEffect(() => {
    getTrending().then(setTrending).catch(console.error);
  }, []);

  const topImpact = useMemo(() => trending.filter((item) => (item.impact || "").toLowerCase() === "high").length, [trending]);

  return (
    <div className="space-y-6 pb-12">
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Active narratives", value: String(trending.length), icon: Radar, detail: "Campaigns under watch" },
          { label: "High-impact themes", value: String(topImpact), icon: Siren, detail: "Escalation candidates" },
          { label: "Response posture", value: "Ready", icon: Waves, detail: "Playbooks attached" },
        ].map((item) => (
          <div key={item.label} className="surface depth-lift rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="section-label">{item.label}</div>
                <div className="metric-value mt-3">{item.value}</div>
                <div className="mt-1 text-sm text-slate-500">{item.detail}</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-300/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="space-y-4">
        {trending.length > 0 ? trending.map((t, i) => (
          <article key={`${t.title}-${i}`} className="surface depth-lift overflow-hidden rounded-xl">
            <div className="grid gap-0 lg:grid-cols-[5px_minmax(0,1fr)_320px]">
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

                <div className="mt-5 flex flex-wrap gap-2">
                  {["Cross-channel spread", "Policy sensitivity", "Requires briefing"].map((chip) => (
                    <span key={chip} className="rounded-md border border-cyan-300/15 bg-black/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                      {chip}
                    </span>
                  ))}
                </div>
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
                  <div className="rounded-lg bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Escalation
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-950">{i < 2 ? "Immediate" : "Monitor"}</div>
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

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          { title: "Escalation rule", detail: "Send narratives with high policy sensitivity to reports and reviewer queues.", icon: AlertTriangle },
          { title: "Analyst motion", detail: "Pair trend snapshots with source cards and fresh verifications before export.", icon: Radar },
          { title: "Comms handoff", detail: "Publish a briefing once the narrative pattern is stable across sources.", icon: Share2 },
        ].map((item) => (
          <div key={item.title} className="surface rounded-xl p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-300/10 text-primary">
              <item.icon className="h-5 w-5" />
            </div>
            <div className="text-lg font-semibold text-slate-950">{item.title}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
