"use client";

import { useEffect, useMemo, useState } from "react";
import { FeedItem, getIntelligenceFeed, getTaskStatus, submitVerification, VerificationResult } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, ExternalLink, Globe2, Loader2, Radio, SearchCheck, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResultModal } from "@/components/ResultModal";
import axios from "axios";

export default function FeedPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [activeFeedId, setActiveFeedId] = useState<string | null>(null);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);

  useEffect(() => {
    getIntelligenceFeed()
      .then((items) => {
        setFeed(items);
        setBackendMessage(null);
      })
      .catch(() => {
        setFeed([]);
        setBackendMessage("The feed service is unavailable right now. This usually means the local backend is offline or still waiting on external sources.");
      });
  }, []);

  const pollStatus = (taskId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      if (attempts > 60) {
        clearInterval(interval);
        setActiveFeedId(null);
        return;
      }

      try {
        const data = await getTaskStatus(taskId);
        if (data.status === "completed") {
          clearInterval(interval);
          setResult(data.result);
          setActiveFeedId(null);
        } else if (data.status === "failed") {
          clearInterval(interval);
          setActiveFeedId(null);
          alert(data.error || "Verification failed");
        }
      } catch (error) {
        clearInterval(interval);
        setActiveFeedId(null);
        console.error("Polling error:", error);
      }
    }, 2000);
  };

  const handleAnalyze = async (item: FeedItem) => {
    setActiveFeedId(item.id || item.title);
    try {
      const claim = [item.title, item.description].filter(Boolean).join(". ");
      const { task_id } = await submitVerification(claim);
      pollStatus(task_id);
    } catch (error: unknown) {
      setActiveFeedId(null);
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.detail || "Analyze failed");
      } else {
        alert("Analyze failed");
      }
    }
  };

  const getStatusColor = (value: string) => {
    const key = value.toLowerCase();
    if (["real", "verified", "safe"].includes(key)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (["fake", "misleading", "suspicious", "hate"].includes(key)) return "border-red-200 bg-red-50 text-red-700";
    return "border-slate-200 bg-slate-50 text-slate-600";
  };

  const summary = useMemo(() => {
    const newsCount = feed.filter((item) => item.type === "NEWS").length;
    const socialCount = Math.max(feed.length - newsCount, 0);
    const flaggedCount = feed.filter((item) => ["misleading", "suspicious", "hate"].includes(item.status.toLowerCase())).length;
    return { newsCount, socialCount, flaggedCount };
  }, [feed]);

  return (
    <div className="space-y-6 pb-12">
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Signals queued", value: String(feed.length), icon: Sparkles, detail: "Live ingestion window" },
          { label: "High-risk items", value: String(summary.flaggedCount), icon: AlertTriangle, detail: "Require analyst review" },
          { label: "Source mix", value: `${summary.newsCount}/${summary.socialCount}`, icon: Zap, detail: "News vs social posts" },
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

      {backendMessage && (
        <section className="surface rounded-xl border border-amber-300/20 bg-amber-300/10 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-300/15 text-amber-100">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="section-label text-amber-100/80">Feed Unavailable</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{backendMessage}</p>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {feed.length > 0 ? feed.map((item, i) => {
            const id = item.id || item.title;
            const isLoading = activeFeedId === id;
            return (
              <article key={`${id}-${i}`} className="surface depth-lift rounded-xl p-5 transition-colors hover:border-primary/30">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      {item.type === "NEWS" ? <Globe2 className="h-5 w-5" /> : <Radio className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold uppercase tracking-widest text-slate-500">{item.source}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="h-3.5 w-3.5" />
                        {item.timestamp || "Just now"}
                      </div>
                    </div>
                  </div>
                  <Badge className={cn("rounded-md border px-2 py-0.5 text-[11px] font-semibold", getStatusColor(item.status))}>
                    {item.status}
                  </Badge>
                </div>

                <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-slate-950">{item.title}</h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{item.description}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-md border border-cyan-300/15 bg-black/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    {item.type || "signal"}
                  </span>
                  <span className="rounded-md border border-cyan-300/15 bg-black/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    triage ready
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    disabled={!item.link || item.link === "#"}
                    onClick={() => item.link && window.open(item.link, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Source
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-lg bg-primary text-slate-950 hover:bg-primary/90"
                    disabled={isLoading}
                    onClick={() => void handleAnalyze(item)}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchCheck className="h-4 w-4" />}
                    Analyze
                  </Button>
                </div>
              </article>
            );
          }) : (
            <div className="surface-muted col-span-full rounded-lg py-24 text-center text-sm font-medium text-slate-500">
              No feed items are available yet.
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="surface rounded-xl p-5">
            <div className="section-label">Triage policy</div>
            <div className="mt-2 text-xl font-semibold text-slate-950">Auto-send suspicious items into verification</div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Feed operators can inspect source links, run a claim check, and move evidence straight into briefing workflows.
            </p>
          </div>

          <div className="surface rounded-xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="section-label">Desk checklist</div>
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-3">
              {[
                "Validate source credibility",
                "Inspect cross-platform wording",
                "Preserve evidence before escalation",
                "Assign analyst owner for decision",
              ].map((item) => (
                <div key={item} className="rounded-lg border border-cyan-300/15 bg-black/20 px-3 py-3 text-sm text-slate-600">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <ResultModal result={result} onClose={() => setResult(null)} />
    </div>
  );
}
