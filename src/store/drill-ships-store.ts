import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { DrillShip } from "@/types";

interface DrillShipsState {
  ships: DrillShip[];
  loading: boolean;

  fetch: () => Promise<void>;
  create: (data: { name: string; helicopter_day: number; is_active: boolean }) => Promise<{ error: string | null }>;
  update: (id: string, data: Partial<{ name: string; helicopter_day: number; is_active: boolean }>) => Promise<{ error: string | null }>;
  remove: (id: string) => Promise<{ error: string | null }>;
}

export const useDrillShipsStore = create<DrillShipsState>((set, get) => ({
  ships: [],
  loading: false,

  fetch: async () => {
    set({ loading: true });
    const { data } = await supabase
      .from("drill_ships")
      .select("*")
      .order("name");
    set({ ships: (data as DrillShip[] | null) ?? [], loading: false });
  },

  create: async (data) => {
    const { error } = await supabase.from("drill_ships").insert(data as Record<string, unknown>);
    if (!error) await get().fetch();
    return { error: error?.message ?? null };
  },

  update: async (id, data) => {
    const { error } = await supabase.from("drill_ships").update(data as Record<string, unknown>).eq("id", id);
    if (!error) await get().fetch();
    return { error: error?.message ?? null };
  },

  remove: async (id) => {
    const { error } = await supabase.from("drill_ships").delete().eq("id", id);
    if (!error) await get().fetch();
    return { error: error?.message ?? null };
  },
}));
