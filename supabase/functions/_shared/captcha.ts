// Shared Google reCAPTCHA v2 verification helper.
// Uses RECAPTCHA_SECRET_KEY from edge-function environment.

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

export interface CaptchaVerifyResult {
  ok: boolean;
  reason?: string;
  raw?: any;
}

export async function verifyCaptcha(token: unknown, remoteIp?: string): Promise<CaptchaVerifyResult> {
  if (typeof token !== "string" || token.length < 10 || token.length > 4000) {
    return { ok: false, reason: "Captcha token missing or invalid" };
  }

  const secret = Deno.env.get("RECAPTCHA_SECRET_KEY");
  if (!secret) {
    console.error("RECAPTCHA_SECRET_KEY not configured");
    return { ok: false, reason: "Captcha not configured on server" };
  }

  const params = new URLSearchParams();
  params.set("secret", secret);
  params.set("response", token);
  if (remoteIp) params.set("remoteip", remoteIp);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await res.json();

    if (!data.success) {
      const codes: string[] = data["error-codes"] ?? [];
      const expired = codes.includes("timeout-or-duplicate");
      return {
        ok: false,
        reason: expired ? "Captcha expired. Please try again." : "Captcha failed",
        raw: data,
      };
    }
    return { ok: true, raw: data };
  } catch (err) {
    console.error("Captcha verify network error:", err);
    return { ok: false, reason: "Captcha verification unavailable" };
  }
}
