"use client";

import { useEffect, useState } from "react";
import { getNeuralStats, NeuralStats } from "@/lib/api";
import { BadgeCheck, Brain, Cpu, Database, Network, Scale, ScanSearch, Search, Shield, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ArchitecturePage() {
  const [stats, setStats] = useState<NeuralStats | null>(null);

  useEffect(() => {
    getNeuralStats().then(setStats).catch(console.error);
  }, []);

  const pipeline = [
    { step: "01", name: "Multimodal Intake", model: "Vision-language parsing", desc: "Extracts claim text, scene context, and media hints from submitted images or video.", icon: Search },
    { step: "02", name: "Local Classification", model: stats?.local_classifier || "XLM-Roberta", desc: "Performs fast first-pass checks for veracity, toxicity, and risk cues.", icon: Zap },
    { step: "03", name: "Evidence Retrieval", model: stats?.vector_engine || "FAISS + reranker", desc: "Searches the knowledge base and narrows support/refutation candidates.", icon: Network },
    { step: "04", name: "Reasoning Review", model: stats?.reasoner || "Consensus agents", desc: "Compares prosecution, defense, bias, and judge-style reasoning traces.", icon: Brain },
    { step: "05", name: "Provenance", model: "C2PA and source signals", desc: "Surfaces origin, media authenticity, and trust signals when available.", icon: Shield },
  ];

  const telemetry = [
    { label: "Vector Count", value: String(stats?.vector_count ?? 0), detail: "retrieval records", icon: Database },
    { label: "OCR Available", value: stats?.ocr_available ? "Ready" : "Missing", detail: "media text extraction", icon: ScanSearch },
    { label: "Video Support", value: stats?.video_support ? "Enabled" : "Partial", detail: "frame analysis path", icon: BadgeCheck },
    { label: "Reasoner", value: stats?.groq_configured ? "Connected" : "Needs key", detail: "agent synthesis", icon: Scale },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div>
        <div className="section-label">System Design</div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Verification architecture</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          A clearer map of how claims move from intake to retrieval, model judgment, evidence graphing, and provenance checks.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="surface holo-edge rounded-xl p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <div className="section-label">Pipeline</div>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Processing layers</h2>
            </div>
            <Badge className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">{stats?.status || "Unknown"}</Badge>
          </div>

          <div className="space-y-3">
            {pipeline.map((layer) => (
              <div key={layer.step} className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[72px_1fr]">
                <div className="flex items-center gap-3 sm:block">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Layer</div>
                  <div className="mt-1 text-2xl font-semibold text-primary">{layer.step}</div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
                    <layer.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950">{layer.name}</h3>
                      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{layer.model}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{layer.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="surface depth-lift rounded-xl p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <div className="section-label">Telemetry</div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">Runtime state</h2>
              </div>
            </div>
            <div className="space-y-3">
              {telemetry.map((item) => (
                <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">{item.label}</div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">{item.value}</div>
                      <div className="text-sm text-slate-500">{item.detail}</div>
                    </div>
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
