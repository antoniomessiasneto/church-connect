import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { Download, UserX, History, Search } from "lucide-react";
import { motion } from "framer-motion";

const PIE_COLORS = ["hsl(43 96% 58%)", "hsl(200 70% 50%)", "hsl(150 60% 45%)", "hsl(15 70% 50%)"];

interface EventWithAttendance {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
  attendance: { id: string; user_id: string }[];
}

interface Profile {
  user_id: string;
  full_name: string;
  phone: string | null;
}

export default function ReportsPage() {
  const [events, setEvents] = useState<EventWithAttendance[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; total: number }[]>([]);
  const [typeData, setTypeData] = useState<{ name: string; value: number }[]>([]);
  const [absentees, setAbsentees] = useState<{ name: string; missed: number; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Absence per event
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [eventAbsentees, setEventAbsentees] = useState<Profile[]>([]);

  // Member history
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [memberHistory, setMemberHistory] = useState<{ event: string; date: string; present: boolean }[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  // Trend line
  const [trendData, setTrendData] = useState<{ date: string; presença: number }[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // Fetch last 12 months of events with limit
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    const [eventsRes, membersRes] = await Promise.all([
      supabase
        .from("events")
        .select("id, title, event_date, event_type, attendance(id, user_id)")
        .gte("event_date", twelveMonthsAgo.toISOString())
        .order("event_date", { ascending: false })
        .limit(200),
      supabase.from("profiles").select("user_id, full_name, phone"),
    ]);

    const evts = eventsRes.data || [];
    const mbrs = membersRes.data || [];
    setEvents(evts);
    setMembers(mbrs);

    // Monthly attendance
    const monthly: Record<string, number> = {};
    evts.forEach((e) => {
      const month = new Date(e.event_date).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      monthly[month] = (monthly[month] || 0) + (e.attendance?.length || 0);
    });
    setMonthlyData(Object.entries(monthly).map(([month, total]) => ({ month, total })));

    // By type
    const types: Record<string, number> = {};
    evts.forEach((e) => {
      types[e.event_type] = (types[e.event_type] || 0) + (e.attendance?.length || 0);
    });
    setTypeData(Object.entries(types).map(([name, value]) => ({ name, value })));

    // Trend line - attendance per event over time
    setTrendData(evts.map((e) => ({
      date: new Date(e.event_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      presença: e.attendance?.length || 0,
    })));

    // Global absentees
    if (mbrs.length > 0 && evts.length > 0) {
      const attendanceCount: Record<string, number> = {};
      evts.forEach((e) => {
        e.attendance?.forEach((a) => {
          attendanceCount[a.user_id] = (attendanceCount[a.user_id] || 0) + 1;
        });
      });

      const absent = mbrs
        .map((m) => ({
          name: m.full_name || "Sem nome",
          missed: evts.length - (attendanceCount[m.user_id] || 0),
          total: evts.length,
        }))
        .filter((m) => m.missed > 0)
        .sort((a, b) => b.missed - a.missed)
        .slice(0, 15);
      setAbsentees(absent);
    }

    setLoading(false);
  }

  // When event is selected, compute absentees for that event
  useEffect(() => {
    if (!selectedEventId || events.length === 0) {
      setEventAbsentees([]);
      return;
    }
    const event = events.find((e) => e.id === selectedEventId);
    if (!event) return;
    const presentIds = new Set(event.attendance?.map((a) => a.user_id) || []);
    setEventAbsentees(members.filter((m) => !presentIds.has(m.user_id)));
  }, [selectedEventId, events, members]);

  const openMemberHistory = (member: Profile) => {
    setSelectedMember(member);
    const history = events.map((e) => ({
      event: e.title,
      date: new Date(e.event_date).toLocaleDateString("pt-BR"),
      present: e.attendance?.some((a) => a.user_id === member.user_id) || false,
    }));
    setMemberHistory(history.reverse());
    setHistoryOpen(true);
  };

  const filteredMembers = members.filter((m) =>
    m.full_name.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // Export CSV
  const exportCSV = (type: "attendance" | "absences" | "history") => {
    let csv = "";
    let filename = "";

    if (type === "attendance") {
      csv = "Evento,Data,Tipo,Presenças\n";
      events.forEach((e) => {
        csv += `"${e.title}","${new Date(e.event_date).toLocaleDateString("pt-BR")}","${e.event_type}",${e.attendance?.length || 0}\n`;
      });
      filename = "relatorio_presencas.csv";
    } else if (type === "absences") {
      csv = "Membro,Faltas,Total de Eventos\n";
      absentees.forEach((a) => {
        csv += `"${a.name}",${a.missed},${a.total}\n`;
      });
      filename = "relatorio_faltas.csv";
    } else if (type === "history" && selectedMember) {
      csv = "Evento,Data,Presente\n";
      memberHistory.forEach((h) => {
        csv += `"${h.event}","${h.date}","${h.present ? "Sim" : "Não"}"\n`;
      });
      filename = `historico_${selectedMember.full_name.replace(/\s+/g, "_")}.csv`;
    }

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tooltipStyle = {
    backgroundColor: "hsl(222 47% 13%)",
    border: "1px solid hsl(217 19% 20%)",
    borderRadius: "8px",
    color: "hsl(210 40% 98%)",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-display tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground text-center py-12">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">Análise completa da frequência da comunidade</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCSV("attendance")} className="border-border gap-2">
            <Download className="h-4 w-4" strokeWidth={1.5} />
            Exportar Presenças
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV("absences")} className="border-border gap-2">
            <Download className="h-4 w-4" strokeWidth={1.5} />
            Exportar Faltas
          </Button>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg">Tendência Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 20%)" />
                  <XAxis dataKey="month" stroke="hsl(215 20% 65%)" fontSize={12} />
                  <YAxis stroke="hsl(215 20% 65%)" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="total" fill="hsl(43 96% 58%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-12">Sem dados ainda.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg">Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {typeData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-12">Sem dados ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trend Line */}
      {trendData.length > 1 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg">Evolução de Presenças por Evento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 20%)" />
                <XAxis dataKey="date" stroke="hsl(215 20% 65%)" fontSize={12} />
                <YAxis stroke="hsl(215 20% 65%)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="presença" stroke="hsl(43 96% 58%)" strokeWidth={2} dot={{ fill: "hsl(43 96% 58%)", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Absence per Event */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <UserX className="h-5 w-5 text-destructive" strokeWidth={1.5} />
            Lista de Faltas por Evento
          </CardTitle>
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-full sm:w-[280px] bg-input border-border">
              <SelectValue placeholder="Selecione um evento" />
            </SelectTrigger>
            <SelectContent>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title} — {new Date(e.event_date).toLocaleDateString("pt-BR")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {!selectedEventId ? (
            <p className="text-muted-foreground text-center py-8">Selecione um evento para ver quem faltou.</p>
          ) : eventAbsentees.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Todos os membros estiveram presentes! 🎉</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">{eventAbsentees.length} membro(s) ausente(s)</p>
              {eventAbsentees.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-primary font-display text-sm">
                      {m.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-foreground">{m.full_name}</span>
                      {m.phone && <p className="text-xs text-muted-foreground">{m.phone}</p>}
                    </div>
                  </div>
                  <span className="text-xs text-destructive font-medium">Ausente</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Global Absences Ranking */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">Ranking de Faltas (Geral)</CardTitle>
        </CardHeader>
        <CardContent>
          {absentees.length > 0 ? (
            <div className="space-y-2">
              {absentees.map((m) => (
                <div key={m.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-foreground">{m.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-destructive tabular-nums">{m.missed} faltas de {m.total}</span>
                    <div className="w-20 bg-secondary rounded-full h-2">
                      <div
                        className="bg-destructive h-2 rounded-full"
                        style={{ width: `${(m.missed / m.total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Sem dados de faltas.</p>
          )}
        </CardContent>
      </Card>

      {/* Member History */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-primary" strokeWidth={1.5} />
            Histórico por Membro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <Input
              placeholder="Buscar membro..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
          <div className="grid gap-2 max-h-[400px] overflow-y-auto">
            {filteredMembers.map((m) => {
              const attended = events.filter((e) => e.attendance?.some((a) => a.user_id === m.user_id)).length;
              const pct = events.length > 0 ? Math.round((attended / events.length) * 100) : 0;
              return (
                <motion.button
                  key={m.user_id}
                  onClick={() => openMemberHistory(m)}
                  className="flex items-center justify-between py-3 px-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors text-left w-full"
                  whileHover={{ x: 4 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-primary font-display text-sm">
                      {m.full_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-foreground font-medium">{m.full_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground tabular-nums">{attended}/{events.length}</span>
                    <span className={`text-sm font-medium tabular-nums ${pct >= 70 ? "text-green-500" : pct >= 40 ? "text-yellow-500" : "text-destructive"}`}>
                      {pct}%
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Member History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Histórico — {selectedMember?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-end mb-2">
            <Button variant="outline" size="sm" onClick={() => exportCSV("history")} className="border-border gap-2">
              <Download className="h-4 w-4" strokeWidth={1.5} />
              Exportar CSV
            </Button>
          </div>
          {memberHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum evento registrado.</p>
          ) : (
            <div className="space-y-2">
              {memberHistory.map((h, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-foreground text-sm">{h.event}</p>
                    <p className="text-xs text-muted-foreground">{h.date}</p>
                  </div>
                  <span className={`text-sm font-medium ${h.present ? "text-green-500" : "text-destructive"}`}>
                    {h.present ? "✓ Presente" : "✗ Ausente"}
                  </span>
                </div>
              ))}
              <div className="pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Frequência: <span className="text-foreground font-medium">
                    {memberHistory.filter((h) => h.present).length}/{memberHistory.length}
                    {" "}({Math.round((memberHistory.filter((h) => h.present).length / memberHistory.length) * 100)}%)
                  </span>
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
