import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const PIE_COLORS = ["hsl(43 96% 58%)", "hsl(200 70% 50%)", "hsl(150 60% 45%)", "hsl(15 70% 50%)"];

export default function ReportsPage() {
  const [monthlyData, setMonthlyData] = useState<{ month: string; total: number }[]>([]);
  const [typeData, setTypeData] = useState<{ name: string; value: number }[]>([]);
  const [absentees, setAbsentees] = useState<{ name: string; missed: number }[]>([]);

  useEffect(() => {
    fetchReportData();
  }, []);

  async function fetchReportData() {
    // Get all events with attendance
    const { data: events } = await supabase
      .from("events")
      .select("id, title, event_date, event_type, attendance(id, user_id)");

    if (!events) return;

    // Monthly attendance
    const monthly: Record<string, number> = {};
    events.forEach((e) => {
      const month = new Date(e.event_date).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      monthly[month] = (monthly[month] || 0) + (Array.isArray(e.attendance) ? e.attendance.length : 0);
    });
    setMonthlyData(Object.entries(monthly).map(([month, total]) => ({ month, total })));

    // By type
    const types: Record<string, number> = {};
    events.forEach((e) => {
      types[e.event_type] = (types[e.event_type] || 0) + (Array.isArray(e.attendance) ? e.attendance.length : 0);
    });
    setTypeData(Object.entries(types).map(([name, value]) => ({ name, value })));

    // Absentees - members who attended least
    const { data: allMembers } = await supabase.from("profiles").select("user_id, full_name");
    if (allMembers && events.length > 0) {
      const attendanceCount: Record<string, number> = {};
      events.forEach((e) => {
        if (Array.isArray(e.attendance)) {
          e.attendance.forEach((a) => {
            attendanceCount[a.user_id] = (attendanceCount[a.user_id] || 0) + 1;
          });
        }
      });

      const absent = allMembers
        .map((m) => ({
          name: m.full_name || "Sem nome",
          missed: events.length - (attendanceCount[m.user_id] || 0),
        }))
        .filter((m) => m.missed > 0)
        .sort((a, b) => b.missed - a.missed)
        .slice(0, 10);
      setAbsentees(absent);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">Análise da frequência da comunidade</p>
      </div>

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
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(222 47% 13%)",
                      border: "1px solid hsl(217 19% 20%)",
                      borderRadius: "8px",
                      color: "hsl(210 40% 98%)",
                    }}
                  />
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
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(222 47% 13%)",
                      border: "1px solid hsl(217 19% 20%)",
                      borderRadius: "8px",
                      color: "hsl(210 40% 98%)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-12">Sem dados ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">Lista de Faltas</CardTitle>
        </CardHeader>
        <CardContent>
          {absentees.length > 0 ? (
            <div className="space-y-2">
              {absentees.map((m) => (
                <div key={m.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-foreground">{m.name}</span>
                  <span className="text-sm text-destructive tabular-nums">{m.missed} faltas</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Sem dados de faltas.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
