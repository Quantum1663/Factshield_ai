"use client";

import { useEffect, useState } from "react";
import { Bell, Database, Gauge, KeyRound, LockKeyhole, Route, Settings, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSettingsWorkspace, SettingControl, SettingsWorkspace, updateWorkspaceSetting } from "@/lib/api";
import { Toast } from "@/components/Toast";

const iconMap = {
  "API Access": KeyRound,
  "Evidence Retention": Database,
  "Alert Routing": Bell,
  "Compliance Mode": LockKeyhole,
} as const;

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState<SettingsWorkspace | null>(null);
  const [selectedControl, setSelectedControl] = useState<SettingControl | null>(null);
  const [editForm, setEditForm] = useState({ value: "", status: "", detail: "" });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    getSettingsWorkspace()
      .then((data) => {
        setWorkspace(data);
        setSelectedControl(data.controls[0] || null);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setEditForm({
      value: selectedControl?.value || "",
      status: selectedControl?.status || "active",
      detail: selectedControl?.detail || "",
    });
  }, [selectedControl]);

  const summary = workspace?.summary;

  const handleSave = async () => {
    if (!selectedControl) return;
    setSaving(true);
    try {
      const updatedControl = await updateWorkspaceSetting(selectedControl.id, editForm);
      setSelectedControl(updatedControl);
      setWorkspace((current) => current ? {
        ...current,
        controls: current.controls.map((control) => control.id === updatedControl.id ? updatedControl : control),
      } : current);
      setFeedback(`Saved ${updatedControl.title}. Status is now ${updatedControl.status}.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Control sets", value: String(summary?.control_sets ?? 0), icon: Settings, detail: "Workspace policies and toggles" },
          { label: "Alert routes", value: String(summary?.alert_routes ?? 0), icon: Route, detail: "Escalation destinations" },
          { label: "Runtime profile", value: summary?.runtime_profile ?? "Loading", icon: Gauge, detail: "Enterprise operating mode" },
        ].map((item) => (
          <div key={item.label} className="surface depth-lift rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="section-label">{item.label}</div>
                <div className="metric-value mt-3">{item.value}</div>
                <div className="mt-1 text-sm text-slate-500">{item.detail}</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-300/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="grid gap-4 md:grid-cols-2">
          {workspace?.controls.map((item) => {
            const Icon = iconMap[item.title as keyof typeof iconMap] || Settings;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedControl(item)}
                className="surface depth-lift rounded-xl p-5 text-left transition-colors hover:border-primary/30"
              >
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-300/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-lg font-semibold text-slate-950">{item.title}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                <div className="mt-4 text-sm font-semibold text-primary">{item.value}</div>
                <div className="mt-5 h-2 rounded-full bg-cyan-300/10">
                  <div className="h-full w-2/3 rounded-full bg-primary" />
                </div>
              </button>
            );
          })}
        </section>

        <aside className="space-y-4">
          <div className="surface holo-edge rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-300/15 text-emerald-100">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="section-label">Plan</div>
                <div className="text-xl font-semibold text-slate-950">{workspace?.plan.name || "Loading"}</div>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {workspace?.plan.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          <div className="surface rounded-xl p-5">
            <div className="mb-3 flex items-center gap-2 section-label">
              <Settings className="h-4 w-4" />
              Selected Control
            </div>
            {selectedControl ? (
              <div className="space-y-3 text-sm text-slate-600">
                <div className="text-lg font-semibold text-slate-950">{selectedControl.title}</div>
                <Textarea
                  value={editForm.detail}
                  onChange={(event) => setEditForm((current) => ({ ...current, detail: event.target.value }))}
                  className="min-h-[110px] rounded-lg border-cyan-300/15 bg-black/20"
                />
                <Input
                  value={editForm.value}
                  onChange={(event) => setEditForm((current) => ({ ...current, value: event.target.value }))}
                  className="h-10 rounded-lg border-cyan-300/15 bg-black/20"
                  placeholder="Control value"
                />
                <select
                  value={editForm.status}
                  onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-cyan-300/15 bg-black/20 px-3 text-sm text-slate-950"
                >
                  <option value="active">Active</option>
                  <option value="enforced">Enforced</option>
                  <option value="paused">Paused</option>
                </select>
                <Button
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="w-fit rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-slate-700 hover:bg-cyan-300/15"
                >
                  {saving ? "Saving..." : "Save Control"}
                </Button>
                {feedback && <div className="text-xs font-medium text-primary">{feedback}</div>}
              </div>
            ) : (
              <div className="text-sm text-slate-500">Select a control to inspect its current state.</div>
            )}
          </div>

          <div className="surface rounded-xl p-5">
            <div className="mb-3 flex items-center gap-2 section-label">
              <Settings className="h-4 w-4" />
              Environment
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between border-b border-cyan-300/15 pb-2"><span>Region</span><span>{workspace?.environment.region}</span></div>
              <div className="flex justify-between border-b border-cyan-300/15 pb-2"><span>Mode</span><span>{workspace?.environment.mode}</span></div>
              <div className="flex justify-between border-b border-cyan-300/15 pb-2"><span>Audit trail</span><span>{workspace?.environment.audit_trail}</span></div>
              <div className="flex justify-between"><span>Retrieval</span><span className="capitalize">{workspace?.environment.retrieval}</span></div>
            </div>
          </div>
        </aside>
      </div>
      <Toast message={feedback} />
    </div>
  );
}
