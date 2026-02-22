import { AppNav } from "@/components/AppNav";
import { requirePageAuth } from "@/lib/auth";
import { todayIsoDate } from "@/lib/dates";
import { ROLE_LABELS, ROLE_ORDER } from "@/lib/roles";
import { getDashboardData } from "@/lib/rotation-service";

export const runtime = "nodejs";

async function loadDashboardSafely() {
  try {
    const data = await getDashboardData();
    return { data, dataError: "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";

    return {
      data: {
        today: todayIsoDate(),
        timezoneNote: "Dates are treated as ship-local dates (no time-of-day).",
        currentCrew: ROLE_ORDER.map((role) => ({ role, personId: "unknown", name: "Unavailable" })),
        upcomingChanges: [] as Array<{
          role: (typeof ROLE_ORDER)[number];
          date: string;
          outgoingPersonId: string;
          outgoingName: string;
          incomingPersonId: string;
          incomingName: string;
        }>,
        warnings: ["Crew data is temporarily unavailable. Check DATABASE_URL and server logs."],
      },
      dataError: message,
    };
  }
}

export default async function DashboardPage() {
  await requirePageAuth();

  const { data, dataError } = await loadDashboardSafely();

  return (
    <div>
      <AppNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Dashboard</p>
            <h1 className="text-3xl font-semibold text-slate-900">Fatih Crew Rotation</h1>
            <p className="mt-1 text-sm text-slate-600">Today: {data.today} | {data.timezoneNote}</p>
          </div>
        </div>

        {dataError ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Server data error: {dataError}
          </p>
        ) : null}

        <section className="mt-6 rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Today&apos;s Crew</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {data.currentCrew.map((crewMember) => (
              <div key={crewMember.role} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">{ROLE_LABELS[crewMember.role]}</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{crewMember.name}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Next Crew Changes</h2>
            <div className="mt-3 space-y-2 text-sm">
              {data.upcomingChanges.length === 0 ? (
                <p className="text-slate-600">No upcoming events found.</p>
              ) : (
                data.upcomingChanges.map((event) => (
                  <div key={`${event.role}-${event.date}`} className="rounded-md border border-slate-200 p-3">
                    <p className="font-medium text-slate-900">
                      {event.date} | {ROLE_LABELS[event.role]}
                    </p>
                    <p className="text-slate-600">
                      Offgoing: {event.outgoingName} → Oncoming: {event.incomingName}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Validation Warnings</h2>
            <div className="mt-3 space-y-2 text-sm">
              {data.warnings.length === 0 ? (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                  No validation errors in the current plan.
                </p>
              ) : (
                data.warnings.map((warning) => (
                  <p key={warning} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
                    {warning}
                  </p>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
