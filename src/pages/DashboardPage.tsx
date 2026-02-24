import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Ship, Users, Calendar, Clock, ArrowRight } from "lucide-react";
import type { CrewChange, ScheduleRequest } from "@/types";

export function DashboardPage() {
  const { employee, roleName, isAdmin, isManager } = useAuth();
  const canManage = isAdmin || isManager;

  const [shipCount, setShipCount] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [nearestDate, setNearestDate] = useState<string | null>(null);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [nextCrewChanges, setNextCrewChanges] = useState<CrewChange[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ScheduleRequest[]>([]);
  const [shipNames, setShipNames] = useState<Record<string, string>>({});

  // Field employee data
  const [myNextDate, setMyNextDate] = useState<string | null>(null);
  const [myBalance, setMyBalance] = useState(0);
  const [myPendingRequests, setMyPendingRequests] = useState<ScheduleRequest[]>([]);

  useEffect(() => {
    async function fetchData() {
      const today = new Date().toISOString().split("T")[0];

      // Parallel fetch all dashboard data
      const [ships, employees, upcoming, pendingReqs, nextCCs, shipList] = await Promise.all([
        supabase.from("drill_ships").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase
          .from("crew_changes")
          .select("id, scheduled_date", { count: "exact" })
          .in("status", ["planned", "confirmed"])
          .gte("scheduled_date", today)
          .order("scheduled_date")
          .limit(1),
        supabase
          .from("schedule_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("crew_changes")
          .select("*")
          .in("status", ["planned", "confirmed"])
          .gte("scheduled_date", today)
          .order("scheduled_date")
          .limit(3),
        supabase.from("drill_ships").select("id, name"),
      ]);

      setShipCount(ships.count ?? 0);
      setEmployeeCount(employees.count ?? 0);
      setUpcomingCount(upcoming.count ?? 0);
      setNearestDate(
        (upcoming.data as Array<{ scheduled_date: string }> | null)?.[0]?.scheduled_date ?? null
      );
      setPendingRequestCount(pendingReqs.count ?? 0);
      setNextCrewChanges((nextCCs.data as CrewChange[] | null) ?? []);

      // Build ship name lookup
      const names: Record<string, string> = {};
      if (shipList.data) {
        for (const s of shipList.data as Array<{ id: string; name: string }>) {
          names[s.id] = s.name;
        }
      }
      setShipNames(names);

      // Fetch pending requests for admin/manager
      if (canManage) {
        const { data: reqs } = await supabase
          .from("schedule_requests")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5);
        setPendingRequests((reqs as ScheduleRequest[] | null) ?? []);
      }

      // Field employee personal data
      if (employee && !canManage) {
        const [myCC, myBal, myReqs] = await Promise.all([
          supabase
            .from("crew_change_entries")
            .select("crew_change_id")
            .or(`outgoing_employee_id.eq.${employee.id},incoming_employee_id.eq.${employee.id}`)
            .limit(10),
          supabase
            .from("day_balances")
            .select("days_amount")
            .eq("employee_id", employee.id),
          supabase
            .from("schedule_requests")
            .select("*")
            .eq("employee_id", employee.id)
            .eq("status", "pending")
            .order("created_at", { ascending: false }),
        ]);

        // Find nearest crew change date for this employee
        if (myCC.data && myCC.data.length > 0) {
          const ccIds = (myCC.data as Array<{ crew_change_id: string }>).map((e) => e.crew_change_id);
          const { data: myCCs } = await supabase
            .from("crew_changes")
            .select("scheduled_date")
            .in("id", ccIds)
            .in("status", ["planned", "confirmed"])
            .gte("scheduled_date", today)
            .order("scheduled_date")
            .limit(1);
          setMyNextDate(
            (myCCs as Array<{ scheduled_date: string }> | null)?.[0]?.scheduled_date ?? null
          );
        }

        // Calculate balance
        const balance = (myBal.data as Array<{ days_amount: number }> | null)?.reduce(
          (sum, b) => sum + b.days_amount,
          0
        ) ?? 0;
        setMyBalance(balance);
        setMyPendingRequests((myReqs.data as ScheduleRequest[] | null) ?? []);
      }
    }

    fetchData();
  }, [employee, canManage]);

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
            <div className="text-2xl font-bold">{upcomingCount}</div>
            {nearestDate && (
              <p className="text-xs text-muted-foreground">Next: {nearestDate}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequestCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Next 3 crew changes (all roles) */}
      {nextCrewChanges.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Crew Changes</CardTitle>
              <CardDescription>Next scheduled rotations</CardDescription>
            </div>
            {canManage && (
              <Link to="/crew-changes" className="flex items-center gap-1 text-sm text-primary hover:underline">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Ship</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nextCrewChanges.map((cc) => (
                  <TableRow key={cc.id}>
                    <TableCell className="font-medium">{cc.scheduled_date}</TableCell>
                    <TableCell>{shipNames[cc.drill_ship_id] ?? "Unknown"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{cc.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Admin/Manager: pending requests */}
      {canManage && pendingRequests.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pending Requests</CardTitle>
              <CardDescription>Schedule change requests needing review</CardDescription>
            </div>
            <Link to="/schedule-requests" className="flex items-center gap-1 text-sm text-primary hover:underline">
              Review all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Original Date</TableHead>
                  <TableHead>Requested Date</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>{req.original_date}</TableCell>
                    <TableCell>{req.requested_date}</TableCell>
                    <TableCell className="max-w-48 truncate">{req.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Field employee: personal info */}
      {!canManage && employee && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">My Next Crew Change</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myNextDate ?? "—"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">My Day Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${myBalance > 0 ? "text-green-600" : myBalance < 0 ? "text-red-600" : ""}`}>
                {myBalance > 0 ? "+" : ""}{myBalance} days
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">My Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myPendingRequests.length}</div>
              {myPendingRequests.length > 0 && (
                <Link to="/schedule-requests" className="flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                  View requests <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
