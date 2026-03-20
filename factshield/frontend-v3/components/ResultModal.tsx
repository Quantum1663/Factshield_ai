"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { EvidenceGraph } from "@/components/EvidenceGraph";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VerificationResult } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Brain,
  Fingerprint,
  Gavel,
  Info,
  Maximize2,
  Network,
  ScanSearch,
  Scale,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

interface Props {
  result: VerificationResult | null;
  onClose: () => void;
}

function cleanModelText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/\*\*/g, "")
    .replace(/^[#>\-\s]+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getDisplayClaim(result: VerificationResult) {
  const rawClaim = result.claim || "";
  if (!result.provenance_signals.has_visual_context) {
    return cleanModelText(rawClaim);
  }

  const visualContext = result.provenance_signals.visual_context_excerpt || rawClaim;
  const lines = visualContext
    .split(/\r?\n/)
    .map((line) => cleanModelText(line))
    .filter(Boolean);

  const firstContentLine = lines.find((line) => !/^(visible text|visual context|subjects|setting)\b/i.test(line));
  const candidate = firstContentLine || lines[0] || cleanModelText(rawClaim) || "Image verification result";

  return candidate.length > 160 ? `${candidate.slice(0, 157).trimEnd()}...` : candidate;
}

function getStatusColor(value: string) {
  const key = value.toLowerCase();
  if (["real", "verified", "safe", "supports"].includes(key)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (["fake", "misleading", "suspicious", "hate", "refutes"].includes(key)) {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function Panel({
  title,
  icon: Icon,
  children,
  aside,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.6rem] border border-slate-200/80 bg-white/92 p-5 shadow-[0_25px_70px_-40px_rgba(15,23,42,0.28)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">{title}</h3>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-black text-slate-950">{value}</div>
    </div>
  );
}

export function ResultModal({ result, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isCondensed, setIsCondensed] = useState(false);
  const [isGraphWorkspaceOpen, setIsGraphWorkspaceOpen] = useState(false);

  if (!result) return null;

  const isFallback = result.generated_reason?.includes("[FALLBACK]") || result.generated_reason?.includes("[ERROR]");
  const displayClaim = getDisplayClaim(result);
  const visualContextText = result.provenance_signals.visual_context_excerpt || "";
  const veracityConfidence =
    result.veracity.confidence !== null ? `${Math.round(result.veracity.confidence * 100)}%` : "LLM-derived";
  const toxicityConfidence =
    result.toxicity.confidence !== null ? `${Math.round(result.toxicity.confidence * 100)}%` : "LLM-derived";

  const debateStages = [
    {
      key: "bias_analyst",
      label: "Bias Analyst",
      icon: AlertTriangle,
      body: result.debate_trace.bias_analyst,
      tone: "border-amber-200 bg-amber-50/80 text-amber-950",
    },
    {
      key: "prosecutor",
      label: "Prosecutor",
      icon: ShieldAlert,
      body: result.debate_trace.prosecutor,
      tone: "border-rose-200 bg-rose-50/80 text-rose-950",
    },
    {
      key: "defense",
      label: "Defense",
      icon: ShieldCheck,
      body: result.debate_trace.defense,
      tone: "border-emerald-200 bg-emerald-50/80 text-emerald-950",
    },
    {
      key: "judge",
      label: "Judge",
      icon: Gavel,
      body: result.debate_trace.judge,
      tone: "border-indigo-200 bg-indigo-50/80 text-indigo-950",
    },
  ];

  return (
    <Dialog open={!!result} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[96vh] w-[min(98vw,116rem)] max-w-none overflow-hidden rounded-[2rem] border-none bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] p-0 shadow-[0_50px_140px_-40px_rgba(15,23,42,0.5)]">
        <div className="grid max-h-[96vh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
          <div className="relative overflow-hidden border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_35%),radial-gradient(circle_at_top_right,rgba(244,63,94,0.10),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] px-6 py-6 md:px-8 md:py-7">
            <div className="mb-4 flex flex-wrap items-center gap-2 pr-8">
              <Badge variant="outline" className="rounded-full border-slate-300 bg-white/85 px-3 py-1 text-[11px] font-black tracking-[0.18em] text-slate-700">
                {result.verdict.toUpperCase()}
              </Badge>
              <Badge className={cn("rounded-full border px-3 py-1 text-[11px] font-black tracking-[0.18em]", getStatusColor(result.veracity.prediction))}>
                {result.veracity.prediction.toUpperCase()} | {veracityConfidence}
              </Badge>
              <Badge className={cn("rounded-full border px-3 py-1 text-[11px] font-black tracking-[0.18em]", getStatusColor(result.toxicity.prediction))}>
                TOXICITY: {result.toxicity.prediction.toUpperCase()} | {toxicityConfidence}
              </Badge>
              {result.c2pa_verification?.is_verified && (
                <Badge className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-black tracking-[0.18em] text-sky-800">
                  <Fingerprint className="mr-1 inline h-3 w-3" />
                  C2PA VERIFIED
                </Badge>
              )}
              {isFallback && (
                <Badge className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black tracking-[0.18em] text-amber-800">
                  FALLBACK MODE
                </Badge>
              )}
            </div>

            <DialogTitle className="max-w-6xl text-[2rem] font-black leading-[1.08] tracking-tight text-slate-950 md:text-[2.35rem]">
              {displayClaim}
            </DialogTitle>

            <p className="mt-4 max-w-4xl text-[1.02rem] leading-8 text-slate-600">
              {result.generated_reason || "No concise reasoning was returned by the backend."}
            </p>
          </div>

          <div
            ref={scrollRef}
            className="overflow-y-auto overscroll-contain px-5 py-5 md:px-8 md:py-8"
            onScroll={(event) => setIsCondensed(event.currentTarget.scrollTop > 56)}
          >
            <div
              className={cn(
                "sticky top-0 z-20 mb-5 rounded-2xl border border-slate-200/80 bg-white/92 px-4 py-3 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur-md transition-all duration-300",
                isCondensed ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black tracking-[0.16em] text-slate-600">
                      {result.verdict.toUpperCase()}
                    </Badge>
                    <Badge className={cn("rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.16em]", getStatusColor(result.veracity.prediction))}>
                      {result.veracity.prediction.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="line-clamp-1 text-sm font-bold text-slate-900">{result.claim}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGraphWorkspaceOpen(true)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  Graph
                </button>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.68fr)]">
              <Panel
                title="Evidence Correlation"
                icon={Network}
                aside={
                  <button
                    type="button"
                    onClick={() => setIsGraphWorkspaceOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    Open Workspace
                  </button>
                }
              >
                <div className="rounded-[1.4rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.96))] p-3">
                  <div className="h-[34rem] md:h-[40rem] xl:h-[44rem]">
                    <EvidenceGraph graph={result.knowledge_graph} />
                  </div>
                </div>
              </Panel>

              <div className="space-y-5">
                <Panel title="Decision Snapshot" icon={Brain}>
                  <div className="grid gap-3">
                    <StatTile label="Verdict" value={result.verdict} />
                    <StatTile label="Evidence Sources" value={String(result.evidence.length)} />
                    <StatTile label="Graph Nodes" value={String(result.knowledge_graph.nodes.length)} />
                    <StatTile label="Trust Mode" value={result.provenance_signals.source_mode} />
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Manipulation Read</div>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{result.propaganda_anatomy}</p>
                  </div>
                </Panel>

                <Panel title="Signal Summary" icon={ShieldAlert}>
                  <div className="flex flex-wrap gap-2">
                    {result.detected_fallacies.length ? (
                      result.detected_fallacies.map((fallacy, index) => (
                        <Badge key={index} variant="secondary" className="rounded-full border-none bg-amber-100 px-3 py-1 text-[10px] font-black tracking-[0.12em] text-amber-800">
                          {fallacy}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">No explicit fallacies were identified for this result.</span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.evidence_citations.map((citation, index) => (
                      <Badge key={index} variant="outline" className="rounded-full border-slate-200 bg-white px-3 py-1 text-[10px] font-black tracking-[0.14em] text-slate-600">
                        E{citation.index + 1} {citation.relation} {Math.round(citation.confidence * 100)}%
                      </Badge>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>

            <div className="mt-6">
              <Tabs defaultValue="analysis" className="space-y-5">
                <TabsList className="h-auto rounded-[1.1rem] bg-slate-200/70 p-1">
                  <TabsTrigger className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.18em]" value="analysis">
                    Analysis
                  </TabsTrigger>
                  <TabsTrigger className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.18em]" value="evidence">
                    Evidence
                  </TabsTrigger>
                  <TabsTrigger className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.18em]" value="trace">
                    Debate Trace
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="analysis" className="mt-0">
                  <div className="grid gap-6 xl:grid-cols-3">
                    <Panel title="Trust Signals" icon={Fingerprint}>
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                          <div className="mb-2 flex items-center gap-2 text-sky-700">
                            <Fingerprint className="h-4 w-4" />
                            <div className="text-[10px] font-black uppercase tracking-[0.2em]">C2PA Status</div>
                          </div>
                          <div className="text-base font-black text-slate-950">
                            {result.c2pa_verification?.is_verified ? "Verified Origin" : "No trusted signature"}
                          </div>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            {result.c2pa_verification?.details || "No provenance metadata was returned."}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                          <div className="mb-2 flex items-center gap-2 text-indigo-700">
                            <ScanSearch className="h-4 w-4" />
                            <div className="text-[10px] font-black uppercase tracking-[0.2em]">Media Analysis</div>
                          </div>
                          <div className="text-base font-black text-slate-950">
                            {result.provenance_signals.has_visual_context ? "Visual context captured" : "Text-only verification"}
                          </div>
                          {result.provenance_signals.has_visual_context ? (
                            <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white/80 p-3 text-sm leading-7 whitespace-pre-wrap text-slate-600">
                              {visualContextText}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm leading-7 text-slate-600">
                              No image or video context was needed for this claim.
                            </p>
                          )}
                        </div>
                      </div>
                    </Panel>

                    <Panel title="Attribution" icon={Info}>
                      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-white/80 p-4">
                        {result.xai_attributions.length ? (
                          result.xai_attributions.map((token, index) => {
                            const score = token.attribution_score || token.score || 0;
                            const alpha = Math.min(Math.abs(score) * 1.5, 0.85);
                            const backgroundColor =
                              score > 0
                                ? `rgba(239, 68, 68, ${alpha})`
                                : score < 0
                                  ? `rgba(34, 197, 94, ${alpha})`
                                  : "rgba(0,0,0,0.04)";

                            return (
                              <span
                                key={index}
                                className="cursor-help rounded-md px-2 py-1 font-mono text-[13px] transition-transform hover:scale-105"
                                style={{ backgroundColor, color: alpha > 0.5 ? "#fff" : "#334155" }}
                                title={`Influence: ${score.toFixed(4)}`}
                              >
                                {token.word}
                              </span>
                            );
                          })
                        ) : (
                          <div className="text-sm text-slate-500">No token attribution data returned for this result.</div>
                        )}
                      </div>
                    </Panel>

                    <Panel title="Historical Context" icon={Info}>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-7 text-slate-600">
                        {result.historical_context || "No historical context was attached to this result."}
                      </div>
                    </Panel>
                  </div>
                </TabsContent>

                <TabsContent value="evidence" className="mt-0">
                  <Panel
                    title="Retrieved Context"
                    icon={Brain}
                    aside={<span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{result.evidence.length} sources</span>}
                  >
                    <div className="space-y-3">
                      {result.evidence.length ? (
                        result.evidence.map((entry, index) => (
                          <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-7 text-slate-600">
                            {entry}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                          No external evidence found in the knowledge base.
                        </div>
                      )}
                    </div>
                  </Panel>
                </TabsContent>

                <TabsContent value="trace" className="mt-0">
                  <Panel title="Debate Trace" icon={Scale}>
                    <div className="grid gap-4 xl:grid-cols-2">
                      {debateStages.map((stage) => (
                        <div key={stage.key} className={cn("rounded-2xl border p-5", stage.tone)}>
                          <div className="mb-2 flex items-center gap-2">
                            <stage.icon className="h-4 w-4" />
                            <div className="text-[10px] font-black uppercase tracking-[0.2em]">{stage.label}</div>
                          </div>
                          <p className="text-sm leading-7">
                            {stage.body || "No detailed trace was returned for this stage."}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>

      <Dialog open={isGraphWorkspaceOpen} onOpenChange={setIsGraphWorkspaceOpen}>
        <DialogContent className="max-h-[96vh] w-[min(98vw,122rem)] max-w-none overflow-hidden rounded-[2rem] border-none bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] p-0 shadow-[0_50px_140px_-45px_rgba(15,23,42,0.52)]">
          <div className="grid max-h-[96vh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
            <div className="border-b border-slate-200/80 bg-white/92 px-6 py-5 backdrop-blur-md md:px-8">
              <div className="flex flex-wrap items-start justify-between gap-4 pr-8">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black tracking-[0.18em] text-slate-600">
                      GRAPH WORKSPACE
                    </Badge>
                    <Badge className={cn("rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.18em]", getStatusColor(result.veracity.prediction))}>
                      {result.veracity.prediction.toUpperCase()}
                    </Badge>
                  </div>
                  <DialogTitle className="text-2xl font-black text-slate-950">Evidence Correlation Workspace</DialogTitle>
                  <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">
                    A larger graph-first view for inspecting relationships without the surrounding report UI.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-3 py-1 text-[10px] font-black tracking-[0.16em] text-slate-600">
                    {result.knowledge_graph.nodes.length} nodes
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-3 py-1 text-[10px] font-black tracking-[0.16em] text-slate-600">
                    {result.knowledge_graph.edges.length} edges
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid min-h-0 gap-6 overflow-hidden px-5 py-5 md:px-8 md:py-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(21rem,0.72fr)]">
              <div className="min-h-0 rounded-[1.75rem] border border-slate-200/90 bg-white/92 p-4 shadow-[0_25px_80px_-42px_rgba(15,23,42,0.28)]">
                <div className="h-full min-h-[38rem] xl:min-h-[46rem]">
                  <EvidenceGraph graph={result.knowledge_graph} />
                </div>
              </div>

              <div className="min-h-0 space-y-5 overflow-y-auto">
                <Panel title="Claim Snapshot" icon={Brain}>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-7 text-slate-700">
                    {result.claim}
                  </div>
                </Panel>

                <Panel title="Evidence Links" icon={Network}>
                  <div className="flex flex-wrap gap-2">
                    {result.evidence_citations.length ? (
                      result.evidence_citations.map((citation, index) => (
                        <Badge key={index} variant="outline" className="rounded-full border-slate-200 bg-white px-3 py-1 text-[10px] font-black tracking-[0.14em] text-slate-600">
                          Evidence {citation.index + 1}: {citation.relation} ({Math.round(citation.confidence * 100)}%)
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">No explicit evidence citations were returned for this result.</span>
                    )}
                  </div>
                </Panel>

                <Panel
                  title="Retrieved Context"
                  icon={Info}
                  aside={<span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{result.evidence.length} sources</span>}
                >
                  <div className="space-y-3">
                    {result.evidence.length ? (
                      result.evidence.map((entry, index) => (
                        <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-7 text-slate-600">
                          {entry}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-400">
                        No external evidence found in the knowledge base.
                      </div>
                    )}
                  </div>
                </Panel>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
