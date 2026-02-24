import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { ActivityLog } from "@/types";

const PAGE_SIZE = 50;

interface ActivityLogFilters {
  entityType?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface ActivityLogState {
  logs: ActivityLog[];
  loading: boolean;
  page: number;
  hasMore: boolean;
  filters: ActivityLogFilters;

  setFilters: (filters: ActivityLogFilters) => void;
  fetch: (page?: number) => Promise<void>;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
}

export const useActivityLogStore = create<ActivityLogState>((set, get) => ({
  logs: [],
  loading: false,
  page: 0,
  hasMore: false,
  filters: {},

  setFilters: (filters) => {
    set({ filters, page: 0 });
    get().fetch(0);
  },

  fetch: async (page?: number) => {
    const currentPage = page ?? get().page;
    set({ loading: true, page: currentPage });

    const { filters } = get();
    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters.entityType) query = query.eq("entity_type", filters.entityType);
    if (filters.userId) query = query.eq("user_id", filters.userId);
    if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
    if (filters.dateTo) query = query.lte("created_at", `${filters.dateTo}T23:59:59`);

    const { data } = await query;
    const logs = (data as ActivityLog[] | null) ?? [];

    set({
      logs,
      loading: false,
      hasMore: logs.length === PAGE_SIZE,
    });
  },

  nextPage: async () => {
    const { page, hasMore } = get();
    if (hasMore) await get().fetch(page + 1);
  },

  prevPage: async () => {
    const { page } = get();
    if (page > 0) await get().fetch(page - 1);
  },
}));
