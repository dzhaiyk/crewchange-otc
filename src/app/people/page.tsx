import { AppNav } from "@/components/AppNav";
import { PeopleManager } from "@/components/PeopleManager";
import { requirePageAuth } from "@/lib/auth";
import { getPeople } from "@/lib/rotation-service";

export const runtime = "nodejs";

async function loadPeopleSafely() {
  try {
    const people = await getPeople();
    return { people, dataError: "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return { people: [], dataError: message };
  }
}

export default async function PeoplePage() {
  await requirePageAuth();

  const { people, dataError } = await loadPeopleSafely();

  return (
    <div>
      <AppNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">People & Roles</p>
        <h1 className="text-3xl font-semibold text-slate-900">Crew Pool Management</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage crew members mapped to DD/MWD day/night roles. One active assignee per role is enforced in schedule validation.
        </p>
        {dataError ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Server data error: {dataError}
          </p>
        ) : null}
        <div className="mt-6">
          <PeopleManager initialPeople={people} />
        </div>
      </main>
    </div>
  );
}
