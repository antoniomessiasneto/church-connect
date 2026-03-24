import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CalendarCheck, TrendingUp, UserCheck, CalendarPlus, QrCode } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ members: 0, events: 0, totalAttendance: 0, activeEvents: 0 });
  const [chartData, setChartData] = useState<{ name: string; presenças: number }[]>([]);

  useEffect(() => {
    fetchStats();
    fetchChartData();
  }, []);

  async function fetchStats() {
    const [membersRes, eventsRes, attendanceRes, activeRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("events").select("id", { count: "exact", head: true }),
      supabase.from("attendance").select("id", { count: "exact", head: true }),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);
    setStats({
      members: membersRes.count ?? 0,
      events: eventsRes.count ?? 0,
      totalAttendance: attendanceRes.count ?? 0,
      activeEvents: activeRes.count ?? 0,
    });
  }

  async function fetchChartData() {
    const { data } = await supabase
      .from("events")
      .select("title, attendance(id)")
      .order("event_date", { ascending: false })
      .limit(7);

    if (data) {
      setChartData(
        data.reverse().map((e) => ({
          name: e.title.length > 12 ? e.title.slice(0, 12) + "…" : e.title,
          presenças: Array.isArray(e.attendance) ? e.attendance.length : 0,
        }))
      );
    }
  }

  const cards = [
    { title: "Membros", value: stats.members, icon: Users, color: "text-primary" },
    { title: "Eventos", value: stats.events, icon: CalendarCheck, color: "text-primary" },
    { title: "Presenças Totais", value: stats.totalAttendance, icon: UserCheck, color: "text-primary" },
    { title: "Eventos Ativos", value: stats.activeEvents, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display tracking-tight">
          Bem-vindo, <span className="italic text-primary">{profile?.full_name || "Admin"}</span>
        </h1>
        <p className="text-muted-foreground mt-1">Saúde da Comunidade</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <Card className="bg-card border-border hover:-translate-y-0.5 transition-transform duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-body text-muted-foreground font-medium">
                  {card.title}
                </CardTitle>
                <card.icon className={`h-4 w-4 ${card.color}`} strokeWidth={1.5} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tabular-nums">{card.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-xl">Frequência dos Irmãos</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 20%)" />
                <XAxis dataKey="name" stroke="hsl(215 20% 65%)" fontSize={12} />
                <YAxis stroke="hsl(215 20% 65%)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222 47% 13%)",
                    border: "1px solid hsl(217 19% 20%)",
                    borderRadius: "8px",
                    color: "hsl(210 40% 98%)",
                  }}
                />
                <Bar dataKey="presenças" fill="hsl(43 96% 58%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-12">
              Nenhum dado de presença ainda. Crie eventos e registre presenças.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
