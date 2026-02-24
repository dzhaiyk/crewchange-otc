import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-logger";
import type { CrewChange, CrewChangeEntry } from "@/types";

interface CrewChangeFilters {
  shipId?: string;
  status?: CrewChange["status"];
}

interface CrewChangesState {
  crewChanges: CrewChange[];
  entries: CrewChangeEntry[];
  loading: boolean;
  entriesLoading: boolean;
  filters: CrewChangeFilters;
  selectedCrewChangeId: string | null;

  setFilters: (filters: CrewChangeFilters) => void;
  fetch: () => Promise<void>;
  create: (data: {
    drill_ship_id: string;
    scheduled_date: string;
    status: CrewChange["status"];
    notes?: string | null;
  }) => Promise<{ error: string | null; id: string | null }>;
  update: (
    id: string,
    data: Partial<{
      scheduled_date: string;
      status: CrewChange["status"];
      notes: string | null;
    }>
  ) => Promise<{ error: string | null }>;
  remove: (id: string) => Promise<{ error: string | null }>;

  // Entry sub-CRUD
  selectCrewChange: (id: string | null) => void;
  fetchEntries: (crewChangeId: string) => Promise<void>;
  createEntry: (data: {
    crew_change_id: string;
    role_id: string;
    shift: "day" | "night" | null;
    outgoing_employee_id: string | null;
    incoming_employee_id: string | null;
    is_early: boolean;
    is_late: boolean;
    days_delta: number;
    status?: CrewChangeEntry["status"];
    notes?: string | null;
  }) => Promise<{ error: string | null }>;
  updateEntry: (
    id: string,
    data: Partial<{
      outgoing_employee_id: string | null;
      incoming_employee_id: string | null;
      is_early: boolean;
      is_late: boolean;
      days_delta: number;
      status: CrewChangeEntry["status"];
      notes: string | null;
    }>
  ) => Promise<{ error: string | null }>;
  removeEntry: (id: string) => Promise<{ error: string | null }>;
  batchCreateEntries: (
    entries: Array<{
      crew_change_id: string;
      role_id: string;
      shift: "day" | "night" | null;
      outgoing_employee_id: string | null;
      incoming_employee_id: string | null;
      is_early: boolean;
      is_late: boolean;
      days_delta: number;
    }>
  ) => Promise<{ error: string | null }>;
}

async function createDayBalance(
  employeeId: string,
  entryId: string,
  daysDelta: number,
  reason: string
) {
  await supabase.from("day_balances").insert({
    employee_id: employeeId,
    crew_change_entry_id: entryId,
    days_amount: daysDelta,
    reason,
  });
}

export const useCrewChangesStore = create<CrewChangesState>((set, get) => ({
  crewChanges: [],
  entries: [],
  loading: false,
  entriesLoading: false,
  filters: {},
  selectedCrewChangeId: null,

  setFilters: (filters) => {
    set({ filters });
    get().fetch();
  },

  fetch: async () => {
    set({ loading: true });
    const { filters } = get();

    let query = supabase
      .from("crew_changes")
      .select("*")
      .order("scheduled_date", { ascending: false });

    if (filters.shipId) query = query.eq("drill_ship_id", filters.shipId);
    if (filters.status) query = query.eq("status", filters.status);

    const { data } = await query;
    set({ crewChanges: (data as CrewChange[] | null) ?? [], loading: false });
  },

  create: async (data) => {
    const { data: result, error } = await supabase
      .from("crew_changes")
      .insert(data as Record<string, unknown>)
      .select("id")
      .single();

    if (!error && result) {
      logActivity("created", "crew_change", result.id, {
        ship_id: data.drill_ship_id,
        date: data.scheduled_date,
      });
      await get().fetch();
      return { error: null, id: result.id as string };
    }
    return { error: error?.message ?? "Unknown error", id: null };
  },

  update: async (id, data) => {
    const { error } = await supabase
      .from("crew_changes")
      .update(data as Record<string, unknown>)
      .eq("id", id);
    if (!error) {
      logActivity("updated", "crew_change", id, data);
      await get().fetch();
    }
    return { error: error?.message ?? null };
  },

  remove: async (id) => {
    const { error } = await supabase.from("crew_changes").delete().eq("id", id);
    if (!error) {
      logActivity("deleted", "crew_change", id);
      await get().fetch();
    }
    return { error: error?.message ?? null };
  },

  selectCrewChange: (id) => {
    set({ selectedCrewChangeId: id, entries: [] });
    if (id) get().fetchEntries(id);
  },

  fetchEntries: async (crewChangeId) => {
    set({ entriesLoading: true });
    const { data } = await supabase
      .from("crew_change_entries")
      .select("*")
      .eq("crew_change_id", crewChangeId)
      .order("created_at");
    set({
      entries: (data as CrewChangeEntry[] | null) ?? [],
      entriesLoading: false,
    });
  },

  createEntry: async (data) => {
    const { data: result, error } = await supabase
      .from("crew_change_entries")
      .insert(data as Record<string, unknown>)
      .select("id")
      .single();

    if (!error && result) {
      // Auto-create day balance for early/late entries
      if ((data.is_early || data.is_late) && data.days_delta !== 0) {
        const reason = data.is_early ? "Early relief" : "Late join";
        if (data.outgoing_employee_id) {
          await createDayBalance(
            data.outgoing_employee_id,
            result.id as string,
            data.is_early ? -data.days_delta : data.days_delta,
            reason
          );
        }
        if (data.incoming_employee_id) {
          await createDayBalance(
            data.incoming_employee_id,
            result.id as string,
            data.is_early ? data.days_delta : -data.days_delta,
            reason
          );
        }
      }
      logActivity("created", "crew_change_entry", result.id as string, {
        crew_change_id: data.crew_change_id,
        role_id: data.role_id,
      });
      await get().fetchEntries(data.crew_change_id);
    }
    return { error: error?.message ?? null };
  },

  updateEntry: async (id, data) => {
    const { error } = await supabase
      .from("crew_change_entries")
      .update(data as Record<string, unknown>)
      .eq("id", id);
    if (!error) {
      logActivity("updated", "crew_change_entry", id, data);
      const { selectedCrewChangeId } = get();
      if (selectedCrewChangeId) await get().fetchEntries(selectedCrewChangeId);
    }
    return { error: error?.message ?? null };
  },

  removeEntry: async (id) => {
    const { selectedCrewChangeId } = get();
    const { error } = await supabase
      .from("crew_change_entries")
      .delete()
      .eq("id", id);
    if (!error) {
      logActivity("deleted", "crew_change_entry", id);
      if (selectedCrewChangeId) await get().fetchEntries(selectedCrewChangeId);
    }
    return { error: error?.message ?? null };
  },

  batchCreateEntries: async (entries) => {
    if (entries.length === 0) return { error: null };

    const { error } = await supabase
      .from("crew_change_entries")
      .insert(entries as Record<string, unknown>[]);

    if (!error) {
      logActivity("batch_created", "crew_change_entries", null, {
        count: entries.length,
        crew_change_id: entries[0]?.crew_change_id,
      });
      const crewChangeId = entries[0]?.crew_change_id;
      if (crewChangeId) await get().fetchEntries(crewChangeId);
    }
    return { error: error?.message ?? null };
  },
}));
