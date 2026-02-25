import { create } from "zustand";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-logger";
import type { Employee } from "@/types";

/**
 * Create a Supabase auth account without affecting the current admin session.
 * Uses a throwaway client with persistSession: false.
 */
async function createAuthAccount(
  email: string,
  password: string
): Promise<{ authId: string | null; error: string | null }> {
  const tempClient = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    { auth: { persistSession: false } }
  );

  const { data, error } = await tempClient.auth.signUp({ email, password });

  if (error) return { authId: null, error: error.message };
  if (!data.user) return { authId: null, error: "Failed to create auth account" };

  return { authId: data.user.id, error: null };
}

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
    const password = data.password as string | undefined;
    const username = data.username as string | undefined;
    const employeeData = { ...data };
    delete employeeData.password;

    // If password provided, create auth account first
    if (password && password.length >= 6 && username) {
      const email = `${username}@crewchange.local`;
      const { authId, error: authError } = await createAuthAccount(email, password);
      if (authError) return { error: `Auth account: ${authError}` };
      employeeData.auth_id = authId;
    }

    const { error } = await supabase.from("employees").insert(employeeData);
    if (!error) {
      logActivity("created", "employee", null, { ...employeeData, password: undefined });
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
