import { useAuthStore } from "@/store/auth-store";

export function useAuth() {
  const { user, employee, role, loading, initialized } = useAuthStore();

  const systemKey = role?.system_key ?? null;

  return {
    user,
    employee,
    role,
    roleName: role?.name ?? null,
    loading,
    initialized,
    isAuthenticated: !!user,
    isAdmin: systemKey === "admin",
    isManager: systemKey === "manager",
    isField: role?.is_field_role ?? false,
    hasRole: (...keys: string[]) => keys.length === 0 || (systemKey !== null && keys.includes(systemKey)),
  };
}
