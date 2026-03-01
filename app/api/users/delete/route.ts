import { UserSearchService } from "@/services/userSearchService";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../supabse-admin";
import { getJWTClaims } from "@/lib/auth/jwtHelper";

export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ Iniciando deleção de usuário...");

    // Validar autenticação
    const claims = await getJWTClaims();

    if (!claims) {
      console.log('[API /users/delete DELETE] Não autenticado');
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Verificar se é administrador
    if (claims.user_role !== 'administrador') {
      console.log(`[API /users/delete DELETE] Usuário ${claims.email} não é administrador`);
      return NextResponse.json(
        { error: "Apenas administradores podem deletar usuários" },
        { status: 403 }
      );
    }

    console.log(`[API /users/delete DELETE] Admin: ${claims.email}`);

    const { userId } = await request.json();
    console.log("📋 User ID recebido:", userId);

    // Validar parâmetros
    if (!userId) {
      console.log("❌ User ID não fornecido");
      return NextResponse.json(
        {
          error: "Parâmetros inválidos",
          details: "User ID é obrigatório",
        },
        { status: 400 }
      );
    }

    console.log(`🔍 Verificando se usuário ${userId} existe...`);

    // Verificar se o usuário existe
    const userExists = await UserSearchService.getUserAssignments(userId);
    if (!userExists.success) {
      console.log("❌ Usuário não encontrado no sistema");
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const userData = userExists.data;
    console.log("👤 Usuário encontrado:", userData);

    // Verificar se o usuário existe no auth antes de tentar deletar
    console.log("🔍 Verificando usuário no Auth...");
    try {
      const { data: authUser, error: getUserError } =
        await supabaseAdmin.auth.admin.getUserById(userId);

      if (getUserError) {
        console.log("⚠️ Erro ao buscar usuário no Auth:", getUserError);
        if (getUserError.message.includes("User not found")) {
          return NextResponse.json(
            { error: "Usuário não encontrado no sistema de autenticação" },
            { status: 404 }
          );
        }
      }

      console.log("📋 Dados do usuário no Auth:", authUser);
    } catch (authCheckError) {
      console.error("❌ Erro na verificação do Auth:", authCheckError);
    }

    // Tentar deletar o usuário
    console.log(`🗑️ Tentando deletar usuário ${userId} do Auth...`);
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    console.log("🔄 Resposta da deleção:");
    console.log("Data:", data);
    console.log("Error:", error);

    if (error) {
      console.error("❌ Erro detalhado da deleção:", {
        message: error.message,
        status: error.status,
        name: error.name,
        cause: error.cause,
      });

      // Tratar diferentes tipos de erro
      let statusCode = 500;
      let errorMessage = "Erro ao deletar usuário";

      if (error.message.includes("User not found")) {
        statusCode = 404;
        errorMessage = "Usuário não encontrado";
      } else if (error.message.includes("permission")) {
        statusCode = 403;
        errorMessage = "Permissão negada para deletar usuário";
      } else if (error.message.includes("Database error")) {
        statusCode = 500;
        errorMessage = "Erro na base de dados ao deletar usuário";
      }

      return NextResponse.json(
        {
          error: errorMessage,
          details: error.message,
          errorCode: error.status || "UNKNOWN",
        },
        { status: statusCode }
      );
    }

    console.log(`✅ Usuário ${userId} deletado com sucesso do Auth`);

    // Opcional: Limpar dados relacionados do usuário em outras tabelas
    console.log("🧹 Verificando se há dados relacionados para limpar...");
    try {
      // Deletar registros relacionados se necessário
      const { error: cleanupError } = await supabaseAdmin
        .from("escalistas")
        .delete()
        .eq("id", userId);

      if (cleanupError) {
        console.log(
          "⚠️ Aviso: Erro ao limpar dados relacionados:",
          cleanupError.message
        );
        // Não falhar a operação por causa disso
      } else {
        console.log("✅ Dados relacionados limpos com sucesso");
      }
    } catch (cleanupError) {
      console.log("⚠️ Aviso: Erro durante limpeza:", cleanupError);
      // Não falhar a operação por causa disso
    }

    return NextResponse.json({
      success: true,
      message: "Usuário deletado com sucesso",
      userId: userId,
      user: userData,
    });
  } catch (error) {
    console.error("❌ Erro geral ao deletar usuário:", error);
    console.error(
      "❌ Stack trace:",
      error instanceof Error ? error.stack : "No stack trace"
    );

    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
        type: error instanceof Error ? error.constructor.name : "UnknownError",
      },
      { status: 500 }
    );
  }
}

/**
 * Verifica se o usuário tem atribuições ativas
 */
