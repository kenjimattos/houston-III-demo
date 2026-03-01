"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Link from "next/link";
import { updatePassword, logout } from "@/services/authService";
import { Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";
import { HoustonLogo } from "@/components/ui/houston-logo";

export default function CreatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [tokenValid, setTokenValid] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const router = useRouter();

  // Verificar tokens de convite na URL e estabelecer sessão
  useEffect(() => {
    const checkTokens = async () => {
      try {
        // Capturar tokens da URL (podem vir como hash ou query params)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken) {
          // Importar dinamicamente para evitar problemas de SSR
          const { getSupabaseClient } = await import("@/services/supabaseClient");
          const supabase = getSupabaseClient();

          // Configurar a sessão com os tokens recebidos
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });

          if (error) {
            console.error("Erro ao estabelecer sessão:", error);
            setError("Link de convite inválido ou expirado. Solicite um novo convite.");
            setTokenValid(false);
          } else {
            setTokenValid(true);
          }
        } else {
          setError("Link de convite inválido. Verifique o email e clique no link correto.");
          setTokenValid(false);
        }
      } catch (err: any) {
        console.error("Erro ao validar token:", err);
        setError("Erro ao validar link de convite.");
        setTokenValid(false);
      } finally {
        setCheckingToken(false);
      }
    };

    checkTokens();
  }, []);

  // Efeito para countdown e redirecionamento automático com logout
  useEffect(() => {
    if (showSuccessModal) {
      logout();
    }
  }, [showSuccessModal, router]);

  const handleRedirectNow = () => {
    setShowSuccessModal(false);
    // Fazer logout e redirecionar para login

    router.push("/auth/login");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validações
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      setLoading(false);
      return;
    }

    try {
      await updatePassword(password);
      setShowSuccessModal(true);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Erro ao criar senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  // Mostrar loading enquanto verifica token
  if (checkingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg p-4">
        <div className="w-full flex flex-col items-center justify-center">
          <div className="flex items-center justify-center mb-10">
            <HoustonLogo className="h-8 text-primary -ml-3" />
          </div>
          <Card className="w-full max-w-[500px] mx-auto">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Validando link de convite...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Se token inválido, mostrar erro
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg p-4">
        <div className="w-full flex flex-col items-center justify-center">
          <div className="flex items-center justify-center mb-10">
            <HoustonLogo className="h-8 text-primary -ml-3" />
          </div>
          <Card className="w-full max-w-[500px] mx-auto">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl font-normal text-center mt-[2px]">
                Link Inválido
              </CardTitle>
              <CardDescription className="text-center">
                Não foi possível validar o link de convite
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-sm mx-auto text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                </div>
                {error && <p className="text-sm text-gray-600">{error}</p>}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col">
              <Button
                onClick={() => router.push("/auth/login")}
                className="w-full"
              >
                Voltar para o login
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg p-4">
        <div className="w-full flex flex-col items-center justify-center">
          <div className="flex items-center justify-center mb-10">
            <div className="flex items-center justify-center">
              <HoustonLogo className="h-8 text-primary -ml-3" />
            </div>
          </div>
          <Card className="w-full max-w-[500px] mx-auto">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl font-normal text-center mt-[2px]">
                Senha Criada
              </CardTitle>
              <CardDescription className="text-center">
                Sua senha foi criada com sucesso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-sm mx-auto text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Sua senha foi criada com sucesso. Agora você pode acessar o
                  sistema com sua nova senha.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <div className="text-center text-sm">
                <Link
                  href="/auth/login"
                  className="text-primary hover:underline font-normal"
                >
                  Fazer login novamente
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-app-bg p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-10">
            <div className="flex items-center justify-center">
              <HoustonLogo className="h-8 text-primary -ml-3" />
            </div>
          </div>
          <Card className="w-full max-w-[500px] mx-auto">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl font-normal text-center mt-[2px]">
                Criar Senha
              </CardTitle>
              <CardDescription className="text-center">
                Digite sua nova senha para acessar o sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-sm mx-auto">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-thin">
                      Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      A senha deve ter pelo menos 8 caracteres
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-thin"
                    >
                      Confirmar Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {error && (
                    <div className="text-red-500 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                      {error}
                    </div>
                  )}

                  <div className="space-y-5"></div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Criando..." : "Criar Senha"}
                  </Button>
                </form>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              {/* <div className="text-center text-sm">
                <Link
                  href="/"
                  className="text-primary hover:underline font-normal flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao Dashboard
                </Link>
              </div> */}
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Modal de Sucesso */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center space-y-6 py-8">
            {/* Ícone de sucesso */}
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            {/* Título */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">
                Senha Criada com Sucesso!
              </h2>
              <p className="text-sm text-gray-600">
                Sua senha foi definida com êxito. Você está sendo redirecionado
                para a página inicial.
              </p>
            </div>

            {/* Countdown */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
                    {countdown}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  Redirecionando em {countdown} segundo
                  {countdown !== 1 ? "s" : ""}...
                </span>
              </div>

              {/* Botão para redirecionar imediatamente */}
              <button
                onClick={handleRedirectNow}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Ir agora para a página inicial
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
