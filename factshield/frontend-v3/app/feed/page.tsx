"use client";

import { useEffect, useState } from "react";
import { FeedItem, getIntelligenceFeed, getTaskStatus, submitVerification, VerificationResult } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ExternalLink, Globe2, Loader2, Radio, SearchCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResultModal } from "@/components/ResultModal";
import axios from "axios";

export default function FeedPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [activeFeedId, setActiveFeedId] = useState<string | null>(null);

  useEffect(() => {
    getIntelligenceFeed().then(setFeed).catch(console.error);
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

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="section-label">Live Feed</div>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Incoming intelligence</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Review ingested articles and posts, open their source, or send them directly into the verification pipeline.
          </p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
          <span className="status-dot bg-emerald-500" />
          Feed active
        </div>
      </div>

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
                  className="rounded-lg bg-primary text-white hover:bg-primary/90"
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

      <ResultModal result={result} onClose={() => setResult(null)} />
    </div>
  );
}
