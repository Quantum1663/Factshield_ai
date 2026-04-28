"use client";

import { CheckCircle2 } from "lucide-react";

interface ToastProps {
  message: string;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[90] max-w-sm rounded-xl border border-cyan-300/20 bg-slate-950/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="text-sm font-medium text-slate-950">{message}</div>
      </div>
    </div>
  );
}
