"use client";

import { ExceptionType, Role } from "@prisma/client";
import { useMemo, useState } from "react";

interface ExceptionHistoryItem {
  id: string;
  type: ExceptionType;
  role: Role;
  oldStartDate: string | null;
  newStartDate: string | null;
  reason: string;
  createdAt: string;
  createdBy: string;
}

const typeLabels: Record<ExceptionType, string> = {
  EARLY_RELIEF: "Early relief",
  DELAYED_JOIN: "Delayed join",
  SWAP: "Swap",
  MANUAL_MOVE: "Manual move",
};

const roleLabels: Record<Role, string> = {
  DD_DAY: "DD Day",
  DD_NIGHT: "DD Night",
  MWD_DAY: "MWD Day",
  MWD_NIGHT: "MWD Night",
};

const types: ExceptionType[] = ["EARLY_RELIEF", "DELAYED_JOIN", "SWAP", "MANUAL_MOVE"];
const roles: Role[] = ["DD_DAY", "DD_NIGHT", "MWD_DAY", "MWD_NIGHT"];

export function ExceptionManager({
  upcomingByRole,
  history,
}: {
  upcomingByRole: Record<Role, string[]>;
  history: ExceptionHistoryItem[];
}) {
  const [form, setForm] = useState({
    type: "EARLY_RELIEF" as ExceptionType,
    role: "DD_DAY" as Role,
    plannedDate: upcomingByRole.DD_DAY[0] ?? "",
    requestedDate: "",
    reason: "",
  });
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const roleDates = useMemo(() => upcomingByRole[form.role] ?? [], [form.role, upcomingByRole]);

  function updateRole(role: Role) {
    setForm((prev) => ({
      ...prev,
      role,
      plannedDate: (upcomingByRole[role] ?? [])[0] ?? "",
    }));
  }

  const requiresRequestedDate = form.type !== "SWAP";

  async function submitException() {
    setSaving(true);
    setResult("");
    setError("");

    try {
      if (!form.plannedDate) {
        throw new Error("Planned date is required.");
      }
      if (!form.reason.trim()) {
        throw new Error("Reason is required.");
      }
      if (requiresRequestedDate && !form.requestedDate) {
        throw new Error("Requested date is required for this exception type.");
      }

      const response = await fetch("/api/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          role: form.role,
          plannedDate: form.plannedDate,
          requestedDate: requiresRequestedDate ? form.requestedDate : undefined,
          reason: form.reason,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Exception apply failed");
      }

      setResult(`${data.message} Resolved date: ${data.resolvedDate}.`);
      setForm((prev) => ({
        ...prev,
        requestedDate: "",
        reason: "",
      }));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Exception apply failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Apply Exception</h2>
        <p className="mt-1 text-sm text-slate-600">
          All changes require a reason and are validated for coverage and forbidden same-day crew-change pairs.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-slate-700">Exception type</span>
            <select
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as ExceptionType }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              {types.map((type) => (
                <option key={type} value={type}>
                  {typeLabels[type]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-slate-700">Role</span>
            <select
              value={form.role}
              onChange={(event) => updateRole(event.target.value as Role)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-slate-700">Planned crew-change date</span>
            <select
              value={form.plannedDate}
              onChange={(event) => setForm((prev) => ({ ...prev, plannedDate: event.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              {roleDates.length > 0 ? (
                roleDates.map((date) => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))
              ) : (
                <option value="">No upcoming dates</option>
              )}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-slate-700">Requested date</span>
            <input
              type="date"
              value={form.requestedDate}
              onChange={(event) => setForm((prev) => ({ ...prev, requestedDate: event.target.value }))}
              disabled={!requiresRequestedDate}
              className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-100"
            />
          </label>
        </div>

        <label className="mt-3 block space-y-1 text-sm">
          <span className="text-slate-700">Reason</span>
          <textarea
            value={form.reason}
            onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            placeholder="Explain operational/personal reason"
          />
        </label>

        <button
          type="button"
          onClick={submitException}
          disabled={saving}
          className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {saving ? "Applying..." : "Apply Exception"}
        </button>

        {result ? <p className="mt-3 text-sm text-emerald-700">{result}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </section>

      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Recent Exception Audit</h2>
        <div className="mt-3 space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-slate-600">No exceptions logged yet.</p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-900">
                  {typeLabels[item.type]} | {roleLabels[item.role]}
                </p>
                <p className="text-slate-600">
                  {item.oldStartDate ?? "-"} → {item.newStartDate ?? "-"} | {item.createdBy}
                </p>
                <p className="text-slate-600">{item.reason}</p>
                <p className="text-xs text-slate-500">{item.createdAt.slice(0, 19).replace("T", " ")}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
