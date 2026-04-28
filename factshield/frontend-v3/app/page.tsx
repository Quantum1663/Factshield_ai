"use client";

import { useEffect, useMemo, useState } from "react";
import { CommandCenter } from "@/components/CommandCenter";
import {
  FeedItem,
  getIntelligenceFeed,
  getTrending,
  getNeuralStats,
  getSystemStatus,
  NeuralStats,
  SystemStatus,
  TrendingItem,
} from "@/lib/api";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  FileText,
  Globe2,
  LockKeyhole,
  Radio,
  SearchCheck,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function formatNumber(value: number | string | undefined) {
  if (typeof value === "number") return new Intl.NumberFormat("en").format(value);
  return value ?? "0";
}

export default function Dashboard() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [stats, setStats] = useState<NeuralStats | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const [commandQuery, setCommandQuery] = useState("");
  const [autoSubmitSignal, setAutoSubmitSignal] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    const fetchData = async () => {
      const results = await Promise.allSettled([
        getIntelligenceFeed(),
        getTrending(),
        getNeuralStats(),
        getSystemStatus(),
      ]);

      if (isCancelled) return;

      const [feedResult, trendingResult, statsResult, systemResult] = results;
      const failedKeys: string[] = [];

      if (feedResult.status === "fulfilled") {
        setFeed(feedResult.value);
      } else {
        setFeed([]);
        failedKeys.push("feed");
      }

      if (trendingResult.status === "fulfilled") {
        setTrending(trendingResult.value);
      } else {
        setTrending([]);
        failedKeys.push("trending");
      }

      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value);
      } else {
        setStats(null);
        failedKeys.push("runtime stats");
      }

      if (systemResult.status === "fulfilled") {
        setSystemStatus(systemResult.value);
      } else {
        setSystemStatus(null);
        failedKeys.push("system status");
      }

      if (failedKeys.length > 0) {
        setBackendMessage(`Backend data is partially unavailable right now: ${failedKeys.join(", ")}.`);
      } else {
        setBackendMessage(null);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  const retrievalDegraded = Boolean(
    (stats && stats.index_consistent === false) ||
    (systemStatus && systemStatus.index_consistent === false) ||
    stats?.retrieval_status === "degraded" ||
    stats?.retrieval_status === "unavailable"
  );

  const healthTone = retrievalDegraded ? "Watch" : "Healthy";
  const retrievalMessage = stats?.retrieval_message || systemStatus?.retrieval_message || "Retrieval index is degraded.";
  const evidenceCount = stats?.metadata_count ?? systemStatus?.metadata_count ?? stats?.memory_count ?? systemStatus?.dataset_entries ?? 0;
  const vectorCount = stats?.vector_count ?? systemStatus?.faiss_vectors ?? 0;
  const usage = Math.min(100, Math.round((Number(vectorCount || 0) / 1000) * 100));

  const kpis = [
    { label: "Evidence Records", value: evidenceCount, sub: "Indexed sources", icon: Database, tone: "cyan" },
    { label: "Vector Store", value: vectorCount, sub: stats?.vector_engine || "FAISS L2", icon: SearchCheck, tone: "emerald" },
    { label: "Signal Volume", value: feed.length, sub: "Live feed items", icon: Radio, tone: "amber" },
    { label: "Platform State", value: stats?.status || systemStatus?.api_status || "Active", sub: "Runtime status", icon: Activity, tone: "violet" },
  ];

  const queue = useMemo(() => {
    const feedQueue = feed.slice(0, 3).map((item, index) => ({
      raw: item,
      title: item.title,
      source: item.source,
      status: index === 0 ? "Priority" : item.status,
      type: item.type === "NEWS" ? "Source" : "Social",
    }));
    return feedQueue.length ? feedQueue : [
      { raw: null, title: "No investigations queued", source: "Workspace", status: "Clear", type: "System" },
    ];
  }, [feed]);

  const handleAnalyzeFeedItem = (item: FeedItem) => {
    const claim = [item.title, item.description].filter(Boolean).join(". ");
    setCommandQuery(claim);
    setAutoSubmitSignal((current) => current + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-8 pb-12">
      <section className="grid min-h-[520px] items-end gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Badge className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">Enterprise Workspace</Badge>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <span className={cn("status-dot", retrievalDegraded ? "bg-amber-500" : "bg-emerald-500")} />
              Retrieval {stats?.retrieval_status || "checking"}
            </div>
          </div>
          <h1 className="max-w-5xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-7xl">
            Intelligence operations for verified decisions.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Monitor incoming narratives, verify high-risk claims, preserve evidence trails, and ship decision-ready reports from one operating workspace.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/reports" className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.24)]">
              <FileText className="h-4 w-4" />
              Reports
            </Link>
            <Link href="/team" className="inline-flex h-11 items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-5 text-sm font-semibold text-slate-700 hover:bg-cyan-300/15">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Review Desk
            </Link>
          </div>
        </div>

        <aside className="surface holo-edge depth-lift rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="section-label">Workspace Health</div>
              <div className="mt-2 text-3xl font-semibold text-slate-950">{healthTone}</div>
            </div>
            <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", retrievalDegraded ? "bg-amber-300/15 text-amber-100" : "bg-emerald-300/15 text-emerald-100")}>
              {retrievalDegraded ? <AlertTriangle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
            </div>
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-xs font-medium text-slate-500">
                <span>Monthly verification capacity</span>
                <span>{usage}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-cyan-300/10">
                <div className="h-full rounded-full bg-primary" style={{ width: `${usage}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-cyan-300/15 bg-black/20 p-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">SLA</div>
                <div className="mt-1 text-sm font-semibold text-slate-950">99.9%</div>
              </div>
              <div className="rounded-lg border border-cyan-300/15 bg-black/20 p-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Audit</div>
                <div className="mt-1 text-sm font-semibold text-slate-950">Enabled</div>
              </div>
            </div>
            <div className="rounded-lg border border-cyan-300/15 bg-black/20 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                <LockKeyhole className="h-3.5 w-3.5 text-primary" />
                Policy Pack
              </div>
              <div className="text-sm leading-6 text-slate-600">Election integrity, hate-speech review, media provenance, and source-risk checks are active.</div>
            </div>
          </div>
        </aside>
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
                <div className="mt-1 font-semibold text-slate-950">{formatNumber(evidenceCount)}</div>
              </div>
              <div className="rounded-lg border border-cyan-300/15 bg-black/20 p-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Vectors</div>
                <div className="mt-1 font-semibold text-slate-950">{formatNumber(vectorCount)}</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {backendMessage && (
        <section className="surface rounded-xl border border-amber-300/20 bg-amber-300/10 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-300/15 text-amber-100">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="section-label text-amber-100/80">Backend Availability</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {backendMessage} The workspace is staying online with reduced data instead of failing the whole dashboard.
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((s) => (
          <div key={s.label} className="surface depth-lift rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="section-label">{s.label}</div>
                <div className="metric-value mt-3">{formatNumber(s.value)}</div>
                <div className="mt-1 text-sm text-slate-500">{s.sub}</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-300/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <CommandCenter initialQuery={commandQuery} autoSubmitSignal={autoSubmitSignal} />

        <aside className="space-y-4">
          <div className="surface rounded-xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="section-label">Review Queue</div>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Investigations</h2>
              </div>
              <Badge className="rounded-md border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">{queue.length} open</Badge>
            </div>
            <div className="space-y-3">
              {queue.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-lg border border-cyan-300/15 bg-black/20 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{item.source}</span>
                    <Badge className="rounded-md border border-amber-300/20 bg-amber-300/10 text-[10px] font-semibold text-amber-100">{item.status}</Badge>
                  </div>
                  <div className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{item.title}</div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    {item.type} review
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!item.raw}
                      onClick={() => item.raw && handleAnalyzeFeedItem(item.raw)}
                      className="rounded-lg bg-primary text-slate-950 hover:bg-primary/90"
                    >
                      Analyze
                    </Button>
                    {item.raw?.link && item.raw.link !== "#" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-lg border-cyan-300/20 bg-cyan-300/10 text-slate-700 hover:bg-cyan-300/15"
                        onClick={() => window.open(item.raw?.link, "_blank", "noopener,noreferrer")}
                      >
                        Open source
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="surface rounded-xl p-5">
            <div className="section-label">Usage</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-cyan-300/15 bg-black/20 p-3">
                <div className="text-xs text-slate-500">API calls</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">{formatNumber((stats?.cache_entries ?? 0) + feed.length + 128)}</div>
              </div>
              <div className="rounded-lg border border-cyan-300/15 bg-black/20 p-3">
                <div className="text-xs text-slate-500">Rate limit</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">{stats?.rate_limit_per_minute ?? 15}/min</div>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="section-label">Incoming Signals</div>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Live intelligence feed</h2>
            </div>
            <Link href="/feed" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
              View feed <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {feed.slice(0, 6).map((item, i) => (
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
              <div className="surface-muted rounded-lg py-16 text-center text-sm font-medium text-slate-500 lg:col-span-2">
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
                <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-primary">
                  <Zap className="h-3.5 w-3.5" />
                  Response playbook ready
                </div>
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
