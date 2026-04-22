"use client";

import { useEffect, useState } from "react";
import { CommandCenter } from "@/components/CommandCenter";
import { FeedItem, getIntelligenceFeed, getTrending, getNeuralStats, getSystemStatus, NeuralStats, SystemStatus, TrendingItem } from "@/lib/api";
import { Activity, AlertTriangle, ArrowRight, Database, ExternalLink, Globe2, Radio, SearchCheck, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function Dashboard() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [stats, setStats] = useState<NeuralStats | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [commandQuery, setCommandQuery] = useState("");
  const [autoSubmitSignal, setAutoSubmitSignal] = useState(0);

  useEffect(() => {
    const fetchData = () => {
      Promise.all([getIntelligenceFeed(), getTrending(), getNeuralStats(), getSystemStatus()])
        .then(([f, t, s, system]) => {
          setFeed(f);
          setTrending(t);
          setStats(s);
          setSystemStatus(system);
        })
        .catch(console.error);
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { label: "Evidence Records", value: stats?.memory_count ?? systemStatus?.dataset_entries ?? 0, sub: "Indexed knowledge", icon: Database },
    { label: "Vector Store", value: stats?.vector_count ?? systemStatus?.faiss_vectors ?? 0, sub: stats?.vector_engine || "FAISS L2", icon: SearchCheck },
    { label: "Live Items", value: feed.length, sub: "Feed signals", icon: Radio },
    { label: "System State", value: stats?.status || systemStatus?.api_status || "Active", sub: "Runtime status", icon: Activity },
  ];

  const retrievalDegraded = Boolean(
    (stats && stats.index_consistent === false) ||
    (systemStatus && systemStatus.index_consistent === false) ||
    stats?.retrieval_status === "degraded" ||
    stats?.retrieval_status === "unavailable"
  );
  const retrievalMessage = stats?.retrieval_message || systemStatus?.retrieval_message || "Retrieval index is degraded.";

  const handleAnalyzeFeedItem = (item: FeedItem) => {
    const claim = [item.title, item.description].filter(Boolean).join(". ");
    setCommandQuery(claim);
    setAutoSubmitSignal((current) => current + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-8 pb-12">
      <section className="grid min-h-[520px] items-end gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Badge className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">FactShield Spatial</Badge>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <span className="status-dot bg-emerald-500" />
              3D verification workspace
            </div>
          </div>
          <h1 className="max-w-5xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-7xl">
            Command the evidence field.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Verify claims, inspect provenance, and watch retrieval signals move through a spatial intelligence interface built for serious misinformation analysis.
          </p>
        </div>

        <div className="surface holo-edge depth-lift rounded-xl p-5">
          <div className="section-label">Runtime Snapshot</div>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm text-slate-500">Classifier</span>
              <span className="max-w-[180px] truncate text-sm font-semibold text-slate-900">{stats?.local_classifier || "XLM-Roberta"}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm text-slate-500">Reasoner</span>
              <span className="max-w-[180px] truncate text-sm font-semibold text-slate-900">{stats?.reasoner || "Available on demand"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Media intake</span>
              <span className="text-sm font-semibold text-slate-900">{stats?.video_support ? "Image + video" : "Image ready"}</span>
            </div>
          </div>
        </div>
      </section>

      {retrievalDegraded && (
        <section className="surface holo-edge rounded-xl p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-300/15 text-amber-200">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="section-label text-amber-100/80">Retrieval Degraded</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{retrievalMessage}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-[260px]">
              <div className="rounded-lg border border-cyan-300/15 bg-black/20 p-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Metadata</div>
                <div className="mt-1 font-semibold text-slate-950">{stats?.metadata_count ?? systemStatus?.metadata_count ?? stats?.memory_count ?? 0}</div>
              </div>
              <div className="rounded-lg border border-cyan-300/15 bg-black/20 p-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Vectors</div>
                <div className="mt-1 font-semibold text-slate-950">{stats?.vector_count ?? systemStatus?.faiss_vectors ?? 0}</div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="surface depth-lift rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="section-label">{s.label}</div>
                <div className="metric-value mt-3">{s.value}</div>
                <div className="mt-1 text-sm text-slate-500">{s.sub}</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-300/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <CommandCenter initialQuery={commandQuery} autoSubmitSignal={autoSubmitSignal} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="section-label">Incoming Signals</div>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Latest feed items</h2>
            </div>
            <Link href="/feed" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
              View feed <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {feed.slice(0, 5).map((item, i) => (
              <article key={item.id || `${item.title}-${i}`} className="surface depth-lift rounded-xl p-4 transition-colors hover:border-primary/30">
                <button type="button" className="w-full text-left" onClick={() => handleAnalyzeFeedItem(item)}>
                  <div className="flex gap-4">
                    <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 sm:flex">
                      {item.type === "NEWS" ? <Globe2 className="h-5 w-5" /> : <Radio className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{item.source}</span>
                        <Badge className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{item.status}</Badge>
                      </div>
                      <h3 className="line-clamp-2 text-base font-semibold leading-snug text-slate-950">{item.title}</h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{item.description}</p>
                    </div>
                  </div>
                </button>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs font-medium text-slate-500">{item.timestamp || `Signal ${i + 1}`}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-primary">Analyze</span>
                    {item.link && item.link !== "#" && (
                      <button
                        type="button"
                        className="text-slate-400 hover:text-slate-700"
                        onClick={(event) => {
                          event.stopPropagation();
                          window.open(item.link, "_blank", "noopener,noreferrer");
                        }}
                        title="Open source"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
            {!feed.length && (
              <div className="surface-muted rounded-lg py-16 text-center text-sm font-medium text-slate-500">
                No feed items are available yet.
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div>
            <div className="section-label">Narrative Watch</div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Active trends</h2>
          </div>
          <div className="space-y-3">
            {trending.slice(0, 4).map((t, i) => (
              <div key={`${t.title}-${i}`} className="surface depth-lift rounded-xl p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Badge className={cn(
                    "rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                    i === 0 ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"
                  )}>
                    {t.tag || "Trending"}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {t.impact || "High"}
                  </div>
                </div>
                <h3 className="text-base font-semibold leading-snug text-slate-950">{t.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{t.description}</p>
              </div>
            ))}
            {!trending.length && (
              <div className="surface-muted rounded-lg py-16 text-center text-sm font-medium text-slate-500">
                No active trends detected.
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
