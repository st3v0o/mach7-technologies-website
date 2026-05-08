import { Hono } from "hono";
import { z } from "zod";
import { Resend } from "resend";
import type { Bindings, Variables } from "../index.js";

const contact = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  org: z.string().optional().default(""),
  message: z.string().min(1),
  recaptchaToken: z.string().optional(),
});

const DELIVER_TO = "info@mach7technologies.com";
const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const SCORE_THRESHOLD = 0.5;

async function verifyRecaptcha(
  token: string,
  secret: string,
): Promise<{ success: boolean; score: number }> {
  const params = new URLSearchParams({ secret, response: token });
  const res = await fetch(`${RECAPTCHA_VERIFY_URL}?${params.toString()}`, {
    method: "POST",
  });
  const data = (await res.json()) as {
    success: boolean;
    score?: number;
    action?: string;
  };
  return { success: data.success, score: data.score ?? 0 };
}

contact.post("/contact", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const { name, email, org, message, recaptchaToken } = parsed.data;

  if (recaptchaToken) {
    const secret = c.env.RECAPTCHA_SECRET_KEY;
    if (secret) {
      let result: { success: boolean; score: number };
      try {
        result = await verifyRecaptcha(recaptchaToken, secret);
      } catch {
        return c.json({ error: "CAPTCHA verification failed" }, 500);
      }
      if (!result.success || result.score < SCORE_THRESHOLD) {
        return c.json({ error: "CAPTCHA verification failed — possible bot activity" }, 400);
      }
    }
  }

  const resendKey = c.env.RESEND_EMAIL_KEY ?? c.env.RESEND_API_KEY;
  if (!resendKey) {
    return c.json({ error: "Email service is not configured" }, 500);
  }

  const resend = new Resend(resendKey);
  const subject = `Access Request from ${name}${org ? ` — ${org}` : ""}`;
  const html = `
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    ${org ? `<p><strong>Organization:</strong> ${org}</p>` : ""}
    <p><strong>Message:</strong></p>
    <p style="white-space: pre-wrap;">${message}</p>
  `;

  try {
    const { error: sendError } = await resend.emails.send({
      from: "MACH 7 Contact Form <noreply@mach7technologies.com>",
      to: [DELIVER_TO],
      replyTo: email,
      subject,
      html,
    });
    if (sendError) {
      return c.json({ error: "Failed to send email. Please try again." }, 500);
    }
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Failed to send email. Please try again." }, 500);
  }
});

export default contact;
