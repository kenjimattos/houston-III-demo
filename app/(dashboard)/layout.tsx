import DashboardClient from "./DashboardClient";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { CurrentUserProviderContainer } from "@/contexts/CurrentUserProviderContainer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <CurrentUserProviderContainer>
        <DashboardClient>{children}</DashboardClient>
      </CurrentUserProviderContainer>
    </ProtectedRoute>
  );
}
