import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QRCodeSVG } from "qrcode.react";
import { CalendarPlus, Copy, QrCode } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Event {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
  attendance_code: string;
  is_active: boolean;
  attendance: { id: string }[];
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Form
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("culto");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    const { data, error } = await supabase
      .from("events")
      .select("id, title, event_date, event_type, attendance_code, is_active, attendance(id)")
      .order("event_date", { ascending: false });

    if (data) setEvents(data);
    if (error) console.error(error);
    setLoading(false);
  }

  function generateCode() {
    const arr = new Uint8Array(4);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(36))
      .join("")
      .substring(0, 6)
      .toUpperCase();
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    try {
      const code = generateCode();
      const { error } = await supabase.from("events").insert({
        title,
        event_date: new Date(eventDate).toISOString(),
        event_type: eventType,
        attendance_code: code,
        created_by: user.id,
      });
      if (error) throw error;
      toast.success("Evento criado com sucesso!");
      setCreateOpen(false);
      setTitle("");
      setEventDate("");
      fetchEvents();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar evento");
    } finally {
      setCreating(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  };

  const showQr = (event: Event) => {
    setSelectedEvent(event);
    setQrOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display tracking-tight">Presenças</h1>
          <p className="text-muted-foreground">Gerencie eventos e registros de presença</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <CalendarPlus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Criar Evento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Culto de Domingo" className="bg-input border-border" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Data e Hora</Label>
                <Input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required className="bg-input border-border" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Tipo</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="culto">Culto</SelectItem>
                    <SelectItem value="estudo">Estudo Bíblico</SelectItem>
                    <SelectItem value="reuniao">Reunião</SelectItem>
                    <SelectItem value="evento">Evento Especial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={creating} className="w-full">
                {creating ? "Criando..." : "Criar Evento"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-center">{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-foreground p-4 rounded-lg border border-primary/20 shadow-[0_0_30px_hsl(43_96%_58%/0.1)]">
                <QRCodeSVG
                  value={`${window.location.origin}/checkin?code=${selectedEvent.attendance_code}`}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              <div className="flex items-center gap-2 bg-secondary rounded-md px-4 py-2">
                <span className="font-mono text-lg tracking-[0.3em] text-foreground">
                  {selectedEvent.attendance_code}
                </span>
                <Button variant="ghost" size="sm" onClick={() => copyCode(selectedEvent.attendance_code)}>
                  <Copy className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Compartilhe este QR Code ou código com os membros
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {loading ? (
        <p className="text-muted-foreground text-center py-12">Carregando...</p>
      ) : events.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum evento criado ainda.</p>
      ) : (
        <div className="grid gap-3">
          {events.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
            >
              <Card className="bg-card border-border hover:-translate-y-0.5 transition-transform duration-200">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium text-foreground">{event.title}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {new Date(event.event_date).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="text-xs text-primary">
                        {Array.isArray(event.attendance) ? event.attendance.length : 0} presenças
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => showQr(event)} className="border-border">
                    <QrCode className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    QR Code
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
