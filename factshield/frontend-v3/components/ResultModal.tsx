"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { VerificationResult } from "@/lib/api";
import { Brain, ShieldCheck, AlertTriangle, Fingerprint, Network, Info, ScanSearch, Scale, Gavel, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { EvidenceGraph } from "@/components/EvidenceGraph";

interface Props {
  result: VerificationResult | null;
  onClose: () => void;
}

export function ResultModal({ result, onClose }: Props) {
  if (!result) return null;

  const veracityConfidence = result.veracity.confidence !== null
    ? `${Math.round(result.veracity.confidence * 100)}%`
    : "LLM-derived";
  const toxicityConfidence = result.toxicity.confidence !== null
    ? `${Math.round(result.toxicity.confidence * 100)}%`
    : "LLM-derived";

  const getStatusColor = (value: string) => {
    const key = value.toLowerCase();
    if (["real", "verified", "safe", "supports"].includes(key)) return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    if (["fake", "misleading", "suspicious", "hate", "refutes"].includes(key)) return "bg-red-50 text-red-700 ring-red-600/20";
    return "bg-slate-100 text-slate-600 ring-slate-600/10";
  };

  return (
    <Dialog open={!!result} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="grid max-h-[94vh] w-[min(97vw,96rem)] max-w-none grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-3xl border-none p-0 shadow-2xl">
        <div className="z-10 border-b border-slate-100 bg-white/90 px-8 py-6 backdrop-blur-md">
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full border-slate-200 px-3 py-1 text-[11px] font-bold tracking-wider text-slate-500">
              {result.verdict.toUpperCase()}
            </Badge>
            <Badge className={cn("rounded-full px-3 py-1 text-[11px] font-bold tracking-wider", getStatusColor(result.veracity.prediction))}>
              {result.veracity.prediction.toUpperCase()} | {veracityConfidence}
            </Badge>
            <Badge variant="outline" className={cn("rounded-full px-3 py-1 text-[11px] font-bold tracking-wider", getStatusColor(result.toxicity.prediction))}>
              TOXICITY: {result.toxicity.prediction.toUpperCase()} | {toxicityConfidence}
            </Badge>
            {result.c2pa_verification?.is_verified && (
              <Badge className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold tracking-wider text-blue-700 ring-blue-600/20">
                <Fingerprint className="h-3 w-3" /> C2PA VERIFIED
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl font-extrabold leading-tight text-slate-900">
            {result.claim}
          </DialogTitle>
        </div>

        <div className="overflow-y-auto overscroll-contain px-8 py-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-8 lg:col-span-7">
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Neural Reasoning</h3>
                </div>
                <div className="rounded-2xl border border-indigo-100/50 bg-gradient-to-br from-indigo-50/30 to-white p-5 shadow-sm">
                  <p className="text-[15px] font-medium leading-relaxed text-slate-700">
                    {result.generated_reason || "No concise reasoning was returned by the backend."}
                  </p>
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Manipulation & Fallacies</h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="rounded-2xl border border-slate-200/60 border-l-4 border-l-amber-500 bg-slate-50 p-5">
                    <p className="mb-4 text-sm italic leading-relaxed text-slate-600">{result.propaganda_anatomy}</p>
                    <div className="flex flex-wrap gap-2">
                      {result.detected_fallacies.map((fallacy, index) => (
                        <Badge key={index} variant="secondary" className="rounded-lg border-none bg-amber-100/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight text-amber-700 hover:bg-amber-100">
                          {fallacy}
                        </Badge>
                      ))}
                      {!result.detected_fallacies.length && (
                        <span className="text-[10px] font-medium italic text-slate-400">No specific logical fallacies identified.</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {result.c2pa_verification?.is_verified && (
                <section className="animate-in fade-in slide-in-from-left-2">
                  <div className="mb-4 flex items-center gap-2">
                    <Fingerprint className="h-5 w-5 text-blue-600" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Content Provenance (C2PA)</h3>
                  </div>
                  <div className="flex items-start gap-4 rounded-2xl border border-blue-100 bg-blue-50/30 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="mb-1 text-sm font-bold text-blue-900">Cryptographically Verified Origin</div>
                      <div className="text-xs font-medium leading-relaxed text-blue-700">
                        This media contains a valid JUMBF manifest issued by <span className="font-bold underline">{result.c2pa_verification.issuer || "Trusted Entity"}</span>.
                        Integrity check passed: Media has not been tampered with since its capture.
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <section>
                <div className="mb-4 flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-blue-600" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Provenance & Trust Signals</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <Fingerprint className="h-4 w-4 text-blue-600" />
                      <div className="text-xs font-black uppercase tracking-widest text-slate-500">C2PA Status</div>
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {result.c2pa_verification?.is_verified ? "Verified Origin" : "No trusted signature"}
                    </div>
                    <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                      {result.c2pa_verification?.details || "No provenance metadata was returned."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <ScanSearch className="h-4 w-4 text-indigo-600" />
                      <div className="text-xs font-black uppercase tracking-widest text-slate-500">Media Analysis</div>
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {result.provenance_signals.has_visual_context ? "Visual context captured" : "Text-only verification"}
                    </div>
                    <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                      {result.provenance_signals.visual_context_excerpt || "No image/video context was needed for this claim."}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Mode: {result.provenance_signals.source_mode}
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Evidence: {result.provenance_signals.evidence_count}
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Trust: {result.provenance_signals.trusted_origin ? "signed" : "unsigned"}
                  </Badge>
                </div>
              </section>

              {result.historical_context && (
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <Info className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Historical Context</h3>
                  </div>
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-5 text-sm font-medium leading-relaxed text-slate-700">
                    {result.historical_context}
                  </div>
                </section>
              )}

              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Info className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">XAI Token Attribution</h3>
                </div>
                <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  {result.xai_attributions.map((token, index) => {
                    const score = token.attribution_score || token.score || 0;
                    const alpha = Math.min(Math.abs(score) * 1.5, 0.85);
                    const backgroundColor = score > 0
                      ? `rgba(239, 68, 68, ${alpha})`
                      : score < 0
                        ? `rgba(34, 197, 94, ${alpha})`
                        : "rgba(0,0,0,0.04)";

                    return (
                      <span
                        key={index}
                        className="cursor-help rounded-md px-1.5 py-0.5 font-mono text-[13px] transition-transform hover:scale-110"
                        style={{ backgroundColor, color: alpha > 0.5 ? "#fff" : "#334155" }}
                        title={`Influence: ${score.toFixed(4)}`}
                      >
                        {token.word}
                      </span>
                    );
                  })}
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Scale className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Debate Trace</h3>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      key: "bias_analyst",
                      label: "Bias Analyst",
                      icon: AlertTriangle,
                      body: result.debate_trace.bias_analyst,
                      tone: "border-amber-200 bg-amber-50/60 text-amber-900",
                    },
                    {
                      key: "prosecutor",
                      label: "Prosecutor",
                      icon: ShieldAlert,
                      body: result.debate_trace.prosecutor,
                      tone: "border-rose-200 bg-rose-50/60 text-rose-900",
                    },
                    {
                      key: "defense",
                      label: "Defense",
                      icon: ShieldCheck,
                      body: result.debate_trace.defense,
                      tone: "border-emerald-200 bg-emerald-50/60 text-emerald-900",
                    },
                    {
                      key: "judge",
                      label: "Judge",
                      icon: Gavel,
                      body: result.debate_trace.judge,
                      tone: "border-indigo-200 bg-indigo-50/60 text-indigo-900",
                    },
                  ].map((stage) => (
                    <div key={stage.key} className={cn("rounded-2xl border p-5", stage.tone)}>
                      <div className="mb-2 flex items-center gap-2">
                        <stage.icon className="h-4 w-4" />
                        <div className="text-xs font-black uppercase tracking-widest">{stage.label}</div>
                      </div>
                      <p className="text-sm font-medium leading-relaxed">
                        {stage.body || "No detailed trace was returned for this stage."}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-8 lg:col-span-5">
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Network className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Evidence Correlation</h3>
                </div>
                <div className="h-72">
                  <EvidenceGraph graph={result.knowledge_graph} />
                </div>
                {!!result.evidence_citations.length && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.evidence_citations.map((citation, index) => (
                      <Badge key={index} variant="outline" className="border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Evidence {citation.index + 1}: {citation.relation} ({Math.round(citation.confidence * 100)}%)
                      </Badge>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Retrieved Context</h3>
                  <span className="text-[10px] font-bold uppercase text-slate-400">{result.evidence.length} Sources</span>
                </div>
                <div className="space-y-3">
                  {result.evidence.map((entry, index) => (
                    <div key={index} className="rounded-xl border border-slate-200/60 bg-slate-50 p-4 text-[12px] leading-relaxed text-slate-600 transition-colors hover:border-indigo-100 hover:bg-white">
                      {entry}
                    </div>
                  ))}
                  {!result.evidence.length && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs font-medium text-slate-400">
                      No external evidence found in knowledge base.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
