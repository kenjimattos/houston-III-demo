import { NotificationService } from "@/services/notificationsService";
import {
  clearPermissions,
  setPermissions,
} from "@/services/permissionsService";
import {
  clearSupabaseStorage,
  getSupabaseClient,
} from "@/services/supabaseClient";
import jwtDecode from "jwt-decode";
const USER_PROFILE = "user_profile";

const supabase = getSupabaseClient();
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id)
    throw error || new Error("Usuário não autenticado");
  return data.user;
}

export async function getCurrentUserGrupoId(): Promise<string> {
  const user = await getCurrentUser();
  const { data: escalista, error } = await supabase
    .from("escalistas")
    .select("grupo_id")
    .eq("id", user.id)
    .single();

  if (error || !escalista?.grupo_id) {
    throw new Error("Grupo do usuário não encontrado");
  }

  return escalista.grupo_id;
}

export async function getCurrentEscalistaData(): Promise<{
  escalista_id: string;
  grupo_id: string;
}> {
  const user = await getCurrentUser();
  const { data: escalista, error } = await supabase
    .from("escalistas")
    .select("id, grupo_id")
    .eq("id", user.id)
    .single();

  if (error || !escalista?.id || !escalista?.grupo_id) {
    throw new Error("Dados do escalista não encontrados");
  }

  return {
    escalista_id: escalista.id,
    grupo_id: escalista.grupo_id
  };
}

export async function getCurrentUserWithPermissions() {
  // Pegar sessão (inclui access_token)
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError || !sessionData?.session) {
    throw new Error("Usuário não autenticado");
  }

  // Pegar dados básicos do usuário
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw new Error("Erro ao buscar dados do usuário");
  }

  // Decodificar JWT para pegar permissões
  const token = sessionData.session.access_token;
  let permissions: string[] = [];
  let userRole: string | null = null;
  let roles: string[] = [];

  try {
    const decoded: any = jwtDecode(token);
    permissions = decoded?.permissions || [];
    userRole = decoded?.user_role || null;
    roles = decoded?.roles || [];
  } catch (error) {
    console.error("Erro ao decodificar JWT:", error);
  }

  return {
    user: userData.user,
    permissions,
    userRole,
    roles,
    session: sessionData.session,
  };
}
export async function loginWithPassword({
  email,
  password,
  rememberMe,
}: {
  email: string;
  password: string;
  rememberMe: boolean;
}) {
  // Importar função para configurar persistência
  const { setSessionPersistence } = await import('./supabaseClient')

  // Configurar se a sessão deve persistir após fechar navegador
  setSessionPersistence(rememberMe)

  const { data: user, error: loginError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  const token = user.session?.access_token;
  if (token) {
    console.warn("Token JWT:", jwtDecode(token));
  }

  if (loginError) throw new Error("E-mail ou senha inválidos.");

  // Fazer logout temporário para buscar perfil com permissão anon
  await supabase.auth.signOut();

  // Fazer login novamente somente se autorizado
  const { data: finalUser, error: finalLoginError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (finalLoginError)
    throw new Error("Erro interno no processo de autenticação.");

  // Limpar todos os caches no login para evitar ver dados de outros usuários
  NotificationService.clearAllUserCache();

  // Extrair permissões diretamente do token JWT (claims customizados)
  try {
    const accessToken = finalUser.session?.access_token;
    if (accessToken) {
      const decoded: any = jwtDecode(accessToken);
      // Ajuste aqui conforme a claim: exemplos comuns: decoded.permissions, decoded.perms, decoded.app_metadata.permissions
      const possiblePaths = [
        decoded?.permissions,
        decoded?.perms,
        decoded?.app_metadata?.permissions,
        decoded?.user_metadata?.permissions,
      ];
      const found = possiblePaths.find((v) => Array.isArray(v));
      if (found) {
        setPermissions(found as string[]);
      } else {
        // Caso não exista claim, garante vazio
        clearPermissions();
      }
    } else {
      clearPermissions();
    }
  } catch (e) {
    clearPermissions();
  }

  return { user: finalUser.user };
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  if (error)
    throw new Error(
      "Erro ao enviar e-mail de recuperação. Verifique se o e-mail está correto."
    );
  return { success: true };
}

export async function updatePassword(newPassword: string) {
  const { error, data } = await supabase.auth.updateUser({
    password: newPassword,
  });

  console.warn("show me the error:", error);
  console.warn("Dados após atualização de senha:", data);

  console.warn("Senha atualizada para o usuário:", data.user);

  console.warn("Erro ao atualizar senha:", error);
  if (error) throw new Error("Erro ao atualizar senha. Tente novamente.");
  return { success: true };
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("escalistas")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) {
    console.error("Erro detalhado ao buscar perfil:", {
      error,
      userId,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw new Error(`Erro ao buscar perfil do usuário: ${error.message}`);
  }
  return data;
}

export async function logout() {
  // Limpar todos os caches no logout
  NotificationService.clearAllUserCache();

  // Limpar permissões em memória e storage
  clearPermissions();

  // Fazer logout do Supabase
  await supabase.auth.signOut();
  console.log("Logout realizado.");
  // Limpar completamente todo o storage do Supabase (tokens, refresh tokens, etc.)
  clearSupabaseStorage();
}
