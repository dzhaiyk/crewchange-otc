import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-logger";
import type { Role } from "@/types";

interface RolesState {
  roles: Role[];
  loading: boolean;

  fetch: () => Promise<void>;
  create: (data: { name: string; description: string | null; is_field_role: boolean }) => Promise<{ error: string | null }>;
  update: (id: string, data: Partial<{ name: string; description: string | null; is_field_role: boolean }>) => Promise<{ error: string | null }>;
  remove: (id: string) => Promise<{ error: string | null }>;
}

export const useRolesStore = create<RolesState>((set, get) => ({
  roles: [],
  loading: false,

  fetch: async () => {
    set({ loading: true });
    const { data } = await supabase
      .from("roles")
      .select("*")
      .order("name");
    set({ roles: (data as Role[] | null) ?? [], loading: false });
  },

  create: async (data) => {
    const { error } = await supabase.from("roles").insert({ ...data, is_system_role: false } as Record<string, unknown>);
    if (!error) {
      logActivity("created", "role", null, data);
      await get().fetch();
    }
    return { error: error?.message ?? null };
  },

  update: async (id, data) => {
    const { error } = await supabase.from("roles").update(data as Record<string, unknown>).eq("id", id);
    if (!error) {
      logActivity("updated", "role", id, data);
      await get().fetch();
    }
    return { error: error?.message ?? null };
  },

  remove: async (id) => {
    const { error } = await supabase.from("roles").delete().eq("id", id);
    if (!error) {
      logActivity("deleted", "role", id);
      await get().fetch();
    }
    return { error: error?.message ?? null };
  },
}));
