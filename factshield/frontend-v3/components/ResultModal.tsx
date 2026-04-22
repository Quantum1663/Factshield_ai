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
  Zap,
  Globe,
  Database,
  History,
  CheckCircle2,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
  }
  if (["fake", "misleading", "suspicious", "hate", "refutes"].includes(key)) {
    return "border-rose-500/20 bg-rose-500/10 text-rose-400";
  }
  return "border-white/10 bg-white/5 text-white/60";
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
    <section className={cn("rounded-[2.5rem] glass p-8 group", className)}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/5 text-violet-400 group-hover:scale-110 transition-transform duration-500">
            <Icon className="h-6 w-6" />
          </div>
          <div>
             <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/90">{title}</h3>
             <div className="h-0.5 w-6 bg-violet-500/30 mt-1 rounded-full group-hover:w-12 transition-all duration-500" />
          </div>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function StatTile({ label, value, icon: Icon }: { label: string; value: string, icon?: any }) {
  return (
    <div className="rounded-2xl bg-black/40 border border-white/5 px-5 py-4 flex items-center justify-between group/tile">
      <div>
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 mb-1">{label}</div>
        <div className="text-md font-black text-white">{value}</div>
      </div>
      {Icon && <Icon className="w-4 h-4 text-white/10 group-hover/tile:text-violet-500/40 transition-colors" />}
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
    result.veracity.confidence !== null ? `${Math.round(result.veracity.confidence * 100)}%` : "Neural-only";
  const toxicityConfidence =
    result.toxicity.confidence !== null ? `${Math.round(result.toxicity.confidence * 100)}%` : "Neural-only";

  const debateStages = [
    {
      key: "bias_analyst",
      label: "Bias Analyst",
      icon: AlertTriangle,
      body: result.debate_trace.bias_analyst,
      tone: "border-amber-500/20 bg-amber-500/5 text-amber-200/70",
    },
    {
      key: "prosecutor",
      label: "Prosecutor",
      icon: ShieldAlert,
      body: result.debate_trace.prosecutor,
      tone: "border-rose-500/20 bg-rose-500/5 text-rose-200/70",
    },
    {
      key: "defense",
      label: "Defense",
      icon: ShieldCheck,
      body: result.debate_trace.defense,
      tone: "border-emerald-500/20 bg-emerald-500/5 text-emerald-200/70",
    },
    {
      key: "judge",
      label: "Judge",
      icon: Gavel,
      body: result.debate_trace.judge,
      tone: "border-violet-500/20 bg-violet-500/5 text-violet-200/70",
    },
  ];

  return (
    <Dialog open={!!result} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[96vh] w-[min(98vw,116rem)] max-w-none overflow-hidden rounded-[3rem] border-white/10 bg-black p-0 shadow-2xl">
        <div className="grid max-h-[96vh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-mesh">
          <div className="relative overflow-hidden border-b border-white/5 px-10 py-10 md:px-12 md:py-12 bg-black/40 backdrop-blur-3xl">
            <button 
                onClick={onClose}
                className="absolute top-8 right-8 w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors z-50"
            >
                <X className="w-5 h-5 text-white/40" />
            </button>

            <div className="mb-6 flex flex-wrap items-center gap-3 pr-12">
              <Badge variant="outline" className="rounded-full border-white/10 bg-white/5 px-4 py-1 text-[10px] font-black tracking-[0.18em] text-white/60">
                {result.verdict.toUpperCase()}
              </Badge>
              <Badge className={cn("rounded-full border px-4 py-1 text-[10px] font-black tracking-[0.18em] shadow-lg", getStatusColor(result.veracity.prediction))}>
                {result.veracity.prediction.toUpperCase()} | {veracityConfidence}
              </Badge>
              <Badge className={cn("rounded-full border px-4 py-1 text-[10px] font-black tracking-[0.18em] shadow-lg", getStatusColor(result.toxicity.prediction))}>
                TOXICITY: {result.toxicity.prediction.toUpperCase()} | {toxicityConfidence}
              </Badge>
              {result.c2pa_verification?.is_verified && (
                <Badge className="rounded-full border border-sky-500/20 bg-sky-500/10 px-4 py-1 text-[10px] font-black tracking-[0.18em] text-sky-400">
                  <Fingerprint className="mr-1 inline h-3 w-3" />
                  C2PA VERIFIED
                </Badge>
              )}
              {isFallback && (
                <Badge className="rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1 text-[10px] font-black tracking-[0.18em] text-amber-400 uppercase italic">
                  Fallback Active
                </Badge>
              )}
            </div>

            <DialogTitle className="max-w-6xl text-[2.5rem] font-black leading-tight tracking-tighter text-white md:text-[3.2rem]">
              {displayClaim}
            </DialogTitle>

            <p className="mt-6 max-w-5xl text-lg leading-relaxed text-white/50 font-medium">
              {result.generated_reason || "Verification synthesis complete. No textual summary was generated."}
            </p>
          </div>

          <div
            ref={scrollRef}
            className="overflow-y-auto overscroll-contain px-10 py-10 md:px-12 md:py-12 scrollbar-hide"
            onScroll={(event) => setIsCondensed(event.currentTarget.scrollTop > 56)}
          >
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.68fr)]">
              <Panel
                title="Neural Correlation Graph"
                icon={Network}
                className="xl:row-span-2"
                aside={
                  <button
                    type="button"
                    onClick={() => setIsGraphWorkspaceOpen(true)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/5 bg-white/5 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all"
                  >
                    <Maximize2 className="h-4 w-4" />
                    Full Workspace
                  </button>
                }
              >
                <div className="rounded-[2rem] bg-black/40 border border-white/5 p-4 relative">
                  <div className="absolute top-4 right-4 z-10 flex gap-2">
                     <Badge className="bg-black/60 backdrop-blur-md border-white/5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5">{result.knowledge_graph.nodes.length} Nodes</Badge>
                  </div>
                  <div className="h-[40rem] md:h-[50rem] xl:h-[60rem]">
                    <EvidenceGraph graph={result.knowledge_graph} />
                  </div>
                </div>
              </Panel>

              <div className="space-y-6">
                <Panel title="Analysis Matrix" icon={Brain}>
                  <div className="grid gap-3">
                    <StatTile label="Final Verdict" value={result.verdict} icon={CheckCircle2} />
                    <StatTile label="Neural Memory" value={String(result.evidence.length)} icon={Database} />
                    <StatTile label="Ingestion Mode" value={result.provenance_signals.source_mode.toUpperCase()} icon={Globe} />
                  </div>

                  <div className="mt-6 p-6 rounded-3xl bg-violet-500/5 border border-violet-500/10 relative overflow-hidden group/anatomy">
                    <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12 group-hover/anatomy:scale-110 transition-transform duration-700">
                        <Zap className="w-20 h-20 text-violet-500" />
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400 mb-3">Manipulation Anatomy</div>
                    <p className="text-sm leading-relaxed text-white/70 italic font-medium">{result.propaganda_anatomy}</p>
                  </div>
                </Panel>

                <Panel title="Heuristics & Fallacies" icon={ShieldAlert}>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {result.detected_fallacies.length ? (
                      result.detected_fallacies.map((fallacy, index) => (
                        <Badge key={index} className="rounded-full border-amber-500/20 bg-amber-500/10 px-4 py-1 text-[10px] font-black tracking-widest text-amber-400">
                          {fallacy}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-[11px] font-bold text-white/20 uppercase tracking-widest">No structural fallacies detected.</span>
                    )}
                  </div>

                  <div className="p-5 rounded-3xl bg-white/5 border border-white/5">
                      <div className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-4">Evidence Citations</div>
                      <div className="flex flex-wrap gap-2">
                        {result.evidence_citations.map((citation, index) => (
                          <Badge key={index} variant="outline" className="rounded-xl border-white/5 bg-black/40 px-3 py-1.5 text-[10px] font-black tracking-tight text-white/70">
                            <span className="text-violet-400 mr-2 font-mono">E{citation.index + 1}</span>
                            <span className="uppercase opacity-50 mr-2">{citation.relation}</span>
                            <span className="text-white font-mono">{Math.round(citation.confidence * 100)}%</span>
                          </Badge>
                        ))}
                      </div>
                  </div>
                </Panel>
              </div>
            </div>

            <div className="mt-8">
              <Tabs defaultValue="trace" className="space-y-8">
                <TabsList className="h-auto rounded-3xl bg-white/5 p-1.5 border border-white/5">
                  <TabsTrigger className="rounded-2xl px-8 py-3 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-all" value="trace">
                    Debate Trace
                  </TabsTrigger>
                  <TabsTrigger className="rounded-2xl px-8 py-3 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-all" value="analysis">
                    Explainability
                  </TabsTrigger>
                  <TabsTrigger className="rounded-2xl px-8 py-3 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-all" value="evidence">
                    Source Memory
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="trace" className="mt-0 outline-none">
                  <div className="grid gap-6 md:grid-cols-2">
                    {debateStages.map((stage) => (
                      <motion.div 
                        key={stage.key} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("rounded-[2.5rem] border p-8 backdrop-blur-md relative overflow-hidden group/stage", stage.tone)}
                      >
                         <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12 scale-150 group-hover/stage:scale-110 transition-transform duration-700">
                             <stage.icon className="w-24 h-24" />
                         </div>
                        <div className="mb-6 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <stage.icon className="h-5 w-5" />
                          </div>
                          <div className="text-[11px] font-black uppercase tracking-[0.2em]">{stage.label}</div>
                        </div>
                        <p className="text-[15px] leading-relaxed font-medium">
                          {stage.body || "Neural agent was bypassed for this verification stage."}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="analysis" className="mt-0 outline-none">
                  <div className="grid gap-8 xl:grid-cols-3">
                    <Panel title="Visual Context" icon={ScanSearch}>
                        <div className="space-y-6">
                            <div className="p-5 rounded-3xl bg-black/40 border border-white/5">
                                <div className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-2">Multimodal Sensor Read</div>
                                <div className="text-lg font-black text-white">
                                    {result.provenance_signals.has_visual_context ? "Optical Context Active" : "Direct Semantic Flow"}
                                </div>
                            </div>
                            {result.provenance_signals.has_visual_context ? (
                                <div className="max-h-96 overflow-y-auto rounded-3xl border border-white/5 bg-black/20 p-6 text-[15px] leading-relaxed italic font-medium whitespace-pre-wrap text-white/60 scrollbar-hide">
                                    {visualContextText}
                                </div>
                            ) : (
                                <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-[2rem] text-white/10 text-xs font-black uppercase tracking-widest">No Visual Assets Found</div>
                            )}
                        </div>
                    </Panel>

                    <Panel title="Mechanistic Heatmap" icon={Fingerprint} className="xl:col-span-2">
                      <div className="flex flex-wrap gap-2 rounded-[2rem] bg-black/40 border border-white/5 p-8">
                        {result.xai_attributions.length ? (
                          result.xai_attributions.map((token, index) => {
                            const score = token.attribution_score || token.score || 0;
                            const alpha = Math.min(Math.abs(score) * 2, 0.9);
                            const backgroundColor =
                              score > 0
                                ? `rgba(244, 63, 94, ${alpha})`
                                : score < 0
                                  ? `rgba(16, 185, 129, ${alpha})`
                                  : "rgba(255,255,255,0.03)";

                            return (
                              <motion.span
                                key={index}
                                whileHover={{ scale: 1.1, zIndex: 10 }}
                                className="cursor-help rounded-lg px-2.5 py-1 font-mono text-[14px] font-black border border-white/5"
                                style={{ backgroundColor, color: alpha > 0.4 ? "#fff" : "rgba(255,255,255,0.3)" }}
                                title={`Influence: ${score.toFixed(4)}`}
                              >
                                {token.word}
                              </motion.span>
                            );
                          })
                        ) : (
                          <div className="py-12 w-full text-center border-2 border-dashed border-white/5 rounded-[2rem] text-white/10 text-xs font-black uppercase tracking-widest">Heatmap Data Unavailable</div>
                        )}
                      </div>
                      <div className="mt-6 flex items-center justify-between px-2">
                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-white/20">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded bg-rose-500" />
                                <span>Refutes</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded bg-emerald-500" />
                                <span>Supports</span>
                            </div>
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Token Occlusion Method</div>
                      </div>
                    </Panel>
                  </div>
                </TabsContent>

                <TabsContent value="evidence" className="mt-0 outline-none">
                  <Panel
                    title="Knowledge Ingestion"
                    icon={Database}
                    aside={<span className="text-[11px] font-black uppercase tracking-widest text-white/20">{result.evidence.length} Latent Artifacts</span>}
                  >
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {result.evidence.length ? (
                        result.evidence.map((entry, index) => (
                          <div key={index} className="rounded-3xl border border-white/5 bg-black/40 p-6 text-[14px] leading-relaxed text-white/50 font-medium">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-5 h-5 rounded bg-violet-500/10 flex items-center justify-center text-violet-400 font-mono text-[10px] font-black">{index + 1}</div>
                                <div className="h-px flex-1 bg-white/5" />
                            </div>
                            {entry}
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-[3rem] text-white/10 text-sm font-black uppercase tracking-widest">No Trace Found in Index</div>
                      )}
                    </div>
                  </Panel>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
