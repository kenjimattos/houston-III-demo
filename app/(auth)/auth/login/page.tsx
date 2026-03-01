"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import Link from "next/link";
import { loginWithPassword } from "@/services/authService";
import { HoustonLogo } from "@/components/ui/houston-logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { user,
        
      } = await loginWithPassword({
        email,
        password,
        rememberMe,
      });
      router.push("/");
    } catch (err: any) {
      const message = err.message || "";

      // Mapear erros específicos de escalista para mensagens amigáveis
      if (message === "ACESSO_NEGADO_NAO_ESCALISTA") {
        setError("Sua conta não está registrada como escalista. Entre em contato com o administrador.");
      } else if (message === "ESCALISTA_STATUS_PENDENTE") {
        setError("Seu cadastro está pendente de aprovação. Você receberá um e-mail assim que for aprovado.");
      } else if (message === "ESCALISTA_STATUS_INATIVO") {
        setError("Sua conta foi desativada. Entre em contato com o administrador para mais informações.");
      } else {
        // Outros erros (credenciais inválidas, etc.)
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg p-4">
      <div className="w-full flex flex-col items-center justify-center">
        <div className="flex items-center justify-center mb-10">
          <div className="flex items-center justify-center">
            <HoustonLogo className="h-8 text-primary" />
          </div>
        </div>
        <Card className="w-full max-w-[500px] mx-auto">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-normal text-center mt-[2px]">
              Entrar
            </CardTitle>
            <CardDescription className="text-center">
              Entre com suas credenciais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-sm mx-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-thin">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex space-y-2"></div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-thin">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex space-y-2"></div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(!!checked)}
                  />
                  <Label htmlFor="rememberMe" className="text-sm font-thin">
                    Lembrar de mim
                  </Label>
                </div>
                <div className="flex justify-end">
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-primary hover:underline font-thin"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                {error && <div className="text-red-500 text-sm">{error}</div>}
                <div className="space-y-5"></div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            {/*   <div className="text-center text-sm mt-2">
              Não tem uma conta?{' '}
              <Link href="/auth/signup" className="text-primary hover:underline font-normal">
                Criar conta
              </Link>
            </div>*/}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
