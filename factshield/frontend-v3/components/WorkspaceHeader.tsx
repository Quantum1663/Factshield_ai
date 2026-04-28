"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bell, Command, Search, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getNeuralStats, NeuralStats } from "@/lib/api";

const pageMeta: Record<string, { eyebrow: string; title: string; detail: string }> = {
  "/": {
    eyebrow: "Command Center",
    title: "Workspace overview",
    detail: "Verification operations, evidence health, and active response queues.",
  },
  "/feed": {
    eyebrow: "Signal Feed",
    title: "Incoming intelligence",
    detail: "Monitor fresh stories, inspect sources, and escalate high-risk signals.",
  },
  "/trending": {
    eyebrow: "Narratives",
    title: "Narrative watch",
    detail: "Track coordinated themes, pressure points, and response readiness.",
  },
  "/archive": {
    eyebrow: "Evidence Vault",
    title: "Evidence archive",
    detail: "Search indexed records, historical fragments, and retrieval context.",
  },
  "/reports": {
    eyebrow: "Reports",
    title: "Executive briefings",
    detail: "Assemble evidence-backed exports for leadership and policy teams.",
  },
  "/team": {
    eyebrow: "Team",
    title: "Review desk",
    detail: "Coordinate analysts, approvals, and operational ownership.",
  },
  "/architecture": {
    eyebrow: "System",
    title: "Platform architecture",
    detail: "Inspect model stack, retrieval services, and runtime posture.",
  },
  "/settings": {
    eyebrow: "Settings",
    title: "Workspace controls",
    detail: "Manage policies, retention, routing, and access posture.",
  },
};

export function WorkspaceHeader() {
  const pathname = usePathname();
  const [stats, setStats] = useState<NeuralStats | null>(null);
  const [backendUnavailable, setBackendUnavailable] = useState(false);

  useEffect(() => {
    const load = () =>
      getNeuralStats()
        .then((value) => {
          setStats(value);
          setBackendUnavailable(false);
        })
        .catch(() => {
          setStats(null);
          setBackendUnavailable(true);
        });
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, []);

  const meta = useMemo(() => pageMeta[pathname] || pageMeta["/"], [pathname]);
  const online = !backendUnavailable && stats?.retrieval_status !== "degraded" && stats?.retrieval_status !== "unavailable";

  return (
    <section className="mb-6 surface holo-edge rounded-xl px-5 py-4 sm:px-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="section-label">{meta.eyebrow}</div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{meta.title}</h1>
            <Badge className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[11px] font-semibold text-cyan-100">
              Integrity Desk
            </Badge>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{meta.detail}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,240px)_auto_auto] xl:min-w-[580px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              aria-label="Search workspace"
              className="h-11 rounded-lg border-cyan-300/20 bg-black/20 pl-10 text-sm text-slate-950 placeholder:text-slate-500"
              placeholder="Search claims, reports, evidence..."
            />
          </label>

            <div className="flex items-center gap-2 rounded-lg border border-cyan-300/15 bg-black/20 px-3 py-2">
              <span className={cn("status-dot", online ? "bg-emerald-500" : "bg-amber-500")} />
              <div className="text-xs leading-4">
                <div className="font-semibold text-slate-950">{online ? "Workspace healthy" : backendUnavailable ? "Backend unavailable" : "Needs attention"}</div>
                <div className="text-slate-500">{backendUnavailable ? "API not responding" : stats?.retrieval_status || "checking retrieval"}</div>
              </div>
            </div>

          <div className="flex items-center gap-2 justify-self-start sm:justify-self-end">
            <Link
              href="/reports"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 text-sm font-semibold text-slate-700 hover:bg-cyan-300/15"
            >
              <Command className="h-4 w-4 text-primary" />
              New brief
            </Link>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-300/20 bg-black/20 text-slate-600 hover:bg-cyan-300/10"
              aria-label="Alerts"
            >
              <Bell className="h-4 w-4" />
            </button>
            <div className="inline-flex h-11 items-center gap-2 rounded-lg border border-cyan-300/20 bg-black/20 px-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-300/15 text-emerald-100">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="text-xs leading-4">
                <div className="font-semibold text-slate-950">Policy Desk</div>
                <div className="text-slate-500">Admin</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
