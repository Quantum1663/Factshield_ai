"use client";

import { useEffect, useState } from "react";
import { getTrending, TrendingItem } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Activity, Share2, BarChart3, AlertTriangle, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function TrendingPage() {
  const [trending, setTrending] = useState<TrendingItem[]>([]);

  useEffect(() => {
    getTrending().then(setTrending).catch(console.error);
  }, []);

  return (
    <div className="space-y-12 pb-20">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-end justify-between"
      >
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">Trending Narratives</h1>
          <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">High-impact misinformation patterns detected in news-graph</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 rounded-2xl border border-red-500/20">
            <Activity className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Tracking Active</span>
        </div>
      </motion.div>

      <div className="space-y-6">
        {trending.length > 0 ? trending.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="glass border-white/5 hover:border-red-500/30 transition-all duration-500 group overflow-hidden rounded-[3rem]">
                <CardContent className="p-0 flex">
                <div className="w-3 bg-gradient-to-b from-red-600 to-red-900 flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="p-10 flex-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12 scale-150 group-hover:scale-125 transition-transform duration-1000">
                        <AlertTriangle className="w-32 h-32 text-red-500" />
                    </div>

                    <div className="flex items-center gap-4 mb-6 relative">
                    <Badge className="bg-red-500/10 text-red-400 border-red-500/20 px-4 py-1 font-black text-[10px] uppercase tracking-widest rounded-xl">
                        {t.tag || "MALICIOUS"}
                    </Badge>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="text-[10px] font-black text-white/30 font-mono uppercase tracking-[0.2em] flex items-center gap-2">
                        Impact Magnitude: <span className="text-red-400 text-glow">{t.impact || "High"}</span>
                    </span>
                    </div>

                    <h3 className="text-2xl font-black text-white leading-tight mb-4 group-hover:text-red-400 transition-colors relative">
                    {t.title}
                    </h3>
                    <p className="text-sm text-white/50 font-medium leading-relaxed max-w-4xl mb-8 relative">
                    {t.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-8 pt-8 border-t border-white/5 relative">
                    <div className="flex items-center gap-3 group/stat">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover/stat:border-violet-500/20 transition-colors">
                            <BarChart3 className="w-4 h-4 text-white/20 group-hover/stat:text-violet-400 transition-colors" />
                        </div>
                        <div>
                            <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">Resonance</div>
                            <div className="text-[11px] font-black text-white/70 uppercase">4.2k nodes</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 group/stat">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover/stat:border-red-500/20 transition-colors">
                            <Share2 className="w-4 h-4 text-white/20 group-hover/stat:text-red-400 transition-colors" />
                        </div>
                        <div>
                            <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">Velocity</div>
                            <div className="text-[11px] font-black text-white/70 uppercase">12 posts / min</div>
                        </div>
                    </div>
                    <div className="ml-auto">
                        <div className="flex items-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-widest italic group-hover:text-red-400/50 transition-colors">
                            <Zap className="w-3 h-3" />
                            Counter-narrative suggested
                        </div>
                    </div>
                    </div>
                </div>
                </CardContent>
            </Card>
          </motion.div>
        )) : (
          <div className="py-48 text-center glass rounded-[3rem] border-dashed border-white/5 border-2">
            <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto text-white/10 mb-6">
              <TrendingUp className="w-10 h-10" />
            </div>
            <div className="text-white/20 font-black uppercase text-sm tracking-[0.3em] italic">Identifying Propaganda Clusters...</div>
          </div>
        )}
      </div>
    </div>
  );
}
