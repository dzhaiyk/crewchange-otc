import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/schedule", label: "Schedule" },
  { href: "/people", label: "People" },
  { href: "/exceptions", label: "Exceptions" },
];

export function AppNav() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-300 bg-white/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-700">Fatih Crew</p>
          <p className="hidden text-xs text-slate-500 md:block">4 weeks ON / 4 weeks OFF</p>
        </div>
        <nav className="flex items-center gap-2 md:gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-200"
            >
              {link.label}
            </Link>
          ))}
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
