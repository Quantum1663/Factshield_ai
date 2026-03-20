"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Zap, Image as ImageIcon, Video, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { submitVerification, verifyImage, verifyVideo, getTaskStatus, VerificationResult } from "@/lib/api";
import { ResultModal } from "./ResultModal";
import axios from "axios";

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
    setTaskStatus("Initializing...");
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
    setTaskStatus(`Processing ${type}...`);
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

  return (
    <Card className="border-slate-200/80 shadow-xl shadow-slate-200/30 overflow-hidden bg-white/50 backdrop-blur-sm">
      <CardHeader className="bg-gradient-to-r from-indigo-50/50 via-transparent to-violet-50/50 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-600">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-slate-900">Verification Command Center</CardTitle>
            <CardDescription className="text-xs font-medium text-slate-400">
              Submit text, images, or video for multi-agent neural analysis.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="relative group">
          <Textarea 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Paste a claim, headline, or social media post to verify..." 
            className="min-h-[140px] bg-slate-50/50 border-slate-200 rounded-2xl p-5 text-sm placeholder:text-slate-400 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all resize-none shadow-inner"
          />
          <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-0 group-focus-within:opacity-100 transition-opacity">
            <span className="text-[10px] font-mono text-slate-400 bg-white/80 px-2 py-1 rounded-md border border-slate-100">Press CMD+Enter to verify</span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
          <div className="flex items-center gap-2">
            <input type="file" ref={imgRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'image')} />
            <input type="file" ref={vidRef} className="hidden" accept="video/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'video')} />
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => imgRef.current?.click()}
              className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600 gap-2 h-10 px-4"
            >
              <ImageIcon className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold">Upload Image</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => vidRef.current?.click()}
              className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600 gap-2 h-10 px-4"
            >
              <Video className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold">Upload Video</span>
            </Button>
          </div>

          <Button 
            disabled={loading || !query.trim()}
            onClick={() => void handleTextSubmit()}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-bold gap-2 h-10 px-6 shadow-lg shadow-indigo-200"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {loading ? `Neural Pipeline: ${taskStatus}...` : "Analyze Claim"}
          </Button>
        </div>

        {loading && (
          <div className="mt-6 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Deep Verification Active</span>
                <span className="text-[10px] font-mono text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-100">{taskStatus}</span>
              </div>
              <div className="h-1.5 w-full bg-indigo-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full animate-pulse" style={{ width: '65%' }} />
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <ResultModal result={result} onClose={() => setResult(null)} />
    </Card>
  );
}
