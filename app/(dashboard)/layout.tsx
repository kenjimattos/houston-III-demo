import DashboardClient from "./DashboardClient";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { CurrentUserProvider } from "@/contexts/CurrentUserContext";
// Ensure ProtectedRoute always returns ReactNode or null, never void

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <CurrentUserProvider>
        <DashboardClient>{children}</DashboardClient>
      </CurrentUserProvider>
    </ProtectedRoute>
  );
}
