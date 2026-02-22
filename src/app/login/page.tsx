import { LoginForm } from "@/components/LoginForm";
import { isAuthenticated } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  if (await isAuthenticated()) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#d7ecff,_#f9fafb_55%)] px-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-xl backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Fatih Drillship</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Crew Rotation Admin</h1>
        <p className="mt-2 text-sm text-slate-600">
          Login to manage 4/4 rotation plans, exceptions, and crew-change audit logs.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
