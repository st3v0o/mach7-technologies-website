const DELIVER_TO = "info@mach7technologies.com";
const FROM = "MACH 7 Contact Form <noreply@mach7technologies.com>";
const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const SCORE_THRESHOLD = 0.5;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://mach7technologies.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { name, email, org = "", message, recaptchaToken } = body ?? {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return json({ error: "Name is required" }, 400);
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return json({ error: "Valid email is required" }, 400);
  }
  if (!message || typeof message !== "string" || !message.trim()) {
    return json({ error: "Message is required" }, 400);
  }

  // reCAPTCHA verification (skip gracefully if secret not configured)
  const recaptchaSecret = env.RECAPTCHA_SECRET_KEY;
  if (recaptchaSecret && recaptchaToken) {
    try {
      const params = new URLSearchParams({
        secret: recaptchaSecret,
        response: recaptchaToken,
      });
      const captchaRes = await fetch(`${RECAPTCHA_VERIFY_URL}?${params}`, { method: "POST" });
      const captchaData = await captchaRes.json();

      if (!captchaData.success || (captchaData.score ?? 0) < SCORE_THRESHOLD) {
        return json({ error: "CAPTCHA verification failed — possible bot activity" }, 400);
      }
    } catch {
      return json({ error: "CAPTCHA verification failed" }, 500);
    }
  }

  const resendKey = env.RESEND_EMAIL_KEY;
  if (!resendKey) {
    return json({ error: "Email service is not configured" }, 500);
  }

  const subject = `Access Request from ${name.trim()}${org ? ` — ${org.trim()}` : ""}`;
  const html = `
    <p><strong>Name:</strong> ${name.trim()}</p>
    <p><strong>Email:</strong> ${email.trim()}</p>
    ${org ? `<p><strong>Organization:</strong> ${org.trim()}</p>` : ""}
    <p><strong>Message:</strong></p>
    <p style="white-space: pre-wrap;">${message.trim()}</p>
  `;

  try {
    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [DELIVER_TO],
        reply_to: email.trim(),
        subject,
        html,
      }),
    });

    if (!sendRes.ok) {
      const err = await sendRes.json().catch(() => ({}));
      console.error("Resend error:", err);
      return json({ error: "Failed to send email. Please try again." }, 500);
    }

    return json({ success: true });
  } catch (err) {
    console.error("Send error:", err);
    return json({ error: "Failed to send email. Please try again." }, 500);
  }
}
