"use client";

import { Role } from "@prisma/client";
import { useMemo, useState } from "react";

interface PersonRow {
  id: string;
  name: string;
  primaryRole: Role;
  employerId: string | null;
  contact: string | null;
  notes: string | null;
  active: boolean;
}

const roles: Role[] = ["DD_DAY", "DD_NIGHT", "MWD_DAY", "MWD_NIGHT"];

const roleLabels: Record<Role, string> = {
  DD_DAY: "DD Day",
  DD_NIGHT: "DD Night",
  MWD_DAY: "MWD Day",
  MWD_NIGHT: "MWD Night",
};

export function PeopleManager({ initialPeople }: { initialPeople: PersonRow[] }) {
  const [people, setPeople] = useState<PersonRow[]>(initialPeople);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [newPerson, setNewPerson] = useState({
    name: "",
    primaryRole: "DD_DAY" as Role,
    employerId: "",
    contact: "",
    notes: "",
  });

  const activePeople = useMemo(() => people.filter((person) => person.active), [people]);

  async function refreshPeople() {
    const response = await fetch("/api/people");
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load people");
    }
    setPeople(data.people as PersonRow[]);
  }

  async function create() {
    if (!newPerson.name.trim()) {
      setStatus("Name is required.");
      return;
    }

    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPerson),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Create failed");
      }

      setNewPerson({ name: "", primaryRole: "DD_DAY", employerId: "", contact: "", notes: "" });
      setStatus(`Created ${data.person.name}.`);
      await refreshPeople();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Create failed");
    } finally {
      setLoading(false);
    }
  }

  async function save(person: PersonRow) {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(`/api/people/${person.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: person.name,
          primaryRole: person.primaryRole,
          employerId: person.employerId ?? "",
          contact: person.contact ?? "",
          notes: person.notes ?? "",
          active: person.active,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Save failed");
      }
      setStatus(`Saved ${data.person.name}.`);
      await refreshPeople();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function deactivate(personId: string) {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(`/api/people/${personId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Deactivate failed");
      }
      setStatus(`Deactivated ${data.person.name}.`);
      await refreshPeople();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Deactivate failed");
    } finally {
      setLoading(false);
    }
  }

  function updateField(personId: string, field: keyof PersonRow, value: string | boolean) {
    setPeople((previous) =>
      previous.map((person) => (person.id === personId ? { ...person, [field]: value } : person)),
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Add Person</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          <input
            value={newPerson.name}
            onChange={(event) => setNewPerson((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Name"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={newPerson.primaryRole}
            onChange={(event) =>
              setNewPerson((prev) => ({ ...prev, primaryRole: event.target.value as Role }))
            }
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
          <input
            value={newPerson.employerId}
            onChange={(event) => setNewPerson((prev) => ({ ...prev, employerId: event.target.value }))}
            placeholder="Employer ID"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={newPerson.contact}
            onChange={(event) => setNewPerson((prev) => ({ ...prev, contact: event.target.value }))}
            placeholder="Contact"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={create}
            disabled={loading}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-60"
          >
            Create
          </button>
        </div>
        <textarea
          value={newPerson.notes}
          onChange={(event) => setNewPerson((prev) => ({ ...prev, notes: event.target.value }))}
          placeholder="Notes"
          className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          rows={2}
        />
      </section>

      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">People ({activePeople.length} active)</h2>
        <div className="mt-3 space-y-3">
          {people.map((person) => (
            <div
              key={person.id}
              className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-[1.4fr_1fr_1fr_1.2fr_2fr_auto_auto]"
            >
              <input
                value={person.name}
                onChange={(event) => updateField(person.id, "name", event.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                disabled={!person.active}
              />
              <select
                value={person.primaryRole}
                onChange={(event) => updateField(person.id, "primaryRole", event.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                disabled={!person.active}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
              <input
                value={person.employerId ?? ""}
                onChange={(event) => updateField(person.id, "employerId", event.target.value)}
                placeholder="Employer ID"
                className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                disabled={!person.active}
              />
              <input
                value={person.contact ?? ""}
                onChange={(event) => updateField(person.id, "contact", event.target.value)}
                placeholder="Contact"
                className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                disabled={!person.active}
              />
              <input
                value={person.notes ?? ""}
                onChange={(event) => updateField(person.id, "notes", event.target.value)}
                placeholder="Notes"
                className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                disabled={!person.active}
              />
              <button
                type="button"
                onClick={() => save(person)}
                disabled={loading || !person.active}
                className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => deactivate(person.id)}
                disabled={loading || !person.active}
                className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {person.active ? "Deactivate" : "Inactive"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {status ? <p className="text-sm text-slate-700">{status}</p> : null}
    </div>
  );
}
