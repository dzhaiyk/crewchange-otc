import { AppNav } from "@/components/AppNav";
import { ExceptionManager } from "@/components/ExceptionManager";
import { requirePageAuth } from "@/lib/auth";
import { todayIsoDate } from "@/lib/dates";
import { getExceptionsAudit, getUpcomingEventDatesByRole } from "@/lib/rotation-service";

export const runtime = "nodejs";

async function loadExceptionsDataSafely() {
  try {
    const [upcomingByRole, history] = await Promise.all([
      getUpcomingEventDatesByRole(todayIsoDate()),
      getExceptionsAudit(20),
    ]);
    return { upcomingByRole, history, dataError: "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return {
      upcomingByRole: {
        DD_DAY: [],
        DD_NIGHT: [],
        MWD_DAY: [],
        MWD_NIGHT: [],
      },
      history: [] as Awaited<ReturnType<typeof getExceptionsAudit>>,
      dataError: message,
    };
  }
}

export default async function ExceptionsPage() {
  await requirePageAuth();

  const { upcomingByRole, history, dataError } = await loadExceptionsDataSafely();

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

        {dataError ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Server data error: {dataError}
          </p>
        ) : null}

        <div className="mt-6">
          <ExceptionManager upcomingByRole={upcomingByRole} history={serializedHistory} />
        </div>
      </main>
    </div>
  );
}
