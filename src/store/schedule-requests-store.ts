import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-logger";
import type { ScheduleRequest } from "@/types";

interface ScheduleRequestsState {
  requests: ScheduleRequest[];
  loading: boolean;

  fetch: () => Promise<void>;
  create: (data: {
    employee_id: string;
    drill_ship_id: string;
    original_date: string;
    requested_date: string;
    reason: string;
    has_conflict?: boolean;
    conflict_details?: string | null;
  }) => Promise<{ error: string | null }>;
  review: (id: string, status: "approved" | "denied", reviewedBy: string) => Promise<{ error: string | null }>;
  remove: (id: string) => Promise<{ error: string | null }>;
}

export const useScheduleRequestsStore = create<ScheduleRequestsState>((set, get) => ({
  requests: [],
  loading: false,

  fetch: async () => {
    set({ loading: true });
    const { data } = await supabase
      .from("schedule_requests")
      .select("*")
      .order("created_at", { ascending: false });
    set({ requests: (data as ScheduleRequest[] | null) ?? [], loading: false });
  },

  create: async (data) => {
    // Check for conflicts: another request for the same ship & date
    const { data: conflicts } = await supabase
      .from("schedule_requests")
      .select("id, employee_id")
      .eq("drill_ship_id", data.drill_ship_id)
      .eq("requested_date", data.requested_date)
      .eq("status", "pending");

    const hasConflict = (conflicts?.length ?? 0) > 0;
    const conflictDetails = hasConflict
      ? `${conflicts!.length} other pending request(s) for this date`
      : null;

    const { error } = await supabase.from("schedule_requests").insert({
      ...data,
      status: "pending",
      has_conflict: hasConflict,
      conflict_details: conflictDetails,
    } as Record<string, unknown>);

    if (!error) {
      logActivity("created", "schedule_request", null, {
        employee_id: data.employee_id,
        original_date: data.original_date,
        requested_date: data.requested_date,
      });
      await get().fetch();
    }
    return { error: error?.message ?? null };
  },

  review: async (id, status, reviewedBy) => {
    const { error } = await supabase
      .from("schedule_requests")
      .update({ status, reviewed_by: reviewedBy } as Record<string, unknown>)
      .eq("id", id);

    if (!error) {
      logActivity(`${status}`, "schedule_request", id, { reviewed_by: reviewedBy });
      await get().fetch();
    }
    return { error: error?.message ?? null };
  },

  remove: async (id) => {
    const { error } = await supabase.from("schedule_requests").delete().eq("id", id);
    if (!error) {
      logActivity("deleted", "schedule_request", id);
      await get().fetch();
    }
    return { error: error?.message ?? null };
  },
}));
