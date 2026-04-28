"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Clock, Mail, ShieldCheck, UserPlus, Users, Workflow, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { assignInvestigation, getTeamWorkspace, TeamMember, TeamWorkspace } from "@/lib/api";
import { Toast } from "@/components/Toast";

export default function TeamPage() {
  const [workspace, setWorkspace] = useState<TeamWorkspace | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string>>({});
  const [savingAssignmentId, setSavingAssignmentId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    getTeamWorkspace()
      .then((data) => {
        setWorkspace(data);
        setSelectedMember(data.members[0] || null);
        setAssignmentDrafts(Object.fromEntries(data.investigations.map((item) => [item.id, item.assignee_id || ""])));
      })
      .catch(console.error);
  }, []);

  const summary = workspace?.summary;

  const handleAssign = async (investigationId: string) => {
    const memberId = assignmentDrafts[investigationId] || null;
    setSavingAssignmentId(investigationId);
    try {
      const updated = await assignInvestigation(investigationId, memberId);
      setWorkspace(updated);
      setSelectedMember((current) => updated.members.find((member) => member.id === current?.id) || updated.members[0] || null);
      setAssignmentDrafts(Object.fromEntries(updated.investigations.map((item) => [item.id, item.assignee_id || ""])));
      const memberName = updated.members.find((member) => member.id === memberId)?.name || "Unassigned";
      setFeedback(`Routing saved. Investigation is now assigned to ${memberName}.`);
    } finally {
      setSavingAssignmentId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Analysts online", value: String(summary?.analysts_online ?? 0), icon: Users, detail: "Across review and policy desks" },
          { label: "Cases awaiting approval", value: String(summary?.cases_awaiting_approval ?? 0), icon: FileCheck, detail: "Need reviewer signoff" },
          { label: "Assignment flow", value: summary?.assignment_flow ?? "Loading", icon: Workflow, detail: "Current review posture" },
        ].map((item) => (
          <div key={item.label} className="surface depth-lift rounded-xl p-5">
            <div className="flex items-start justify-between">
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
        <section className="surface rounded-xl p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="section-label">Analysts</div>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Workspace members</h2>
            </div>
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-3">
            {workspace?.members.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelectedMember(member)}
                className="grid w-full gap-3 rounded-xl border border-cyan-300/15 bg-black/20 p-4 text-left transition-colors hover:border-primary/30 md:grid-cols-[minmax(0,1fr)_120px_120px_100px] md:items-center"
              >
                <div>
                  <div className="font-semibold text-slate-950">{member.name}</div>
                  <div className="mt-1 text-sm text-slate-500">{member.role}</div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  {member.status}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="h-4 w-4 text-primary" />
                  {member.queue} cases
                </div>
                <div className="text-sm font-semibold text-primary">Details</div>
              </button>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <Button className="w-fit rounded-lg bg-primary text-slate-950 hover:bg-primary/90">
            <UserPlus className="h-4 w-4" />
            Invite
          </Button>
          <div className="surface depth-lift rounded-xl p-5">
            <div className="section-label">Approval Policy</div>
            <div className="mt-3 text-2xl font-semibold text-slate-950">{workspace?.policy.title || "Loading"}</div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{workspace?.policy.detail}</p>
            {feedback && <div className="mt-3 text-xs font-medium text-primary">{feedback}</div>}
          </div>
          <div className="surface depth-lift rounded-xl p-5">
            <div className="section-label">Member Detail</div>
            {selectedMember ? (
              <>
                <div className="mt-3 text-xl font-semibold text-slate-950">{selectedMember.name}</div>
                <div className="mt-1 text-sm text-slate-500">{selectedMember.role}</div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{selectedMember.focus}</p>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="h-4 w-4 text-primary" />
                  {selectedMember.contact}
                </div>
                <div className="mt-4 space-y-3">
                  {selectedMember.assigned_investigations.length ? selectedMember.assigned_investigations.map((item) => (
                    <div key={item.id} className="rounded-lg border border-cyan-300/15 bg-black/20 p-3">
                      <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.verdict} - {item.evidence_count} evidence items</div>
                    </div>
                  )) : (
                    <div className="rounded-lg border border-dashed border-cyan-300/15 bg-black/20 p-3 text-sm text-slate-500">
                      No investigations assigned yet.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-3 text-sm text-slate-500">Select a team member to inspect assignments.</div>
            )}
          </div>
          <div className="surface depth-lift rounded-xl p-5">
            <div className="section-label">Investigation Routing</div>
            <div className="mt-4 space-y-3">
              {workspace?.investigations.map((item) => (
                <div key={item.id} className="rounded-lg border border-cyan-300/15 bg-black/20 p-3">
                  <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.verdict} - {item.status}</div>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <select
                      value={assignmentDrafts[item.id] || ""}
                      onChange={(event) => setAssignmentDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                      className="h-10 min-w-0 flex-1 rounded-lg border border-cyan-300/15 bg-black/20 px-3 text-sm text-slate-950"
                    >
                      <option value="">Unassigned</option>
                      {workspace.members.map((member) => (
                        <option key={member.id} value={member.id}>{member.name}</option>
                      ))}
                    </select>
                    <Button
                      onClick={() => void handleAssign(item.id)}
                      disabled={savingAssignmentId === item.id}
                      className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-slate-700 hover:bg-cyan-300/15"
                    >
                      {savingAssignmentId === item.id ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="surface depth-lift rounded-xl p-5">
            <div className="section-label">Role Coverage</div>
            <div className="mt-4 space-y-3">
              {["Admin", "Reviewer", "Specialist"].map((role) => (
                <div key={role} className="flex items-center justify-between rounded-lg border border-cyan-300/15 bg-black/20 p-3">
                  <span className="text-sm font-medium text-slate-600">{role}</span>
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
      <Toast message={feedback} />
    </div>
  );
}
