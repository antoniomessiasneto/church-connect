import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "member";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profile: { full_name: string; phone: string | null; avatar_url: string | null } | null;
  loading: boolean;
  authError: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  profile: null,
  loading: true,
  authError: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const fetchingRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        if (!fetchingRef.current) {
          fetchingRef.current = true;
          fetchUserData(session.user.id).finally(() => {
            fetchingRef.current = false;
          });
        }
      } else {
        setRole(null);
        setProfile(null);
        setAuthError(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserData(userId: string) {
    try {
      const [rolesRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("full_name, phone, avatar_url").eq("user_id", userId).single(),
      ]);

      if (rolesRes.error) {
        console.error("Erro ao buscar role:", rolesRes.error);
        setRole(null);
        setAuthError(true);
        setLoading(false);
        return;
      }

      setAuthError(false);

      if (rolesRes.data && rolesRes.data.length > 0) {
        const hasAdmin = rolesRes.data.some((r) => r.role === "admin");
        setRole(hasAdmin ? "admin" : "member");
      } else {
        setRole("member");
      }

      if (profileRes.data) {
        setProfile(profileRes.data);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setRole(null);
      setAuthError(true);
    } finally {
      setLoading(false);
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
    setProfile(null);
    setAuthError(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, profile, loading, authError, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
