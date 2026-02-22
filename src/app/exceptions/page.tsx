import { AppNav } from "@/components/AppNav";
import { ExceptionManager } from "@/components/ExceptionManager";
import { requirePageAuth } from "@/lib/auth";
import { getExceptionsAudit, getUpcomingEventDatesByRole } from "@/lib/rotation-service";
import { todayIsoDate } from "@/lib/dates";

export default async function ExceptionsPage() {
  await requirePageAuth();

  const [upcomingByRole, history] = await Promise.all([
    getUpcomingEventDatesByRole(todayIsoDate()),
    getExceptionsAudit(20),
  ]);

  const serializedHistory = history.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <div>
      <AppNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Exceptions</p>
        <h1 className="text-3xl font-semibold text-slate-900">Adjustment Workflow</h1>
        <p className="mt-1 text-sm text-slate-600">
          Supported types: early relief, delayed join, swap, and manual move. Every change requires a reason and is logged.
        </p>

        <div className="mt-6">
          <ExceptionManager upcomingByRole={upcomingByRole} history={serializedHistory} />
        </div>
      </main>
    </div>
  );
}
