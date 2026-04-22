"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Zap, Image as ImageIcon, Video, Loader2, Cpu, Brain, Database, Terminal, FileCode, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { submitVerification, verifyImage, verifyVideo, getTaskStatus, VerificationResult } from "@/lib/api";
import { ResultModal } from "./ResultModal";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { cn } from "@/lib/utils";

interface CommandCenterProps {
  initialQuery?: string;
  autoSubmitSignal?: number;
}

export function CommandCenter({ initialQuery = "", autoSubmitSignal = 0 }: CommandCenterProps) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [taskStatus, setTaskStatus] = useState<string>("");
  
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
    setTaskStatus("Initializing Pipeline...");
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

  const handleFileUpload = async (file: File, type: 'image' | 'video') => {
    setLoading(true);
    setResult(null);
    setTaskStatus(`Encoding ${type.toUpperCase()}...`);
    try {
      const { task_id } = type === 'image' ? await verifyImage(file) : await verifyVideo(file);
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

  const steps = [
    { id: "pending", label: "Queueing", icon: Terminal },
    { id: "processing", label: "Neural Analysis", icon: Brain },
    { id: "completed", label: "Synthesis", icon: CheckCircle2 },
  ];

  return (
    <Card className="relative glass border-white/10 rounded-[3rem] overflow-hidden shadow-2xl">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-50" />
      
      <CardContent className="p-10">
        <div className="flex flex-col lg:flex-row gap-10">
            <div className="flex-1 space-y-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                        <Terminal className="w-6 h-6 text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Neural Input Layer</h3>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Ready for multi-agent ingestion</p>
                    </div>
                </div>

                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 rounded-[2rem] blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                    <Textarea 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="PASTE A CLAIM, IMAGE CONTEXT, OR TRANSCRIPT..." 
                        className="relative min-h-[180px] bg-black/40 border-white/5 rounded-[2rem] p-8 text-lg font-medium text-white placeholder:text-white/10 focus:ring-0 focus:border-violet-500/30 transition-all resize-none scrollbar-hide uppercase tracking-tight italic"
                    />
                </div>
                
                <div className="flex flex-wrap items-center gap-4 mt-6">
                    <input type="file" ref={imgRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'image')} />
                    <input type="file" ref={vidRef} className="hidden" accept="video/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'video')} />
                    
                    <Button 
                        variant="outline" 
                        onClick={() => imgRef.current?.click()}
                        className="rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 text-white/60 gap-3 h-12 px-6 transition-all"
                    >
                        <ImageIcon className="w-4 h-4 text-violet-400" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Image Source</span>
                    </Button>
                    
                    <Button 
                        variant="outline" 
                        onClick={() => vidRef.current?.click()}
                        className="rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 text-white/60 gap-3 h-12 px-6 transition-all"
                    >
                        <Video className="w-4 h-4 text-blue-400" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Video Source</span>
                    </Button>

                    <Button 
                        disabled={loading || !query.trim()}
                        onClick={() => void handleTextSubmit()}
                        className="ml-auto rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600 text-white font-black gap-3 h-12 px-10 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all uppercase tracking-widest italic"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-white" />}
                        {loading ? "Analyzing..." : "Analyze Claim"}
                    </Button>
                </div>
            </div>

            <div className="w-full lg:w-[320px] bg-white/5 rounded-[2.5rem] border border-white/5 p-8 flex flex-col justify-between overflow-hidden relative">
                <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12 scale-150">
                    <Brain className="w-32 h-32 text-violet-500" />
                </div>
                
                <div>
                    <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-8">Pipeline Orchestration</h4>
                    <div className="space-y-8 relative">
                        <div className="absolute left-2.5 top-2 bottom-2 w-px bg-white/5" />
                        {steps.map((step, i) => {
                            const isCurrent = (loading && taskStatus.toLowerCase().includes(step.id)) || (step.id === "completed" && result);
                            const isPast = (step.id === "pending" && (loading || result));
                            return (
                                <div key={i} className="flex items-center gap-6 relative">
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 z-10 transition-all duration-500 flex items-center justify-center bg-black",
                                        isCurrent ? "border-violet-500 scale-125 shadow-[0_0_10px_#8b5cf6]" : isPast ? "border-emerald-500 bg-emerald-500/20" : "border-white/10"
                                    )}>
                                        {isPast && !isCurrent && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <step.icon className={cn("w-3.5 h-3.5", isCurrent ? "text-violet-400" : isPast ? "text-emerald-400" : "text-white/10")} />
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-widest",
                                            isCurrent ? "text-white" : isPast ? "text-white/60" : "text-white/10"
                                        )}>{step.label}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-10 p-5 rounded-3xl bg-black/40 border border-white/5">
                    <div className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-3">Live Trace</div>
                    <div className="font-mono text-[10px] text-violet-400/70 space-y-1">
                        <div className="flex gap-2">
                            <span className="text-white/20">#</span>
                            <span className="animate-pulse">{taskStatus || "Waiting for input..."}</span>
                        </div>
                        {loading && (
                            <div className="flex gap-2">
                                <span className="text-white/20">#</span>
                                <span className="text-white/40 italic animate-pulse">Scanning knowledge base...</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </CardContent>

      <ResultModal result={result} onClose={() => setResult(null)} />
    </Card>
  );
}
