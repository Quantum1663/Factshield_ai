"use client";

import { useEffect, useState } from "react";
import { getNeuralStats, NeuralStats } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Cpu, Zap, Search, Network, Brain, Activity, Shield, ScanSearch, Scale, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ArchitecturePage() {
  const [stats, setStats] = useState<NeuralStats | null>(null);

  useEffect(() => {
    getNeuralStats().then(setStats).catch(console.error);
  }, []);

  const pipeline = [
    { 
      step: "01", 
      name: "Multimodal Intake", 
      model: "VLM (Llama 3.2 Vision)", 
      desc: "Vision-Language analysis replaces Tesseract OCR. Extracts semantic context and metadata from images/videos.",
      color: "from-blue-500 to-indigo-500",
      icon: Search
    },
    { 
      step: "02", 
      name: "Neural Classification", 
      model: "XLM-Roberta (Local)", 
      desc: "Fast, multi-label classification for initial veracity and toxicity screening.",
      color: "from-indigo-500 to-violet-500",
      icon: Zap
    },
    { 
      step: "03", 
      name: "RAG Evidence retrieval", 
      model: "FAISS L2-Flat + Cross-Encoder", 
      desc: "Semantic search across 1.2M truth-nodes followed by intensive reranking.",
      color: "from-violet-500 to-purple-500",
      icon: Network
    },
    { 
      step: "04", 
      name: "Multi-Agent Consensus", 
      model: "Llama 3.3 Agent-Pool", 
      desc: "Consensus-based reasoning involving Bias Analysts, Prosecutors, and Defense agents.",
      color: "from-purple-500 to-fuchsia-500",
      icon: Brain
    },
    { 
      step: "05", 
      name: "Trust & Verifiability", 
      model: "C2PA Provenance Engine", 
      desc: "Cryptographic signature verification establish Proof-of-Trust for incoming media.",
      color: "from-fuchsia-500 to-pink-500",
      icon: Shield
    }
  ];

  const capabilities = [
    {
      label: "Vision-Language Intake",
      value: stats?.groq_configured ? "Enabled" : "Needs API Key",
      detail: "Image analysis uses VLM context extraction instead of plain OCR-only flow.",
      icon: ScanSearch,
    },
    {
      label: "Multi-Agent Consensus",
      value: stats?.reasoner || "Unavailable",
      detail: "Bias analyst, prosecutor, defense, and judge stages drive the verdict pipeline.",
      icon: Scale,
    },
    {
      label: "C2PA Provenance",
      value: stats?.video_support ? "Media-ready" : "Partial",
      detail: "Frontend now surfaces provenance checks returned for image and video verification.",
      icon: BadgeCheck,
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">System Architecture</h1>
        <p className="text-slate-500 font-medium mt-1">SAMI neural pipeline topology and active layer telemetry.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Cpu className="w-4 h-4" /> Neural Pipeline Layers
          </h2>
          {pipeline.map((l, i) => (
            <Card key={i} className="border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group relative overflow-hidden bg-white">
              <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
                <l.icon className="w-16 h-16 text-indigo-600" />
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`text-[10px] font-black text-white px-2.5 py-1 rounded-full bg-gradient-to-r ${l.color} shadow-sm uppercase tracking-tighter`}>
                    Layer {l.step}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-widest">{l.model}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5 group-hover:text-indigo-600 transition-colors">{l.name}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-lg">{l.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500 opacity-20 blur-3xl" />
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-violet-500 opacity-20 blur-3xl" />
            
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> Runtime Telemetry
            </h3>
            
            <div className="space-y-8 relative z-10">
              {[
                {
                  label: "Classifier State",
                  val: stats?.local_classifier || "Unavailable",
                  pct: stats?.status === "Optimal" ? 18 : 52,
                  color: "from-emerald-400 to-emerald-500",
                },
                {
                  label: "Vector Store",
                  val: `${stats?.vector_count ?? 0} vectors`,
                  pct: Math.min(90, Math.max(10, Math.round(((stats?.vector_count ?? 0) / 1000) * 100))),
                  color: "from-indigo-400 to-indigo-500",
                },
                {
                  label: "Vision / OCR Readiness",
                  val: stats?.ocr_available ? "Ready" : "OCR missing",
                  pct: stats?.ocr_available ? 76 : 28,
                  color: "from-violet-400 to-violet-500",
                },
                {
                  label: "Reasoner Access",
                  val: stats?.groq_configured ? "Connected" : "Missing key",
                  pct: stats?.groq_configured ? 88 : 22,
                  color: "from-pink-400 to-pink-500",
                }
              ].map((m, i) => (
                <div key={i}>
                  <div className="flex justify-between items-end mb-2.5">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">{m.label}</span>
                    <span className="text-xs font-black text-white font-mono">{m.val}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div className={`h-full rounded-full bg-gradient-to-r ${m.color}`} style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Cluster Nodes</span>
              </div>
              <div className="text-sm font-black text-white tracking-tight">{stats?.status === "Optimal" ? "SAMI-AI-PRODUCTION-US-EAST" : "SAMI-AI-DEGRADED-MODE"}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="border-slate-200/60 shadow-sm bg-white">
              <CardContent className="p-5">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reasoner</div>
                <div className="text-sm font-bold text-slate-900">{stats?.reasoner || "Llama 3.3 70B"}</div>
              </CardContent>
            </Card>
            <Card className="border-slate-200/60 shadow-sm bg-white">
              <CardContent className="p-5">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</div>
                <div className="text-sm font-bold text-emerald-600 uppercase">{stats?.status || "Unknown"}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {capabilities.map((capability, index) => (
              <Card key={index} className="border-slate-200/60 shadow-sm bg-white">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <capability.icon className="h-4 w-4 text-indigo-600" />
                      <div className="text-sm font-bold text-slate-900">{capability.label}</div>
                    </div>
                    <Badge variant="outline" className="border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {capability.value}
                    </Badge>
                  </div>
                  <p className="text-xs font-medium leading-relaxed text-slate-500">{capability.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
