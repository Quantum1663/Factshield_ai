"use client";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { EvidenceGraph } from "@/components/EvidenceGraph";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VerificationResult } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AlertTriangle, Database, Fingerprint, Gavel, Network, ScanSearch, ShieldAlert, ShieldCheck, X } from "lucide-react";

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
    const cleanedClaim = cleanModelText(rawClaim);
    return cleanedClaim.length > 160 ? `${cleanedClaim.slice(0, 157).trimEnd()}...` : cleanedClaim;
  }

  const visualContext = result.provenance_signals.visual_context_excerpt || rawClaim;
  const lines = visualContext
    .split(/\r?\n/)
    .map((line) => cleanModelText(line))
    .filter(Boolean);
  const firstContentLine = lines.find((line) => !/^(visible text|visual context|subjects|setting)\b/i.test(line));
  const candidate = firstContentLine || lines[0] || cleanModelText(rawClaim) || "Media verification result";
  return candidate.length > 160 ? `${candidate.slice(0, 157).trimEnd()}...` : candidate;
}

function getStatusColor(value: string) {
  const key = value.toLowerCase();
  if (["real", "verified", "safe", "supports"].includes(key)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["fake", "misleading", "suspicious", "hate", "refutes"].includes(key)) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function Panel({
  title,
  icon: Icon,
  children,
  aside,
  className
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface depth-lift rounded-xl p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}

export function ResultModal({ result, onClose }: Props) {
  if (!result) return null;

  const isFallback = result.generated_reason?.includes("[FALLBACK]") || result.generated_reason?.includes("[ERROR]");
  const displayClaim = getDisplayClaim(result);
  const visualContextText = result.provenance_signals.visual_context_excerpt || "";
  const veracityConfidence = result.veracity.confidence !== null ? `${Math.round(result.veracity.confidence * 100)}%` : "Model only";
  const toxicityConfidence = result.toxicity.confidence !== null ? `${Math.round(result.toxicity.confidence * 100)}%` : "Model only";

  const debateStages = [
    { key: "bias_analyst", label: "Bias Analyst", icon: AlertTriangle, body: result.debate_trace.bias_analyst },
    { key: "prosecutor", label: "Prosecutor", icon: ShieldAlert, body: result.debate_trace.prosecutor },
    { key: "defense", label: "Defense", icon: ShieldCheck, body: result.debate_trace.defense },
    { key: "judge", label: "Judge", icon: Gavel, body: result.debate_trace.judge },
  ];

  return (
    <Dialog open={!!result} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[94vh] w-[min(96vw,112rem)] max-w-none overflow-hidden rounded-xl border-cyan-300/20 bg-slate-950/95 p-0 shadow-2xl backdrop-blur-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 shadow-sm hover:bg-cyan-300/15"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid max-h-[94vh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
          <header className="holo-edge border-b border-cyan-300/15 bg-black/25 px-6 py-6 sm:px-8">
            <div className="mb-4 flex flex-wrap items-center gap-2 pr-10">
              <Badge variant="outline" className="rounded-md border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">
                {result.verdict}
              </Badge>
              <Badge className={cn("rounded-md border px-2.5 py-1 text-xs font-semibold", getStatusColor(result.veracity.prediction))}>
                Veracity: {result.veracity.prediction} / {veracityConfidence}
              </Badge>
              <Badge className={cn("rounded-md border px-2.5 py-1 text-xs font-semibold", getStatusColor(result.toxicity.prediction))}>
                Toxicity: {result.toxicity.prediction} / {toxicityConfidence}
              </Badge>
              {result.c2pa_verification?.is_verified && (
                <Badge className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                  <Fingerprint className="mr-1 inline h-3 w-3" />
                  C2PA verified
                </Badge>
              )}
              {isFallback && (
                <Badge className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  Fallback response
                </Badge>
              )}
            </div>

            <DialogTitle className="max-w-6xl text-3xl font-semibold leading-tight tracking-tight text-slate-950">
              {displayClaim}
            </DialogTitle>
            <p className="mt-4 max-w-5xl text-sm leading-6 text-slate-600">
              {result.generated_reason || "Verification synthesis complete. No textual summary was generated."}
            </p>
          </header>

          <div className="overflow-y-auto bg-transparent px-6 py-6 sm:px-8 scrollbar-hide">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.7fr)]">
              <Panel
                title="Evidence Graph"
                icon={Network}
                className="xl:row-span-2"
                aside={<span className="text-xs font-semibold text-slate-500">{result.knowledge_graph.nodes.length} nodes</span>}
              >
                <div className="h-[34rem] rounded-xl border border-cyan-300/15 bg-black/20 p-3 md:h-[42rem]">
                  <EvidenceGraph graph={result.knowledge_graph} />
                </div>
              </Panel>

              <div className="space-y-5">
                <Panel title="Decision Matrix" icon={Database}>
                  <div className="grid gap-3">
                    <StatTile label="Final Verdict" value={result.verdict} />
                    <StatTile label="Evidence Items" value={String(result.evidence.length)} />
                    <StatTile label="Ingestion Mode" value={result.provenance_signals.source_mode.toUpperCase()} />
                  </div>
                </Panel>

                <Panel title="Risk Anatomy" icon={ShieldAlert}>
                  <p className="text-sm leading-6 text-slate-600">{result.propaganda_anatomy || "No manipulation anatomy was returned."}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.detected_fallacies.length ? result.detected_fallacies.map((fallacy, index) => (
                      <Badge key={index} className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                        {fallacy}
                      </Badge>
                    )) : (
                      <span className="text-sm text-slate-500">No structural fallacies detected.</span>
                    )}
                  </div>
                </Panel>
              </div>
            </div>

            <Tabs defaultValue="trace" className="mt-6 space-y-5">
              <TabsList className="h-auto rounded-lg border border-cyan-300/15 bg-black/20 p-1">
                <TabsTrigger className="rounded-md px-4 py-2 text-sm data-[state=active]:bg-cyan-300/15 data-[state=active]:text-cyan-50" value="trace">
                  Debate Trace
                </TabsTrigger>
                <TabsTrigger className="rounded-md px-4 py-2 text-sm data-[state=active]:bg-cyan-300/15 data-[state=active]:text-cyan-50" value="analysis">
                  Explainability
                </TabsTrigger>
                <TabsTrigger className="rounded-md px-4 py-2 text-sm data-[state=active]:bg-cyan-300/15 data-[state=active]:text-cyan-50" value="evidence">
                  Evidence
                </TabsTrigger>
              </TabsList>

              <TabsContent value="trace" className="mt-0 outline-none">
                <div className="grid gap-4 md:grid-cols-2">
                  {debateStages.map((stage) => (
                    <div key={stage.key} className="surface rounded-lg p-5">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-primary">
                          <stage.icon className="h-4 w-4" />
                        </div>
                        <div className="text-sm font-semibold text-slate-950">{stage.label}</div>
                      </div>
                      <p className="text-sm leading-6 text-slate-600">{stage.body || "This stage was bypassed for the current verification."}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="analysis" className="mt-0 outline-none">
                <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
                  <Panel title="Visual Context" icon={ScanSearch}>
                    {result.provenance_signals.has_visual_context ? (
                      <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600 whitespace-pre-wrap">
                        {visualContextText}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                        No visual context was attached.
                      </div>
                    )}
                  </Panel>

                  <Panel title="Token Influence" icon={Fingerprint}>
                    <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                      {result.xai_attributions.length ? result.xai_attributions.map((token, index) => {
                        const score = token.attribution_score || token.score || 0;
                        const alpha = Math.min(Math.abs(score) * 2, 0.85);
                        const backgroundColor = score > 0
                          ? `rgba(220, 38, 38, ${alpha})`
                          : score < 0
                            ? `rgba(5, 150, 105, ${alpha})`
                            : "rgba(226, 232, 240, 0.9)";
                        return (
                          <span
                            key={index}
                            className="rounded-md border border-white/70 px-2 py-1 font-mono text-sm font-semibold"
                            style={{ backgroundColor, color: alpha > 0.35 ? "#fff" : "#475569" }}
                            title={`Influence: ${score.toFixed(4)}`}
                          >
                            {token.word}
                          </span>
                        );
                      }) : (
                        <div className="w-full rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                          Token attribution data is unavailable.
                        </div>
                      )}
                    </div>
                  </Panel>
                </div>
              </TabsContent>

              <TabsContent value="evidence" className="mt-0 outline-none">
                <Panel title="Retrieved Evidence" icon={Database}>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {result.evidence.length ? result.evidence.map((entry, index) => (
                      <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                        <div className="mb-2 font-mono text-xs font-semibold text-primary">E{index + 1}</div>
                        {entry}
                      </div>
                    )) : (
                      <div className="col-span-full rounded-lg border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
                        No retrieval evidence was returned.
                      </div>
                    )}
                  </div>
                </Panel>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
