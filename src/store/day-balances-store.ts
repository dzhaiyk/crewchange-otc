import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-logger";
import type { DayBalance } from "@/types";

export interface BalanceSummary {
  employeeId: string;
  total: number;
  entries: DayBalance[];
}

interface DayBalancesState {
  balances: DayBalance[];
  summaries: Map<string, number>;
  loading: boolean;

  fetchByEmployee: (employeeId: string) => Promise<void>;
  fetchSummaries: (employeeIds: string[]) => Promise<void>;
  create: (data: {
    employee_id: string;
    crew_change_entry_id?: string | null;
    days_amount: number;
    reason: string;
  }) => Promise<{ error: string | null }>;
}

export const useDayBalancesStore = create<DayBalancesState>((set) => ({
  balances: [],
  summaries: new Map(),
  loading: false,

  fetchByEmployee: async (employeeId) => {
    set({ loading: true });
    const { data } = await supabase
      .from("day_balances")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false });
    set({ balances: (data as DayBalance[] | null) ?? [], loading: false });
  },

  fetchSummaries: async (employeeIds) => {
    if (employeeIds.length === 0) {
      set({ summaries: new Map() });
      return;
    }

    const { data } = await supabase
      .from("day_balances")
      .select("employee_id, days_amount")
      .in("employee_id", employeeIds);

    const summaries = new Map<string, number>();
    // Initialize all to 0
    for (const id of employeeIds) summaries.set(id, 0);

    if (data) {
      for (const row of data as Array<{ employee_id: string; days_amount: number }>) {
        const current = summaries.get(row.employee_id) ?? 0;
        summaries.set(row.employee_id, current + row.days_amount);
      }
    }

    set({ summaries });
  },

  create: async (data) => {
    const { error } = await supabase.from("day_balances").insert(data as Record<string, unknown>);
    if (!error) {
      logActivity("created", "day_balance", null, {
        employee_id: data.employee_id,
        days_amount: data.days_amount,
        reason: data.reason,
      });
    }
    return { error: error?.message ?? null };
  },
}));
