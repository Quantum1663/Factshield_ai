"use client";

import { useEffect, useState } from "react";
import { getTrending, TrendingItem } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Activity, Share2, BarChart3 } from "lucide-react";

export default function TrendingPage() {
  const [trending, setTrending] = useState<TrendingItem[]>([]);

  useEffect(() => {
    getTrending().then(setTrending).catch(console.error);
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Trending Narratives</h1>
          <p className="text-slate-500 font-medium mt-1">High-impact misinformation patterns currently circulating through the news-graph.</p>
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-3 h-7 flex items-center gap-1.5 font-bold uppercase tracking-widest text-[10px]">
            <Activity className="w-3 h-3" /> Real-time Tracking Active
          </Badge>
        </div>
      </div>

      <div className="space-y-5">
        {trending.length > 0 ? trending.map((t, i) => (
          <Card key={i} className="border-slate-200/60 shadow-md hover:shadow-xl hover:border-red-200 transition-all group overflow-hidden bg-white">
            <CardContent className="p-0 flex">
              <div className="w-2 bg-red-600 flex-shrink-0" />
              <div className="p-8 flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <Badge className="bg-red-50 text-red-700 border-none px-3 py-1 font-black text-[10px] uppercase tracking-tighter rounded-lg">
                    {t.tag || "FAKE"}
                  </Badge>
                  <span className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest flex items-center gap-1.5">
                    Impact Magnitude: <span className="text-red-600">{t.impact || "High"}</span>
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 leading-snug mb-3 group-hover:text-red-600 transition-colors">
                  {t.title}
                </h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-4xl mb-6">
                  {t.description}
                </p>
                <div className="flex items-center gap-6 pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-600 uppercase">Resonance: 4.2k nodes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-600 uppercase">Velocity: 12 posts/min</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="py-40 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-200">
              <TrendingUp className="w-10 h-10" />
            </div>
            <div className="text-slate-400 font-bold uppercase text-xs tracking-widest">Identifying Propaganda Clusters...</div>
          </div>
        )}
      </div>
    </div>
  );
}
