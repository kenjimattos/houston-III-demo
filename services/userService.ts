import { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabaseClient";
import { UserRoleType } from "./userRoleService";
import { getCurrentUserWithPermissions } from "./authService";
import { toast } from "@/hooks/use-toast";
import { BadgeAlert, BadgeCheck } from "lucide-react";

export interface UserProfile {
  id: string;
  role: UserRoleType;
}

// Buscar perfil do usuário atual
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const { user } = await getCurrentUserWithPermissions();
  const supabase = getSupabaseClient();

  const currentUser: UserProfile = {
    id: user.id,
    role: (user.user_metadata?.role ||
      user.app_metadata?.role ||
      "escalista") as UserRoleType,
  };

  return currentUser;
}

// Verificar se o usuário atual é administrador
// @deprecated Use useCurrentUser() hook from @/contexts/CurrentUserContext instead
export async function isCurrentUserAdmin(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  return profile?.role === "administrador";
}

// Buscar nome do usuário atual
export async function getCurrentUserName(): Promise<string | null> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Buscar nome do escalista
  const { data: escalista, error } = await supabase
    .from("escalistas")
    .select("nome")
    .eq("id", user.id)
    .single();

  if (error || !escalista?.nome) return null;

  return escalista.nome;
}

export async function deleteUser(userId: string): Promise<void> {
  try {
    const response = await fetch("/api/users/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userId,
      }),
    });

    if (response.ok) {
      toast({
        icon: BadgeCheck,
        title: "Usuário apagado com sucesso!",
      });
    } else {
      toast({
        icon: BadgeAlert,
        title: "Erro ao apagar o usuário!",
        variant: "destructive",
      });
    }
    console.log("Resposta da deleção do usuário:", response);
  } catch (error) {
    toast({
      icon: BadgeAlert,
      title: "Erro ao apagar o usu+ario!",
    });
    console.error("Erro ao deletar usuário:", error);
  }
}
