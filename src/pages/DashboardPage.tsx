import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Ship, Users, Calendar, Clock } from "lucide-react";

export function DashboardPage() {
  const { employee, roleName } = useAuth();
  const [shipCount, setShipCount] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);

  useEffect(() => {
    async function fetchCounts() {
      const [ships, employees] = await Promise.all([
        supabase.from("drill_ships").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);
      setShipCount(ships.count ?? 0);
      setEmployeeCount(employees.count ?? 0);
    }
    fetchCounts();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Welcome back, {employee?.full_name ?? "User"}
        </h2>
        <p className="text-muted-foreground">
          You are signed in as <span className="font-medium">{roleName}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Ships</CardTitle>
            <Ship className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shipCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeeCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Changes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">Coming in Phase 2</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">Coming in Phase 2</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Phase 2 Features</CardTitle>
          <CardDescription>Coming soon to CrewChange</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Crew change scheduling and calendar view</li>
            <li>Schedule exception requests (early relief, delayed join)</li>
            <li>Day balance tracking and reports</li>
            <li>Constraint validation for crew changes</li>
            <li>Activity log and audit trail</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
