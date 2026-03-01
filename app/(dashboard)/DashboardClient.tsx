"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { getCurrentUser, getUserProfile } from "@/services/authService";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/services/supabaseClient";
import { Toaster } from "@/components/ui/sonner";

export default function DashboardClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      try {
        const user = await getCurrentUser();
        const userProfile = await getUserProfile(user.id);

        setProfile({
          name: userProfile.nome || user.email,
          email: userProfile.email || user.email,
        });
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        // Não usar fallback - se não é escalista, redirecionar para login
        router.push("/auth/login");
        return;
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
