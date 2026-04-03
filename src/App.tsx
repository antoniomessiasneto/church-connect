import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/layouts/AdminLayout";
import LoginPage from "@/pages/LoginPage";
import CheckinPage from "@/pages/CheckinPage";
import DashboardPage from "@/pages/admin/DashboardPage";
import MembersPage from "@/pages/admin/MembersPage";
import AttendancePage from "@/pages/admin/AttendancePage";
import ReportsPage from "@/pages/admin/ReportsPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import NotFound from "@/pages/NotFound";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

const queryClient = new QueryClient();

function RootRedirect() {
  const { user, role, loading, authError } = useAuth();
  const toastShownRef = useRef(false);

  useEffect(() => {
    if (!loading && !role && authError && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.error("Erro ao carregar permissões. Faça login novamente.");
    }
  }, [loading, role, authError]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Carregando...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!loading && authError) return <Navigate to="/login" replace />;
  if (role === null) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Carregando...</p></div>;
  if (role === "admin") return <Navigate to="/admin" replace />;
  return <Navigate to="/checkin" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/checkin" element={<CheckinPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="membros" element={<MembersPage />} />
              <Route path="presencas" element={<AttendancePage />} />
              <Route path="relatorios" element={<ReportsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
