import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Church } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        if (!birthDate) {
          toast.error("Por favor, preencha sua data de nascimento.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) {
          if (error.message.includes("already") || error.message.includes("registered") || error.message.includes("duplicate")) {
            throw new Error("Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.");
          }
          throw error;
        }

        // If user created but no session (fake signup response for existing email)
        if (data.user && !data.user.identities?.length) {
          toast.error("Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.");
          setLoading(false);
          return;
        }

        // Update birth_date in profile
        if (data.user) {
          // Wait a moment for the trigger to create the profile
          setTimeout(async () => {
            await supabase
              .from("profiles")
              .update({ birth_date: birthDate })
              .eq("user_id", data.user!.id);
          }, 1000);
        }

        if (data.user && !data.session) {
          toast.success("Conta criada! Verifique seu e-mail para confirmar.");
        } else if (data.session) {
          toast.success("Conta criada com sucesso!");
          navigate("/");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message === "Invalid login credentials") {
            throw new Error("E-mail ou senha incorretos. Verifique e tente novamente.");
          }
          if (error.message === "Email not confirmed") {
            throw new Error("E-mail não confirmado. Verifique sua caixa de entrada.");
          }
          throw error;
        }
        toast.success("Bem-vindo de volta!");
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Church className="h-8 w-8 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-display tracking-tight text-foreground">
            Presença <span className="text-primary italic">Igreja</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestão de presença com propósito
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-8">
          <h2 className="text-xl font-display mb-6 text-foreground">
            {isSignUp ? "Criar conta" : "Entrar"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-muted-foreground text-sm">Nome completo</Label>
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome"
                    required
                    className="bg-input border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate" className="text-muted-foreground text-sm">Data de nascimento</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required
                    className="bg-input border-border"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground text-sm">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground text-sm">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="bg-input border-border"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Carregando..." : isSignUp ? "Criar conta" : "Entrar"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isSignUp ? "Já tem uma conta? Entre aqui" : "Não tem conta? Cadastre-se"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
