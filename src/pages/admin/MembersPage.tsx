import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, Pencil, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Member {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  birth_date: string | null;
  created_at: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);

  // Create form
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newBirthDate, setNewBirthDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [tempCredentials, setTempCredentials] = useState<{ email: string; password: string } | null>(null);

  // Edit form
  const [saving, setSaving] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");

  // Delete
  const [deleting, setDeleting] = useState(false);
  const [deleteMember, setDeleteMember] = useState<Member | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, phone, address, birth_date, created_at")
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      if (!newBirthDate) {
        toast.error("Data de nascimento é obrigatória.");
        setCreating(false);
        return;
      }
      if (!newPassword || newPassword.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres.");
        setCreating(false);
        return;
      }

      const res = await supabase.functions.invoke("create-member", {
        body: { 
          email: newEmail, 
          full_name: newName, 
          phone: newPhone || null,
          birth_date: newBirthDate,
          password: newPassword,
        },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      setTempCredentials({ email: newEmail, password: newPassword });
      setDialogOpen(false);
      setCredentialsDialogOpen(true);
      setNewEmail("");
      setNewName("");
      setNewPhone("");
      setNewPassword("");
      setNewBirthDate("");
      fetchMembers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar membro");
    } finally {
      setCreating(false);
    }
  };

  const openEditDialog = (member: Member) => {
    setEditMember(member);
    setEditName(member.full_name);
    setEditPhone(member.phone || "");
    setEditAddress(member.address || "");
    setEditBirthDate(member.birth_date || "");
    setEditDialogOpen(true);
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMember) return;
    setSaving(true);
    try {
      const res = await supabase.functions.invoke("update-member", {
        body: {
          user_id: editMember.user_id,
          full_name: editName,
          phone: editPhone || null,
          address: editAddress || null,
          birth_date: editBirthDate || null,
        },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      toast.success("Membro atualizado com sucesso!");
      setEditDialogOpen(false);
      fetchMembers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar membro");
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (member: Member) => {
    setDeleteMember(member);
    setDeleteDialogOpen(true);
  };

  const handleDeleteMember = async () => {
    if (!deleteMember) return;
    setDeleting(true);
    try {
      const res = await supabase.functions.invoke("delete-member", {
        body: { user_id: deleteMember.user_id },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      toast.success("Membro excluído com sucesso!");
      setDeleteDialogOpen(false);
      setMembers((prev) => prev.filter((m) => m.user_id !== deleteMember.user_id));
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir membro");
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
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
                <Label className="text-muted-foreground text-sm">Senha</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" className="bg-input border-border" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Telefone</Label>
                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="bg-input border-border" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Data de nascimento</Label>
                <Input type="date" value={newBirthDate} onChange={(e) => setNewBirthDate(e.target.value)} required className="bg-input border-border" />
              </div>
              <Button type="submit" disabled={creating} className="w-full">
                {creating ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Credentials Dialog */}
      <Dialog open={credentialsDialogOpen} onOpenChange={setCredentialsDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Membro Cadastrado!</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Anote as credenciais temporárias abaixo. O membro deve trocar a senha no primeiro acesso.
            </DialogDescription>
          </DialogHeader>
          {tempCredentials && (
            <div className="space-y-4">
              <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">E-mail</p>
                    <p className="text-foreground font-mono text-sm">{tempCredentials.email}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(tempCredentials.email)}>
                    <Copy className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Senha temporária</p>
                    <p className="text-foreground font-mono text-sm">{tempCredentials.password}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(tempCredentials.password)}>
                    <Copy className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠️ Estas credenciais são exibidas apenas uma vez. Compartilhe com o membro de forma segura.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Editar Membro</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditMember} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Nome completo</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} required className="bg-input border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Telefone</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="bg-input border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Endereço</Label>
              <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="bg-input border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Data de nascimento</Label>
              <Input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} className="bg-input border-border" />
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Excluir Membro</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir <strong className="text-foreground">{deleteMember?.full_name}</strong>? 
              Esta ação é irreversível e removerá todos os dados deste membro.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="border-border">
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteMember} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground tabular-nums hidden sm:block">
                      {new Date(member.created_at).toLocaleDateString("pt-BR")}
                    </p>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(member)} className="text-muted-foreground hover:text-primary">
                      <Pencil className="h-4 w-4" strokeWidth={1.5} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(member)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
