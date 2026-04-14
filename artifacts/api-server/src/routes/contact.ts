import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { Resend } from "resend";

const router: IRouter = Router();

const ContactRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  org: z.string().optional().default(""),
  message: z.string().min(1, "Message is required"),
  recaptchaToken: z.string().min(1, "CAPTCHA token is required"),
});

const CONTACT_EMAIL = "info@mach7technologies.com";
const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const SCORE_THRESHOLD = 0.5;

const RecaptchaVerifyResponseSchema = z.object({
  success: z.boolean(),
  score: z.number().optional().default(0),
  action: z.string().optional(),
  hostname: z.string().optional(),
  "error-codes": z.array(z.string()).optional(),
});

const ContactSuccessResponseSchema = z.object({ success: z.literal(true) });
const ContactErrorResponseSchema = z.object({ error: z.string() });

async function verifyRecaptcha(token: string, expectedAction: string): Promise<{ success: boolean; score: number }> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    throw new Error("RECAPTCHA_SECRET_KEY is not configured");
  }

  const params = new URLSearchParams({ secret, response: token });
  const res = await fetch(`${RECAPTCHA_VERIFY_URL}?${params.toString()}`, { method: "POST" });
  const raw = await res.json();
  const data = RecaptchaVerifyResponseSchema.parse(raw);

  if (data.action && data.action !== expectedAction) {
    return { success: false, score: 0 };
  }

  return { success: data.success, score: data.score };
}

router.post("/contact", async (req: Request, res: Response) => {
  const parsed = ContactRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const { name, org, message, recaptchaToken } = parsed.data;

  let captchaResult: { success: boolean; score: number };
  try {
    captchaResult = await verifyRecaptcha(recaptchaToken, "contact_form");
  } catch (err) {
    res.status(500).json(ContactErrorResponseSchema.parse({ error: "CAPTCHA verification failed" }));
    return;
  }

  if (!captchaResult.success || captchaResult.score < SCORE_THRESHOLD) {
    res.status(400).json(ContactErrorResponseSchema.parse({ error: "CAPTCHA verification failed — possible bot activity" }));
    return;
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    res.status(500).json(ContactErrorResponseSchema.parse({ error: "Email service is not configured" }));
    return;
  }

  const resend = new Resend(resendKey);

  const subject = `Access Request from ${name}${org ? ` — ${org}` : ""}`;
  const html = `
    <p><strong>Name:</strong> ${name}</p>
    ${org ? `<p><strong>Organization:</strong> ${org}</p>` : ""}
    <p><strong>Message:</strong></p>
    <p style="white-space: pre-wrap;">${message}</p>
    <hr/>
    <p style="color: #888; font-size: 12px;">reCAPTCHA score: ${captchaResult.score.toFixed(2)}</p>
  `;

  try {
    await resend.emails.send({
      from: "MACH 7 Contact Form <onboarding@resend.dev>",
      to: [CONTACT_EMAIL],
      subject,
      html,
      replyTo: undefined,
    });

    res.json(ContactSuccessResponseSchema.parse({ success: true }));
  } catch (err) {
    res.status(500).json(ContactErrorResponseSchema.parse({ error: "Failed to send email. Please try again." }));
  }
});

export default router;
