import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Check, LogOut } from "lucide-react";

export default function CheckinPage() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [eventTitle, setEventTitle] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  // Auto-submit if code came from QR
  useEffect(() => {
    const qrCode = searchParams.get("code");
    if (qrCode && user && !loading) {
      setCode(qrCode);
      handleCheckin(qrCode);
    }
  }, [searchParams, user, loading]);

  async function handleCheckin(attendanceCode?: string) {
    const codeToUse = attendanceCode || code;
    if (!codeToUse.trim() || !user) return;
    setSubmitting(true);

    try {
      // Find event by code
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("id, title, is_active, event_date")
        .eq("attendance_code", codeToUse.toUpperCase())
        .single();

      if (eventError || !event) {
        toast.error("Código inválido. Verifique e tente novamente.");
        return;
      }

      if (!event.is_active) {
        toast.error("Este evento não está mais ativo.");
        return;
      }

      // Check if the event is today
      const eventDate = new Date(event.event_date);
      const today = new Date();
      const isSameDay =
        eventDate.getFullYear() === today.getFullYear() &&
        eventDate.getMonth() === today.getMonth() &&
        eventDate.getDate() === today.getDate();

      if (!isSameDay) {
        toast.error("A presença só pode ser registrada no dia do evento.");
        return;
      }

      // Register attendance
      const { error: attendanceError } = await supabase.from("attendance").insert({
        event_id: event.id,
        user_id: user.id,
      });

      if (attendanceError) {
        if (attendanceError.code === "23505") {
          toast.info("Você já registrou presença neste evento!");
        } else {
          throw attendanceError;
        }
        return;
      }

      setEventTitle(event.title);
      setSuccess(true);
      toast.success("Presença registrada com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao registrar presença");
    } finally {
      setSubmitting(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCheckin();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-display text-lg">
          Presença <span className="text-primary italic">Igreja</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{profile?.full_name}</span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="w-20 h-20 rounded-full bg-primary mx-auto flex items-center justify-center mb-6"
              >
                <Check className="h-10 w-10 text-primary-foreground" strokeWidth={2.5} />
              </motion.div>
              <h2 className="font-display text-2xl text-foreground mb-2">Presença Registrada!</h2>
              <p className="text-muted-foreground">{eventTitle}</p>
              <Button
                variant="outline"
                className="mt-6 border-border"
                onClick={() => {
                  setSuccess(false);
                  setCode("");
                }}
              >
                Registrar outra presença
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm"
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-display tracking-tight">
                  Registrar <span className="italic text-primary">Presença</span>
                </h1>
                <p className="text-muted-foreground mt-2">
                  Insira o código fornecido pelo líder
                </p>
              </div>

              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Código do evento</Label>
                      <Input
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="ABC123"
                        maxLength={8}
                        className="bg-input border-border text-center text-2xl tracking-[0.3em] font-mono h-14"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={submitting} className="w-full h-12 text-base">
                      {submitting ? "Registrando..." : "Registrar Presença"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
