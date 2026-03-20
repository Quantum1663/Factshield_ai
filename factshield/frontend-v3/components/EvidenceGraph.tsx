"use client";

import { useEffect, useRef } from "react";
import { KnowledgeGraph } from "@/lib/api";

interface EvidenceGraphProps {
  graph: KnowledgeGraph;
}

const NODE_STYLES: Record<string, { background: string; border: string; font: string }> = {
  claim: { background: "#c7d2fe", border: "#4f46e5", font: "#312e81" },
  person: { background: "#fee2e2", border: "#ef4444", font: "#991b1b" },
  org: { background: "#dcfce7", border: "#22c55e", font: "#166534" },
  place: { background: "#dbeafe", border: "#3b82f6", font: "#1d4ed8" },
  topic: { background: "#f3e8ff", border: "#a855f7", font: "#6b21a8" },
  mentions: { background: "#ffffff", border: "#cbd5e1", font: "#334155" },
  supports: { background: "#ecfccb", border: "#84cc16", font: "#3f6212" },
  refutes: { background: "#ffe4e6", border: "#f43f5e", font: "#9f1239" },
};

const EDGE_STYLES: Record<string, { color: string; highlight: string; dashes: boolean }> = {
  mentions: { color: "#94a3b8", highlight: "#475569", dashes: true },
  supports: { color: "#65a30d", highlight: "#3f6212", dashes: false },
  refutes: { color: "#e11d48", highlight: "#9f1239", dashes: false },
};

export function EvidenceGraph({ graph }: EvidenceGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || !graph.nodes.length) {
      return;
    }

    let networkInstance: { destroy: () => void } | null = null;

    const renderGraph = async () => {
      const vis = await import("vis-network/standalone");

      if (!containerRef.current) {
        return;
      }

      const nodes = graph.nodes.map((node) => {
        const style = NODE_STYLES[node.group] || NODE_STYLES.topic;
        const isEvidence = node.kind === "evidence";
        return {
          id: node.id,
          label: node.label,
          shape: isEvidence ? "box" : "dot",
          size: node.size,
          margin: isEvidence ? { top: 10, right: 10, bottom: 10, left: 10 } : undefined,
          widthConstraint: isEvidence ? { maximum: 190 } : undefined,
          color: {
            background: style.background,
            border: style.border,
            highlight: {
              background: style.background,
              border: style.border,
            },
          },
          font: {
            color: style.font,
            size: isEvidence ? 11 : 13,
            face: "Segoe UI",
          },
          title: node.kind === "entity"
            ? `${node.label}\nCluster: ${node.group}\nMentions: ${node.mentions ?? 0}`
            : `${node.kind.toUpperCase()} | ${node.group}${node.confidence !== undefined ? `\nConfidence: ${Math.round(node.confidence * 100)}%` : ""}`,
        };
      });

      const edges = graph.edges.map((edge) => {
        const style = EDGE_STYLES[edge.relation] || EDGE_STYLES.mentions;
        return {
          from: edge.from,
          to: edge.to,
          label: edge.label,
          title: `${edge.relation.toUpperCase()} | weight ${Math.round((edge.weight ?? 0.5) * 100)}%`,
          font: {
            size: 10,
            align: "middle",
            strokeWidth: 0,
            color: style.highlight,
          },
          color: {
            color: style.color,
            highlight: style.highlight,
          },
          dashes: style.dashes,
          width: Math.max(1.5, (edge.weight ?? (edge.relation === "mentions" ? 0.45 : 0.7)) * 4),
          arrows: edge.relation === "mentions" ? undefined : "to",
          smooth: {
            enabled: true,
            type: "dynamic",
            roundness: 0.25,
          },
        };
      });

      networkInstance = new vis.Network(
        containerRef.current,
        { nodes, edges },
        {
          autoResize: true,
          interaction: {
            dragNodes: true,
            dragView: true,
            hover: true,
            zoomView: true,
            navigationButtons: true,
          },
          physics: {
            enabled: true,
            barnesHut: {
              gravitationalConstant: -4200,
              centralGravity: 0.18,
              springLength: 150,
              springConstant: 0.04,
              damping: 0.16,
            },
            stabilization: { iterations: 220 },
          },
          layout: { improvedLayout: true },
          nodes: {
            borderWidth: 1.5,
            shadow: {
              enabled: true,
              color: "rgba(148, 163, 184, 0.18)",
              size: 10,
              x: 0,
              y: 8,
            },
          },
          edges: { shadow: false },
        }
      );
    };

    void renderGraph();

    return () => {
      networkInstance?.destroy();
    };
  }, [graph]);

  if (!graph.nodes.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-xs font-medium text-slate-400">
        No evidence graph available because retrieval returned no supporting context.
      </div>
    );
  }

  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_45%),linear-gradient(180deg,_rgba(255,255,255,0.95),_rgba(248,250,252,0.95))] p-3">
      <div className="mb-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <span>{graph.summary.entity_count} entities</span>
        <span>{graph.summary.evidence_count} evidence nodes</span>
        <span>People {graph.summary.groups.person}</span>
        <span>Orgs {graph.summary.groups.org}</span>
        <span>Places {graph.summary.groups.place}</span>
        <span>Topics {graph.summary.groups.topic}</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700">Refutes</span>
        <span className="rounded-full bg-lime-50 px-2 py-1 text-lime-700">Supports</span>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">Mentions</span>
      </div>
      <div ref={containerRef} className="h-[calc(100%-3.25rem)] w-full rounded-xl" />
    </div>
  );
}
