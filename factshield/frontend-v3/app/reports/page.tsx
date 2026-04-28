"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, Download, FileText, ShieldCheck, Sparkles, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { downloadReport, getReportDetail, getReports, ReportDetail, ReportRecord, updateReportMetadata } from "@/lib/api";
import { Toast } from "@/components/Toast";

function formatConfidence(value: number | null) {
  if (value === null || Number.isNaN(value)) return "N/A";
  return `${Math.round(value * 100)}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not exported yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [metaForm, setMetaForm] = useState({ title: "", owner: "", audience: "", approval_status: "Draft", reviewer_notes: "", reviewer_name: "" });

  const refreshReports = async (activeId?: string) => {
    const items = await getReports();
    setReports(items);
    const targetId = activeId || items[0]?.id;
    if (targetId) {
      const detail = await getReportDetail(targetId);
      setSelectedReport(detail);
    } else {
      setSelectedReport(null);
    }
  };

  useEffect(() => {
    setLoadingId("initial");
    refreshReports()
      .catch(console.error)
      .finally(() => setLoadingId(null));
  }, []);

  useEffect(() => {
    setMetaForm({
      title: selectedReport?.title || "",
      owner: selectedReport?.owner || "",
      audience: selectedReport?.audience || "",
      approval_status: selectedReport?.approval_status || "Draft",
      reviewer_notes: selectedReport?.reviewer_notes || "",
      reviewer_name: selectedReport?.reviewer_name || "",
    });
  }, [selectedReport]);

  const handleOpen = async (reportId: string) => {
    setLoadingId(reportId);
    try {
      const detail = await getReportDetail(reportId);
      setSelectedReport(detail);
    } finally {
      setLoadingId(null);
    }
  };

  const handleExport = async () => {
    if (!selectedReport) return;
    setExportingId(selectedReport.id);
    try {
      const blob = await downloadReport(selectedReport.id);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `report-${selectedReport.id}.md`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      const refreshed = await getReportDetail(selectedReport.id);
      setSelectedReport(refreshed);
      setReports((current) => current.map((report) => report.id === refreshed.id ? refreshed : report));
      setFeedback(`Export ready. Last exported ${formatDate(refreshed.last_exported_at)}.`);
    } finally {
      setExportingId(null);
    }
  };

  const handleSaveMetadata = async () => {
    if (!selectedReport) return;
    setSavingMeta(true);
    try {
      const updated = await updateReportMetadata(selectedReport.id, metaForm);
      setSelectedReport(updated);
      setReports((current) => current.map((report) => report.id === updated.id ? updated : report));
      setFeedback(`Saved report settings. Approval status is now ${updated.approval_status || "Draft"}.`);
    } finally {
      setSavingMeta(false);
    }
  };

  const summary = useMemo(() => ({
    generated: reports.length,
    averageConfidence: reports.length
      ? Math.round(reports.reduce((sum, report) => sum + (report.confidence || 0), 0) / reports.length * 100)
      : 0,
    evidence: reports.reduce((sum, report) => sum + report.evidence_count, 0),
  }), [reports]);

  return (
    <div className="space-y-6 pb-12">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { label: "Reports generated", value: String(summary.generated), icon: FileText },
            { label: "Average confidence", value: `${summary.averageConfidence}%`, icon: ShieldCheck },
            { label: "Evidence attached", value: String(summary.evidence), icon: BarChart3 },
          ].map((item) => (
            <div key={item.label} className="surface depth-lift rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="section-label">{item.label}</div>
                  <div className="metric-value mt-3">{item.value}</div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-300/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="surface rounded-xl p-5">
          <div className="section-label">Publishing</div>
          <div className="mt-2 text-xl font-semibold text-slate-950">
            {selectedReport ? selectedReport.title : "Select a report"}
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {selectedReport ? selectedReport.summary : "Open a saved report to inspect its evidence summary and export a markdown briefing."}
          </p>
          <div className="mt-4 text-xs font-medium text-slate-500">
            {feedback || `Last exported: ${formatDate(selectedReport?.last_exported_at)}`}
          </div>
          <Button
            onClick={handleExport}
            disabled={!selectedReport || exportingId === selectedReport.id}
            className="mt-5 w-fit rounded-lg bg-primary text-slate-950 hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            {exportingId === selectedReport?.id ? "Exporting..." : "Export"}
          </Button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="surface rounded-xl p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="section-label">Briefing Room</div>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Saved report records</h2>
            </div>
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div className="grid gap-3">
            {reports.length ? reports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => void handleOpen(report.id)}
                className="grid gap-3 rounded-xl border border-cyan-300/15 bg-black/20 p-4 text-left transition-colors hover:border-primary/30 md:grid-cols-[minmax(0,1fr)_120px_120px_120px] md:items-center"
              >
                <div className="min-w-0">
                  <div className="text-base font-semibold text-slate-950">{report.title}</div>
                  <div className="mt-1 text-sm text-slate-500">{report.owner}</div>
                </div>
                <div className="text-sm font-medium text-slate-600">{report.status}</div>
                <div className="text-sm font-medium text-slate-600">{formatConfidence(report.confidence)}</div>
                <div className="text-sm font-medium text-primary">{loadingId === report.id ? "Opening..." : "Open"}</div>
              </button>
            )) : (
              <div className="rounded-xl border border-dashed border-cyan-300/15 bg-black/20 px-4 py-16 text-center text-sm text-slate-500">
                No completed investigations are available for reporting yet.
              </div>
            )}
          </div>
        </section>

        <aside className="surface rounded-xl p-5">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-300/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="text-xl font-semibold text-slate-950">
            {selectedReport ? selectedReport.title : "Report details"}
          </div>
          {selectedReport ? (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-cyan-300/15 bg-black/20 p-3">
                  <div className="section-label">Verdict</div>
                  <div className="mt-2 text-sm font-semibold text-slate-950">{selectedReport.verdict}</div>
                </div>
                <div className="rounded-lg border border-cyan-300/15 bg-black/20 p-3">
                  <div className="section-label">Evidence</div>
                  <div className="mt-2 text-sm font-semibold text-slate-950">{selectedReport.evidence_count}</div>
                </div>
                <div className="rounded-lg border border-cyan-300/15 bg-black/20 p-3 sm:col-span-2">
                  <div className="section-label">Approval</div>
                  <div className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {selectedReport.approval_status || "Draft"}
                  </div>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                <Input
                  value={metaForm.title}
                  onChange={(event) => setMetaForm((current) => ({ ...current, title: event.target.value }))}
                  className="h-10 rounded-lg border-cyan-300/15 bg-black/20"
                  placeholder="Report title"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    value={metaForm.owner}
                    onChange={(event) => setMetaForm((current) => ({ ...current, owner: event.target.value }))}
                    className="h-10 rounded-lg border-cyan-300/15 bg-black/20"
                    placeholder="Owner"
                  />
                  <Input
                    value={metaForm.audience}
                    onChange={(event) => setMetaForm((current) => ({ ...current, audience: event.target.value }))}
                    className="h-10 rounded-lg border-cyan-300/15 bg-black/20"
                    placeholder="Audience"
                  />
                </div>
                <select
                  value={metaForm.approval_status}
                  onChange={(event) => setMetaForm((current) => ({ ...current, approval_status: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-cyan-300/15 bg-black/20 px-3 text-sm text-slate-950"
                >
                  <option value="Draft">Draft</option>
                  <option value="In Review">In Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Published">Published</option>
                </select>
                <Input
                  value={metaForm.reviewer_name}
                  onChange={(event) => setMetaForm((current) => ({ ...current, reviewer_name: event.target.value }))}
                  className="h-10 rounded-lg border-cyan-300/15 bg-black/20"
                  placeholder="Reviewer name"
                />
                <Textarea
                  value={metaForm.reviewer_notes}
                  onChange={(event) => setMetaForm((current) => ({ ...current, reviewer_notes: event.target.value }))}
                  className="min-h-[120px] rounded-lg border-cyan-300/15 bg-black/20"
                  placeholder="Reviewer notes"
                />
                <Button
                  onClick={() => void handleSaveMetadata()}
                  disabled={savingMeta}
                  className="w-fit rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-slate-700 hover:bg-cyan-300/15"
                >
                  {savingMeta ? "Saving..." : "Save Metadata"}
                </Button>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{selectedReport.summary}</p>
              {selectedReport.reviewer_notes && (
                <div className="mt-4 rounded-lg border border-cyan-300/15 bg-black/20 p-4">
                  <div className="section-label">Reviewer Notes</div>
                  <div className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                    {selectedReport.reviewer_name || "Reviewer pending"}{selectedReport.approved_at ? ` · ${formatDate(selectedReport.approved_at)}` : ""}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{selectedReport.reviewer_notes}</p>
                </div>
              )}
              <div className="mt-5 space-y-3">
                {selectedReport.highlights.map((item) => (
                  <div key={item} className="rounded-lg border border-cyan-300/15 bg-black/20 px-4 py-3 text-sm text-slate-600">
                    {item}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-600">Choose a report to inspect its summary and export it.</p>
          )}
        </aside>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          { title: "Executive brief", detail: "Backend-backed records are now derived from saved investigation tasks.", icon: Sparkles },
          { title: "Evidence appendix", detail: "Exports now include live evidence snippets from the verification result.", icon: FileText },
          { title: "Approval routing", detail: "Owners and summaries are attached to each saved report record.", icon: Users },
        ].map((item) => (
          <div key={item.title} className="surface rounded-xl p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-300/10 text-primary">
              <item.icon className="h-5 w-5" />
            </div>
            <div className="text-lg font-semibold text-slate-950">{item.title}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
          </div>
        ))}
      </section>
      <Toast message={feedback} />
    </div>
  );
}
