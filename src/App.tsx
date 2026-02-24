import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { useAuthStore } from "@/store/auth-store";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { DrillShipsPage } from "@/pages/DrillShipsPage";
import { RolesPage } from "@/pages/RolesPage";
import { EmployeesPage } from "@/pages/EmployeesPage";

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route
              path="/drill-ships"
              element={
                <RoleGuard allowedRoles={["Admin"]}>
                  <DrillShipsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/roles"
              element={
                <RoleGuard allowedRoles={["Admin"]}>
                  <RolesPage />
                </RoleGuard>
              }
            />
            <Route
              path="/employees"
              element={
                <RoleGuard allowedRoles={["Admin", "Manager"]}>
                  <EmployeesPage />
                </RoleGuard>
              }
            />
          </Route>
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
