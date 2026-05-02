// Verifies a reCAPTCHA token before the client proceeds with admin login/register.
// Public endpoint (verify_jwt = false). Logs failed attempts via activity_logs (best effort).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyCaptcha } from "../_shared/captcha.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ip = getIp(req);
  const action = typeof body?.action === "string" ? body.action.slice(0, 32) : "unknown";

  const result = await verifyCaptcha(body?.captchaToken, ip);

  if (!result.ok) {
    // Best-effort log of failed captcha. Uses service role to bypass RLS for logging.
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      await supabase.from("activity_logs").insert({
        action: "CAPTCHA_FAILED",
        details: {
          context: action,
          ip,
          reason: result.reason,
          codes: result.raw?.["error-codes"] ?? null,
        },
      });
    } catch (e) {
      console.error("Failed to log captcha failure", e);
    }

    return new Response(
      JSON.stringify({ ok: false, error: result.reason ?? "Captcha failed" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
