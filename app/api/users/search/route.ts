import { NextRequest, NextResponse } from "next/server";
import { UserSearchService } from "@/services/userSearchService";
import { getJWTClaims } from "@/lib/auth/jwtHelper";

export async function GET(request: NextRequest) {
  try {
    // Validar autenticação
    const claims = await getJWTClaims();

    if (!claims) {
      console.log('[API /users/search GET] Não autenticado');
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    console.log(`[API /users/search GET] User: ${claims.email}, role: ${claims.user_role}`);

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const groupId = searchParams.get("groupId");
    const hospitalId = searchParams.get("hospitalId");
    const role = searchParams.get("role");
    const query = searchParams.get("query");

    // Search by specific user ID
    if (userId) {
      // SECURITY: Validate user can only search users in their grupos
      // Admins bypass this check
      if (claims.user_role !== 'administrador') {
        // Get user's assignments to validate grupo access
        const userAssignments = await UserSearchService.getUserAssignments(userId);
        if (!userAssignments.success) {
          return NextResponse.json({ error: userAssignments.error }, { status: 400 });
        }

        // Extract grupos from user's roles
        const userGrupos = new Set<string>();
        if (userAssignments.data?.roles) {
          for (const role of userAssignments.data.roles) {
            if (role.grupo_ids) {
              role.grupo_ids.forEach((id: string) => userGrupos.add(id));
            }
          }
        }

        // Check if there's any grupo overlap
        const hasAccess = claims.grupo_ids?.some(gid => userGrupos.has(gid));
        if (!hasAccess && userGrupos.size > 0) {
          console.log(`[API /users/search GET] User ${claims.email} sem acesso ao usuário ${userId}`);
          return NextResponse.json(
            { error: "Sem permissão para acessar este usuário" },
            { status: 403 }
          );
        }
      }

      const result = await UserSearchService.getUserAssignments(userId);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result.data);
    }

    // Search by group ID
    if (groupId) {
      // SECURITY: Validate user has access to this grupo
      if (claims.user_role !== 'administrador') {
        if (!claims.grupo_ids?.includes(groupId)) {
          console.log(`[API /users/search GET] User ${claims.email} sem acesso ao grupo ${groupId}`);
          return NextResponse.json(
            { error: "Sem permissão para acessar este grupo" },
            { status: 403 }
          );
        }
      }

      const result = await UserSearchService.getUsersByGroup(groupId);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result.data);
    }

    // Search by hospital ID
    if (hospitalId) {
      // SECURITY: Validate user has access to this hospital
      // We need to check if hospital belongs to user's grupos
      if (claims.user_role !== 'administrador') {
        const { getServerClient } = await import('@/lib/supabase/serverClient');
        const supabase = getServerClient();

        const { data: hospital, error: hospitalError } = await supabase
          .from('hospitais')
          .select('grupo_id')
          .eq('id', hospitalId)
          .single();

        if (hospitalError || !hospital) {
          return NextResponse.json(
            { error: "Hospital não encontrado" },
            { status: 404 }
          );
        }

        if (!claims.grupo_ids?.includes(hospital.grupo_id)) {
          console.log(`[API /users/search GET] User ${claims.email} sem acesso ao hospital ${hospitalId}`);
          return NextResponse.json(
            { error: "Sem permissão para acessar este hospital" },
            { status: 403 }
          );
        }
      }

      const result = await UserSearchService.getUsersByHospital(hospitalId);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result.data);
    }

    // Search by role
    if (role) {
      // SECURITY: Filter results by user's grupos
      const result = await UserSearchService.getUsersByRole(role);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      // Filter users to only those in same grupos (unless admin)
      if (claims.user_role !== 'administrador' && result.data?.roles) {
        const filteredRoles = result.data.roles.filter((userRole: any) => {
          // Check if user has any grupo in common with the searched user
          if (userRole.grupo_ids && Array.isArray(userRole.grupo_ids)) {
            return userRole.grupo_ids.some((gid: string) => claims.grupo_ids?.includes(gid));
          }
          return false;
        });

        result.data.roles = filteredRoles;

        // Also filter users list
        const allowedUserIds = new Set(filteredRoles.map((r: any) => r.user_id));
        if (result.data.users) {
          result.data.users = result.data.users.filter((u: any) => allowedUserIds.has(u.id));
        }
      }

      return NextResponse.json(result.data);
    }

    // General search by query (usando searchUsers com parâmetros apropriados)
    if (query) {
      // Para busca geral, vamos tentar buscar por role primeiro
      const result = await UserSearchService.getUsersByRole(query);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      // Filter users to only those in same grupos (unless admin)
      if (claims.user_role !== 'administrador' && result.data?.roles) {
        const filteredRoles = result.data.roles.filter((userRole: any) => {
          // Check if user has any grupo in common with the searched user
          if (userRole.grupo_ids && Array.isArray(userRole.grupo_ids)) {
            return userRole.grupo_ids.some((gid: string) => claims.grupo_ids?.includes(gid));
          }
          return false;
        });

        result.data.roles = filteredRoles;

        // Also filter users list
        const allowedUserIds = new Set(filteredRoles.map((r: any) => r.user_id));
        if (result.data.users) {
          result.data.users = result.data.users.filter((u: any) => allowedUserIds.has(u.id));
        }
      }

      return NextResponse.json(result.data);
    }

    return NextResponse.json(
      {
        error:
          "Parâmetro de busca obrigatório (userId, groupId, hospitalId, role, ou query)",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Erro na busca de usuários:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
