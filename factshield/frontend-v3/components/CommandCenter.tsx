"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Brain, CheckCircle2, FileText, Image as ImageIcon, Loader2, Play, Search, Upload, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitVerification, verifyImage, verifyVideo, getTaskStatus, VerificationResult } from "@/lib/api";
import { ResultModal } from "./ResultModal";
import axios from "axios";
import { cn } from "@/lib/utils";

interface CommandCenterProps {
  initialQuery?: string;
  autoSubmitSignal?: number;
}

const workflow = [
  { id: "pending", label: "Queued", icon: FileText },
  { id: "processing", label: "Retrieval", icon: Search },
  { id: "completed", label: "Verdict", icon: CheckCircle2 },
];

export function CommandCenter({ initialQuery = "", autoSubmitSignal = 0 }: CommandCenterProps) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [taskStatus, setTaskStatus] = useState("");

  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const pollStatus = (taskId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 60) {
        clearInterval(interval);
        setLoading(false);
        setTaskStatus("Timeout reached.");
        return;
      }

      try {
        const data = await getTaskStatus(taskId);
        setTaskStatus(data.status);
        if (data.status === "completed") {
          clearInterval(interval);
          setResult(data.result);
          setLoading(false);
        } else if (data.status === "failed") {
          clearInterval(interval);
          setLoading(false);
          alert(data.error || "Verification failed");
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000);
  };

  const handleTextSubmit = useCallback(async (claimOverride?: string) => {
    const claim = (claimOverride ?? query).trim();
    if (!claim) return;
    setLoading(true);
    setResult(null);
    setTaskStatus("queued");
    try {
      const { task_id } = await submitVerification(claim);
      pollStatus(task_id);
    } catch (error: unknown) {
      setLoading(false);
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.detail || "Request failed");
      } else {
        alert("Request failed");
      }
    }
  }, [query]);

  useEffect(() => {
    if (autoSubmitSignal > 0 && initialQuery.trim()) {
      void handleTextSubmit(initialQuery);
    }
  }, [autoSubmitSignal, handleTextSubmit, initialQuery]);

  const handleFileUpload = async (file: File, type: "image" | "video") => {
    setLoading(true);
    setResult(null);
    setTaskStatus(`processing ${type}`);
    try {
      const { task_id } = type === "image" ? await verifyImage(file) : await verifyVideo(file);
      pollStatus(task_id);
    } catch (error: unknown) {
      setLoading(false);
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.detail || "Upload failed");
      } else {
        alert("Upload failed");
      }
    }
  };

  const statusText = taskStatus || "Ready for a claim, image, or video";

  return (
    <section className="surface holo-edge overflow-hidden rounded-xl">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="p-5 sm:p-6 lg:p-8">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="section-label">Verification Console</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Check a claim or media artifact</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
              <span className={cn("status-dot", loading ? "bg-amber-500" : "bg-emerald-500")} />
              {loading ? "Analyzing" : "Available"}
            </div>
          </div>

          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Paste the exact claim, caption, post text, or short transcript to verify..."
            className="min-h-[220px] resize-none rounded-xl border-cyan-300/20 bg-black/20 p-5 text-base leading-relaxed text-slate-900 placeholder:text-cyan-100/35 focus-visible:ring-primary"
          />

          <div className="mt-5 space-y-3">
            <input type="file" ref={imgRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "image")} />
            <input type="file" ref={vidRef} className="hidden" accept="video/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "video")} />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => imgRef.current?.click()}
                className="h-11 w-full rounded-lg border-cyan-300/20 bg-cyan-300/10 text-slate-700 hover:bg-cyan-300/15"
              >
                <ImageIcon className="h-4 w-4 text-primary" />
                Image
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => vidRef.current?.click()}
                className="h-11 w-full rounded-lg border-cyan-300/20 bg-cyan-300/10 text-slate-700 hover:bg-cyan-300/15"
              >
                <Video className="h-4 w-4 text-primary" />
                Video
              </Button>
            </div>

            <Button
              disabled={loading || !query.trim()}
              onClick={() => void handleTextSubmit()}
              className="h-11 w-full rounded-lg bg-primary px-6 font-semibold text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.28)] hover:bg-primary/90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-white" />}
              Analyze
            </Button>
          </div>
        </div>

        <aside className="border-t border-cyan-300/15 bg-black/20 p-5 sm:p-6 lg:border-l lg:border-t-0 lg:p-8">
          <div className="flex h-full flex-col justify-between gap-8">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-950">Pipeline Status</div>
                  <div className="text-xs text-slate-500">RAG, classifier, and consensus stages</div>
                </div>
              </div>

              <div className="space-y-3">
                {workflow.map((step) => {
                  const current = loading && statusText.toLowerCase().includes(step.id);
                  const complete = result || (loading && step.id === "pending");
                  return (
                    <div key={step.id} className="flex items-center gap-3 rounded-lg border border-cyan-300/15 bg-cyan-300/5 px-3 py-3">
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md",
                        current ? "bg-amber-100 text-amber-700" : complete ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                      )}>
                        <step.icon className="h-4 w-4" />
                      </div>
                      <div className="text-sm font-medium text-slate-700">{step.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-cyan-300/15 bg-black/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                <Upload className="h-3.5 w-3.5" />
                Live Trace
              </div>
              <div className="font-mono text-sm text-slate-700">{statusText}</div>
            </div>
          </div>
        </aside>
      </div>

      <ResultModal result={result} onClose={() => setResult(null)} />
    </section>
  );
}
