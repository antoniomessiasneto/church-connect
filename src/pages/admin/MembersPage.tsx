import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Member {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  created_at: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, phone, created_at")
      .order("full_name");

    if (data) setMembers(data);
    if (error) console.error(error);
    setLoading(false);
  }

  const filtered = members.filter((m) =>
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (m.phone && m.phone.includes(search))
  );

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      // Sign up user (they'll get email confirmation)
      const { error } = await supabase.auth.signUp({
        email: newEmail,
        password: Math.random().toString(36).slice(-10) + "A1!", // temp password
        options: {
          data: { full_name: newName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      toast.success("Membro cadastrado! Um e-mail de confirmação foi enviado.");
      setDialogOpen(false);
      setNewEmail("");
      setNewName("");
      setNewPhone("");
      setTimeout(fetchMembers, 2000);
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar membro");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display tracking-tight">Membros</h1>
          <p className="text-muted-foreground">Gestão da comunidade</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Novo Membro
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Cadastrar Membro</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateMember} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Nome completo</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} required className="bg-input border-border" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">E-mail</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required className="bg-input border-border" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Telefone</Label>
                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="bg-input border-border" />
              </div>
              <Button type="submit" disabled={creating} className="w-full">
                {creating ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card border-border"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-12">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum membro encontrado.</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
            >
              <Card className="bg-card border-border hover:-translate-y-0.5 transition-transform duration-200">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary font-display text-lg">
                      {member.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{member.full_name || "Sem nome"}</p>
                      <p className="text-sm text-muted-foreground">{member.phone || "Sem telefone"}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {new Date(member.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
