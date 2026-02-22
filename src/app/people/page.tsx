import { AppNav } from "@/components/AppNav";
import { PeopleManager } from "@/components/PeopleManager";
import { requirePageAuth } from "@/lib/auth";
import { getPeople } from "@/lib/rotation-service";

export default async function PeoplePage() {
  await requirePageAuth();

  const people = await getPeople();

  return (
    <div>
      <AppNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">People & Roles</p>
        <h1 className="text-3xl font-semibold text-slate-900">Crew Pool Management</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage crew members mapped to DD/MWD day/night roles. One active assignee per role is enforced in schedule validation.
        </p>
        <div className="mt-6">
          <PeopleManager initialPeople={people} />
        </div>
      </main>
    </div>
  );
}
