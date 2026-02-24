import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useScheduleRequestsStore } from "@/store/schedule-requests-store";
import { useEmployeesStore } from "@/store/employees-store";
import { useDrillShipsStore } from "@/store/drill-ships-store";
import { ScheduleRequestTable } from "@/components/schedule-requests/ScheduleRequestTable";
import { ScheduleRequestForm } from "@/components/schedule-requests/ScheduleRequestForm";
import { ReviewDialog } from "@/components/schedule-requests/ReviewDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { ScheduleRequest } from "@/types";

export function ScheduleRequestsPage() {
  const { employee, isAdmin, isManager, user } = useAuth();
  const { requests, loading, fetch, create, review } = useScheduleRequestsStore();
  const { employees, fetch: fetchEmployees } = useEmployeesStore();
  const { ships, fetch: fetchShips } = useDrillShipsStore();

  const [formOpen, setFormOpen] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState<ScheduleRequest | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const canReview = isAdmin || isManager;
  const isField = !canReview;

  useEffect(() => {
    fetch();
    fetchEmployees();
    fetchShips();
  }, [fetch, fetchEmployees, fetchShips]);

  // Field employees see only their own requests
  const visibleRequests = isField && employee
    ? requests.filter((r) => r.employee_id === employee.id)
    : requests;

  const employeeShip = employee?.drill_ship_id
    ? ships.find((s) => s.id === employee.drill_ship_id) ?? null
    : null;

  const handleSubmitRequest = async (data: {
    employee_id: string;
    drill_ship_id: string;
    original_date: string;
    requested_date: string;
    reason: string;
  }) => {
    const result = await create(data);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Schedule request submitted");
    setFormOpen(false);
  };

  const handleReview = (request: ScheduleRequest, status: "approved" | "denied") => {
    if (status === "approved") {
      setReviewingRequest(request);
    } else {
      handleReviewAction(request.id, status);
    }
  };

  const handleReviewAction = async (id: string, status: "approved" | "denied") => {
    setReviewLoading(true);
    const result = await review(id, status, user?.id ?? "");
    setReviewLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Request ${status}`);
      setReviewingRequest(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Schedule Requests</h2>
          <p className="text-muted-foreground">
            {isField ? "View and submit schedule change requests" : "Review and manage schedule requests"}
          </p>
        </div>
        {isField && employee && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            New Request
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <ScheduleRequestTable
          requests={visibleRequests}
          employees={employees}
          ships={ships}
          canReview={canReview}
          onReview={handleReview}
        />
      )}

      {/* New Request Dialog (field employees) */}
      {employee && (
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Schedule Request</DialogTitle>
            </DialogHeader>
            <ScheduleRequestForm
              employee={employee}
              ship={employeeShip}
              onSubmit={handleSubmitRequest}
              onCancel={() => setFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Review Dialog (admin/manager) */}
      <ReviewDialog
        open={!!reviewingRequest}
        onOpenChange={(open) => { if (!open) setReviewingRequest(null); }}
        request={reviewingRequest}
        employees={employees}
        ships={ships}
        onApprove={() => reviewingRequest && handleReviewAction(reviewingRequest.id, "approved")}
        onDeny={() => reviewingRequest && handleReviewAction(reviewingRequest.id, "denied")}
        loading={reviewLoading}
      />
    </div>
  );
}
