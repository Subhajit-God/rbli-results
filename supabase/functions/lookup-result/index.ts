// Public result-lookup endpoint with IP/day rate limiting + server-side attempt logging.
// Deployed with verify_jwt = false (public endpoint).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DAILY_LIMIT = 20;

function getIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function sanitizeStudentId(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const cleaned = v.trim().replace(/[\u0000-\u001F\u007F]/g, "");
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(cleaned)) return null;
  return cleaned;
}

function sanitizeClass(v: unknown): number | null {
  const n = typeof v === "string" ? parseInt(v, 10) : typeof v === "number" ? v : NaN;
  if (![5, 6, 7, 8, 9].includes(n)) return null;
  return n;
}

function sanitizeDob(v: unknown): string | null {
  if (typeof v !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  if (d > new Date() || d < new Date("1990-01-01")) return null;
  return v;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const ip = getIp(req);
  const ua = req.headers.get("user-agent")?.slice(0, 255) ?? null;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const studentId = sanitizeStudentId(body?.studentId);
  const classNumber = sanitizeClass(body?.classNumber);
  const dob = sanitizeDob(body?.dob);

  if (!studentId || !classNumber || !dob) {
    return new Response(
      JSON.stringify({ error: "Invalid input. Check Student ID, class, and date of birth." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // --- Rate limit check: count today's attempts from this IP (UTC day) ---
  const today = new Date().toISOString().slice(0, 10);
  const { count, error: countError } = await supabase
    .from("lookup_attempts")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ip)
    .eq("attempt_date", today);

  if (countError) {
    console.error("Rate-limit count error:", countError);
  } else if ((count ?? 0) >= DAILY_LIMIT) {
    return new Response(
      JSON.stringify({
        error: `Daily lookup limit reached (${DAILY_LIMIT}/day). Please try again tomorrow.`,
        rateLimited: true,
      }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // --- Activate any scheduled releases whose time has passed (no-op if none) ---
  await supabase.rpc("activate_scheduled_releases").catch(() => {});

  // --- Look up student ---
  const { data: students, error: studentError } = await supabase
    .from("students")
    .select("student_id, academic_year_id")
    .eq("student_id", studentId)
    .eq("class_number", classNumber)
    .eq("date_of_birth", dob)
    .limit(1);

  if (studentError) {
    console.error("Student lookup error:", studentError);
    return new Response(JSON.stringify({ error: "Lookup failed. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let success = false;
  let resultPayload: any = null;

  if (!students || students.length === 0) {
    resultPayload = { error: "Invalid details. Please check and try again.", code: "NOT_FOUND" };
  } else {
    const student = students[0];
    const { data: deployedExam, error: examError } = await supabase
      .from("exams")
      .select("id")
      .eq("id", student.academic_year_id)
      .eq("is_deployed", true)
      .maybeSingle();

    if (examError) {
      console.error("Exam lookup error:", examError);
      resultPayload = { error: "Lookup failed. Please try again.", code: "EXAM_ERROR" };
    } else if (!deployedExam) {
      resultPayload = {
        error: "Result not published yet for your academic year.",
        code: "NOT_DEPLOYED",
      };
    } else {
      success = true;
      resultPayload = { studentId: student.student_id, examId: deployedExam.id };
    }
  }

  // --- Log the attempt (don't fail request if logging fails) ---
  const { error: logError } = await supabase.from("lookup_attempts").insert({
    ip_address: ip,
    student_id: studentId,
    class_number: classNumber,
    success,
    user_agent: ua,
  });
  if (logError) console.error("Attempt log error:", logError);

  const remaining = Math.max(0, DAILY_LIMIT - ((count ?? 0) + 1));

  return new Response(
    JSON.stringify({ ...resultPayload, success, remaining }),
    {
      status: success ? 200 : (resultPayload?.code === "NOT_FOUND" ? 404 : 400),
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-RateLimit-Limit": String(DAILY_LIMIT),
        "X-RateLimit-Remaining": String(remaining),
      },
    },
  );
});
