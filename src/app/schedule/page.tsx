import { AppNav } from "@/components/AppNav";
import { requirePageAuth } from "@/lib/auth";
import { addDays, diffDays, maxIsoDate, minIsoDate, todayIsoDate } from "@/lib/dates";
import { getAssignmentsForWindow } from "@/lib/rotation-service";
import { ROLE_LABELS, ROLE_ORDER } from "@/lib/roles";

export const runtime = "nodejs";

async function loadAssignmentsSafely(fromDate: string, toDate: string) {
  try {
    const assignments = await getAssignmentsForWindow(fromDate, toDate);
    return { assignments, dataError: "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return {
      assignments: [] as Awaited<ReturnType<typeof getAssignmentsForWindow>>,
      dataError: message,
    };
  }
}

export default async function SchedulePage() {
  await requirePageAuth();

  const today = todayIsoDate();
  const fromDate = addDays(today, -14);
  const toDate = addDays(today, 84);
  const windowDays = diffDays(fromDate, toDate);

  const { assignments, dataError } = await loadAssignmentsSafely(fromDate, toDate);

  return (
    <div>
      <AppNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Schedule</p>
        <h1 className="text-3xl font-semibold text-slate-900">Role Timeline</h1>
        <p className="mt-1 text-sm text-slate-600">
          Window: {fromDate} to {toDate} (ship-local dates). Crew-change event is the assignment boundary date.
        </p>

        {dataError ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Server data error: {dataError}
          </p>
        ) : null}

        <section className="mt-6 overflow-x-auto rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
          <div className="min-w-[900px] space-y-6">
            {ROLE_ORDER.map((role) => {
              const roleAssignments = assignments.filter((assignment) => assignment.role === role);

              return (
                <div key={role}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">{ROLE_LABELS[role]}</p>
                    <p className="text-xs text-slate-500">{roleAssignments.length} blocks</p>
                  </div>

                  <div className="relative h-16 rounded-lg border border-slate-200 bg-slate-50">
                    {roleAssignments.map((assignment) => {
                      const clippedStart = maxIsoDate(assignment.startDate, fromDate);
                      const clippedEnd = minIsoDate(assignment.endDate, toDate);
                      const duration = diffDays(clippedStart, clippedEnd);
                      if (duration <= 0) {
                        return null;
                      }

                      const left = (diffDays(fromDate, clippedStart) / windowDays) * 100;
                      const width = Math.max((duration / windowDays) * 100, 3);

                      return (
                        <div
                          key={assignment.id}
                          className="absolute top-2 h-12 overflow-hidden rounded-md border border-slate-300 bg-sky-100 px-2 py-1"
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${assignment.person.name} (${assignment.startDate} - ${assignment.endDate})`}
                        >
                          <p className="truncate text-xs font-semibold text-slate-900">{assignment.person.name}</p>
                          <p className="truncate text-[11px] text-slate-700">
                            {assignment.startDate} → {assignment.endDate}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
