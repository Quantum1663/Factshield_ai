"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { KnowledgeGraph, KnowledgeGraphEdge } from "@/lib/api";

interface EvidenceGraphProps {
  graph: KnowledgeGraph;
}

type GraphDetails =
  | { kind: "node"; title: string; body: string }
  | { kind: "edge"; title: string; body: string }
  | null;

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

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

export function EvidenceGraph({ graph }: EvidenceGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [details, setDetails] = useState<GraphDetails>(null);

  const filteredGraph = useMemo(() => {
    const claimNode = graph.nodes.find((node) => node.kind === "claim");
    const entityNodes = graph.nodes
      .filter((node) => node.kind === "entity")
      .sort((a, b) => (b.mentions ?? 0) - (a.mentions ?? 0))
      .slice(0, 6);
    const evidenceNodes = graph.nodes.filter((node) => node.kind === "evidence").slice(0, 3);

    const allowedNodeIds = new Set([
      claimNode?.id,
      ...entityNodes.map((node) => node.id),
      ...evidenceNodes.map((node) => node.id),
    ]);

    const nodes = graph.nodes.filter((node) => allowedNodeIds.has(node.id));
    const edges = graph.edges.filter((edge) => allowedNodeIds.has(edge.from) && allowedNodeIds.has(edge.to));

    return { nodes, edges };
  }, [graph]);

  useEffect(() => {
    if (!containerRef.current || !filteredGraph.nodes.length) {
      return;
    }

    let networkInstance: { destroy: () => void; on: (event: string, cb: (params?: { nodes?: string[]; edges?: string[] }) => void) => void } | null = null;

    const renderGraph = async () => {
      const vis = await import("vis-network/standalone");

      if (!containerRef.current) {
        return;
      }

      const nodeById = new Map(filteredGraph.nodes.map((node) => [node.id, node]));
      const edgeById = new Map<string, KnowledgeGraphEdge>();

      const nodes = filteredGraph.nodes.map((node) => {
        const style = NODE_STYLES[node.group] || NODE_STYLES.topic;
        const isEvidence = node.kind === "evidence";
        return {
          id: node.id,
          label: isEvidence ? truncate(node.label, 56) : node.label,
          shape: isEvidence ? "box" : "dot",
          size: isEvidence ? 20 : node.size,
          margin: isEvidence ? { top: 12, right: 12, bottom: 12, left: 12 } : undefined,
          widthConstraint: isEvidence ? { maximum: 220 } : undefined,
          color: {
            background: style.background,
            border: style.border,
            highlight: { background: style.background, border: style.border },
          },
          font: {
            color: style.font,
            size: isEvidence ? 13 : 15,
            face: "Segoe UI",
            multi: "html",
          },
        };
      });

      const edges = filteredGraph.edges.map((edge, index) => {
        const style = EDGE_STYLES[edge.relation] || EDGE_STYLES.mentions;
        const edgeId = `edge-${index}`;
        edgeById.set(edgeId, edge);
        return {
          id: edgeId,
          from: edge.from,
          to: edge.to,
          label: edge.label.toUpperCase(),
          font: {
            size: 11,
            align: "top",
            strokeWidth: 3,
            strokeColor: "#ffffff",
            color: style.highlight,
            bold: {
              color: style.highlight,
            },
          },
          color: {
            color: style.color,
            highlight: style.highlight,
          },
          dashes: style.dashes,
          width: Math.max(2, (edge.weight ?? 0.5) * 6),
          arrows: edge.relation === "mentions" ? undefined : "to",
          smooth: false,
        };
      });

      const createdNetwork = new vis.Network(
        containerRef.current,
        { nodes, edges },
        {
          autoResize: true,
          interaction: {
            dragNodes: false,
            dragView: true,
            hover: true,
            zoomView: true,
            navigationButtons: true,
          },
          physics: false,
          layout: {
            hierarchical: {
              enabled: true,
              direction: "LR",
              sortMethod: "directed",
              levelSeparation: 180,
              nodeSpacing: 170,
              treeSpacing: 220,
            },
          },
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

      networkInstance = createdNetwork as typeof networkInstance;

      createdNetwork.on("click", (params) => {
        const selectedNodeId = params.nodes?.[0];
        const selectedEdgeId = params.edges?.[0];

        if (selectedNodeId) {
          const node = nodeById.get(selectedNodeId);
          if (node) {
            setDetails({
              kind: "node",
              title: `${node.kind.toUpperCase()} | ${node.group}`,
              body: node.label,
            });
            return;
          }
        }

        if (selectedEdgeId) {
          const edge = edgeById.get(selectedEdgeId);
          if (edge) {
            setDetails({
              kind: "edge",
              title: `${edge.relation.toUpperCase()} | ${Math.round((edge.weight ?? 0.5) * 100)}%`,
              body: `${edge.from} -> ${edge.to}`,
            });
            return;
          }
        }

        setDetails(null);
      });
    };

    void renderGraph();

    return () => {
      networkInstance?.destroy();
    };
  }, [filteredGraph]);

  if (!filteredGraph.nodes.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-xs font-medium text-slate-400">
        No evidence graph available because retrieval returned no supporting context.
      </div>
    );
  }

  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_45%),linear-gradient(180deg,_rgba(255,255,255,0.95),_rgba(248,250,252,0.95))] p-3">
      <div className="mb-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <span>{graph.summary.entity_count} entities detected</span>
        <span>Showing top 6 entities</span>
        <span>{graph.summary.evidence_count} evidence nodes</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700">Refutes edge</span>
        <span className="rounded-full bg-lime-50 px-2 py-1 text-lime-700">Supports edge</span>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">Mentions edge</span>
        <span className="rounded-full bg-red-50 px-2 py-1 text-red-700">Person</span>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Org</span>
        <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">Place</span>
        <span className="rounded-full bg-fuchsia-50 px-2 py-1 text-fuchsia-700">Topic</span>
      </div>
      <div ref={containerRef} className="h-[320px] w-full rounded-xl" />
      <div className="mt-3 rounded-xl border border-slate-200 bg-white/80 p-3">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selected Detail</div>
        {details ? (
          <>
            <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-700">{details.title}</div>
            <div className="mt-1 text-sm leading-relaxed text-slate-600">{details.body}</div>
          </>
        ) : (
          <div className="mt-1 text-sm text-slate-500">
            Read left to right: claim {"->"} entities {"->"} evidence. Click any node or edge to inspect it.
          </div>
        )}
      </div>
    </div>
  );
}
