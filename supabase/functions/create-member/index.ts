import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const getAllowedOrigin = (req: Request): string => {
  const appUrl = Deno.env.get("APP_URL");
  if (appUrl) return appUrl;
  const origin = req.headers.get("Origin") || "*";
  return origin;
};

function getCorsHeaders(req: Request) {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(req),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await callerClient.from("user_roles").select("role").eq("user_id", caller.id);
    const isAdmin = roles?.some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem cadastrar membros" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, full_name, phone, birth_date, password } = await req.json();

    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: "Email e nome são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!password || password.length < 6) {
      return new Response(JSON.stringify({ error: "Senha é obrigatória e deve ter pelo menos 6 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const tempPassword = crypto.randomUUID().slice(0, 12) + "A1!";

    const { data: newUser, error: signUpError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (signUpError) {
      const msg = signUpError.message || "";
      if (msg.includes("already") || msg.includes("duplicate") || msg.includes("registered")) {
        return new Response(JSON.stringify({ error: "Este e-mail já está cadastrado. Tente outro e-mail." }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: signUpError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update phone and birth_date if provided
    if (newUser.user) {
      const updates: Record<string, any> = {};
      if (phone) updates.phone = phone;
      if (birth_date) updates.birth_date = birth_date;
      if (Object.keys(updates).length > 0) {
        await adminClient.from("profiles").update(updates).eq("user_id", newUser.user.id);
      }
    }

    // Generate password reset link so member can set their own password
    let resetLink: string | null = null;
    try {
      const { data: linkData } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      if (linkData?.properties?.action_link) {
        resetLink = linkData.properties.action_link;
      }
    } catch {
      // Non-critical, continue
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user_id: newUser.user?.id,
      temp_password: tempPassword,
      reset_link: resetLink,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro interno";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
