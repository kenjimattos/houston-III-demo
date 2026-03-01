import {
  InviteErrorResponse,
  InviteUserPayload,
  InviteUserResponse,
  UserMetadata,
} from "@/types/invite";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../supabse-admin";

// Cliente Supabase com service_role para operações admin


export async function POST(
  request: NextRequest
): Promise<NextResponse<InviteUserResponse | InviteErrorResponse>> {
  try {
    const { userData, redirectTo }: InviteUserPayload = await request.json();

    console.warn("userData", userData);

    // Validações obrigatórias
    if (!userData.email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    if (!userData) {
      return NextResponse.json(
        { error: "Dados do usuário são obrigatórios" },
        { status: 400 }
      );
    }

    if (!userData.name) {
      return NextResponse.json(
        { error: "Nome do usuário é obrigatório" },
        { status: 400 }
      );
    }

    if (!userData.grupo_id) {
      return NextResponse.json(
        { error: "ID do grupo é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se o usuário já existe
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers.users.some(
      (user) => user.email === userData.email
    );

    if (userExists) {
      return NextResponse.json(
        { error: "Usuário já existe no sistema" },
        { status: 409 }
      );
    }

    // Preparar metadados do usuário com valores padrão
    const userMetadata: UserMetadata = {
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      grupo_id: userData.grupo_id,
      role: userData.role || "escalista", // Valor padrão: escalista
      invited_at: new Date().toISOString(),
      invite_status: "pending",
      platform: "houston", // Valor padrão: web
    };

    // Configurar o redirect URL - garantir que seja a URL correta
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    // const inviteRedirectTo = redirectTo || `${baseUrl}/auth/create-password`;

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      userData.email,
      {
        data: userMetadata,
        redirectTo: redirectTo,
      }
    );

    if (error) {
      console.error("Erro ao convidar usuário:", error);
      return NextResponse.json(
        { error: `Erro ao enviar convite: ${error.message}` },
        { status: 500 }
      );
    }

    // O trigger 'users_1_criar_usuario' no auth.users automaticamente
    // cria o escalista quando platform='houston'
    console.log("Convite enviado com sucesso para:", data.user?.email);

    const response: InviteUserResponse = {
      success: true,
      message: "Convite enviado com sucesso",
      user: {
        id: data.user?.id || "",
        email: data.user?.email || "",
        created_at: data.user?.created_at || "",
      },
      invite_sent_at: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Erro na API de convite:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// export async function PUT(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const email = searchParams.get("email");

//     if (!email) {
//       return NextResponse.json(
//         { error: "Email é obrigatório" },
//         { status: 400 }
//       );
//     }

//     const { data, error } = await supabaseAdmin.auth.admin.generateLink(email);

//     if (error) {
//       console.error("Erro ao buscar usuário:", error);
//       return NextResponse.json(
//         { error: `Erro ao buscar usuário: ${error.message}` },
//         { status: 500 }
//       );
//     }

//     if (!data.user) {
//       return NextResponse.json(
//         { error: "Usuário não encontrado" },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json({
//       success: true,
//       user: {
//         id: data.user.id,
//         email: data.user.email,
//         created_at: data.user.created_at,
//       },
//     });
//   } catch (error: any) {
//     console.error("Erro na API de convite:", error);
//     return NextResponse.json(
//       { error: "Erro interno do servidor" },
//       { status: 500 }
//     );
//   }
// }
