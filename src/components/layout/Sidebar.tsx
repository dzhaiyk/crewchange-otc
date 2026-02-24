import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { NAV_ITEMS } from "@/types";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Ship, Shield, Users, CalendarClock, ClipboardList, ScrollText } from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Ship,
  Shield,
  Users,
  CalendarClock,
  ClipboardList,
  ScrollText,
};

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const { hasRole } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.allowedRoles.length === 0 || hasRole(...item.allowedRoles)
  );

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-lg" onClick={onNavigate}>
          <Ship className="h-5 w-5" />
          CrewChange
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {visibleItems.map((item) => {
          const Icon = ICON_MAP[item.icon];
          const isActive = item.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
