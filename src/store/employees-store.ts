import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-logger";
import type { Employee } from "@/types";

interface EmployeeFilters {
  shipId?: string;
  roleId?: string;
  isActive?: boolean;
}

interface EmployeesState {
  employees: Employee[];
  loading: boolean;
  filters: EmployeeFilters;

  setFilters: (filters: EmployeeFilters) => void;
  fetch: () => Promise<void>;
  create: (data: Record<string, unknown>) => Promise<{ error: string | null }>;
  update: (id: string, data: Record<string, unknown>) => Promise<{ error: string | null }>;
  remove: (id: string) => Promise<{ error: string | null }>;
}

export const useEmployeesStore = create<EmployeesState>((set, get) => ({
  employees: [],
  loading: false,
  filters: {},

  setFilters: (filters) => {
    set({ filters });
    get().fetch();
  },

  fetch: async () => {
    set({ loading: true });
    const { filters } = get();

    let query = supabase.from("employees").select("*").order("full_name");

    if (filters.shipId) {
      query = query.eq("drill_ship_id", filters.shipId);
    }
    if (filters.roleId) {
      query = query.eq("role_id", filters.roleId);
    }
    if (filters.isActive !== undefined) {
      query = query.eq("is_active", filters.isActive);
    }

    const { data } = await query;
    set({ employees: (data as Employee[] | null) ?? [], loading: false });
  },

  create: async (data) => {
    const { error } = await supabase.from("employees").insert(data);
    if (!error) {
      logActivity("created", "employee", null, data);
      await get().fetch();
    }
    return { error: error?.message ?? null };
  },

  update: async (id, data) => {
    const { error } = await supabase.from("employees").update(data).eq("id", id);
    if (!error) {
      logActivity("updated", "employee", id, data);
      await get().fetch();
    }
    return { error: error?.message ?? null };
  },

  remove: async (id) => {
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (!error) {
      logActivity("deleted", "employee", id);
      await get().fetch();
    }
    return { error: error?.message ?? null };
  },
}));
