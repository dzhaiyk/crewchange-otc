import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Employee, Role } from "@/types";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  session: Session | null;
  user: User | null;
  employee: Employee | null;
  role: Role | null;
  loading: boolean;
  initialized: boolean;

  initialize: () => () => void;
  fetchEmployee: (userId: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  employee: null,
  role: null,
  loading: true,
  initialized: false,

  initialize: () => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, initialized: true });
      if (session?.user) {
        get().fetchEmployee(session.user.id);
      } else {
        set({ loading: false });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
      if (session?.user) {
        get().fetchEmployee(session.user.id);
      } else {
        set({ employee: null, role: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  },

  fetchEmployee: async (userId: string) => {
    const { data } = await supabase
      .from("employees")
      .select("*")
      .eq("auth_id", userId)
      .single();

    const emp = data as Employee | null;

    if (emp) {
      const { data: roleData } = await supabase
        .from("roles")
        .select("*")
        .eq("id", emp.role_id)
        .single();

      set({ employee: emp, role: roleData as Role | null, loading: false });
    } else {
      set({ employee: null, role: null, loading: false });
    }
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },

  signUp: async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, employee: null, role: null });
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message ?? null };
  },
}));
