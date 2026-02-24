import { useAuthStore } from "@/store/auth-store";

export function useAuth() {
  const { user, employee, role, loading, initialized } = useAuthStore();

  const roleName = role?.name ?? null;

  return {
    user,
    employee,
    role,
    roleName,
    loading,
    initialized,
    isAuthenticated: !!user,
    isAdmin: roleName === "Admin",
    isManager: roleName === "Manager",
    isField: role?.is_field_role ?? false,
    hasRole: (...names: string[]) => names.length === 0 || (roleName !== null && names.includes(roleName)),
  };
}
