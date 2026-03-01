import { getSupabaseClient } from "./supabaseClient";
import { getCurrentUser } from "./authService";
import jwtDecode from "jwt-decode";

// Chave de armazenamento (session ou local conforme já usado no auth)
const STORAGE_KEY = "houston.permissions";

// Estado interno em memória
let permissions: Set<string> = new Set();
let permissionsSnapshot: string[] = []; // Array estável reutilizada pelo hook
let initialized = false;

function updateSnapshot() {
  // Mantém referência estável se conteúdo não mudou
  const next = Array.from(permissions);
  // Comparação rápida (tamanho + elementos mesma ordem). Ordem aqui não é garantida em Set, mas inserções mantêm ordem; se quiser ordem determinística, pode fazer .sort()
  if (
    next.length === permissionsSnapshot.length &&
    next.every((v, i) => v === permissionsSnapshot[i])
  ) {
    return; // Não altera referência
  }
  permissionsSnapshot = next;
}

// Lista de subscribers (listeners) para mudanças
const listeners = new Set<() => void>();

function emitChange() {
  for (const l of listeners) l();
}

function readFromStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr as string[];
    return [];
  } catch {
    return [];
  }
}

function writeToStorage(values: string[]) {
  if (typeof window === "undefined") return;
  try {
    // Segue mesma lógica de storage customizado: se flag de session estiver set, usa session
    const useSession =
      sessionStorage.getItem("houston.useSessionStorage") === "true";
    const serialized = JSON.stringify(values);
    if (useSession) {
      sessionStorage.setItem(STORAGE_KEY, serialized);
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, serialized);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Silencioso
  }
}

export function getAllPermissions(): string[] {
  return permissionsSnapshot;
}

export function hasPermission(permission: string): boolean {
  return permissions.has(permission);
}

export function hasEveryPermission(perms: string[]): boolean {
  return perms.every((p) => permissions.has(p));
}

export function hasSomePermission(perms: string[]): boolean {
  return perms.some((p) => permissions.has(p));
}

export function setPermissions(perms: string[]) {
  permissions = new Set(perms);
  updateSnapshot();
  writeToStorage(permissionsSnapshot);
  emitChange();
}

export function addPermission(perm: string) {
  if (!permissions.has(perm)) {
    permissions.add(perm);
    updateSnapshot();
    writeToStorage(permissionsSnapshot);
    emitChange();
  }
}

export function removePermission(perm: string) {
  if (permissions.delete(perm)) {
    updateSnapshot();
    writeToStorage(permissionsSnapshot);
    emitChange();
  }
}

export function clearPermissions() {
  permissions.clear();
  updateSnapshot();
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  }
  emitChange();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function ensurePermissionsLoaded(force = false) {
  if (initialized && !force) return;
  // Tentar carregar do storage primeiro
  const stored = readFromStorage();
  if (stored.length > 0) {
    setPermissions(stored); // já cuida do snapshot e emit
    initialized = true;
    return;
  }
  try {
    const supabase = getSupabaseClient();
    const sessionResp = await supabase.auth.getSession();
    const accessToken = sessionResp.data.session?.access_token;
    if (accessToken) {
      try {
        const decoded: any = jwtDecode(accessToken);
        const possiblePaths = [
          decoded?.permissions,
          decoded?.perms,
          decoded?.app_metadata?.permissions,
          decoded?.user_metadata?.permissions,
        ];
        const found = possiblePaths.find((v) => Array.isArray(v));
        if (found) {
          setPermissions(found as string[]);
          initialized = true;
          return;
        }
      } catch {
        // ignora e continua fallback
      }
    }

    // Se não obteve pelo token, tenta fallback antigo (usando DB) para compatibilidade
    try {
      const user = await getCurrentUser();
      const { data, error } = await supabase
        .from("user_permissions")
        .select("permission")
        .eq("user_id", user.id);
      if (error) throw error;
      const perms = (data || []).map((r) => r.permission as string);
      setPermissions(perms);
    } catch {
      clearPermissions();
    }
  } finally {
    initialized = true;
  }
}

export function isInitialized() {
  return initialized;
}
