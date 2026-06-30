import { createRequire } from "node:module";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const require = createRequire(import.meta.url);

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  from: string;
  appUrl: string;
}

async function getDbSetting(key: string): Promise<string | null> {
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  // DB settings take priority; env vars are the fallback
  const host = (await getDbSetting("smtp_host")) ?? process.env.SMTP_HOST ?? "";
  const user = (await getDbSetting("smtp_user")) ?? process.env.SMTP_USER ?? "";
  const pass = (await getDbSetting("smtp_pass")) ?? process.env.SMTP_PASS ?? "";
  const port = parseInt((await getDbSetting("smtp_port")) ?? process.env.SMTP_PORT ?? "587", 10);
  const secure = ((await getDbSetting("smtp_secure")) ?? process.env.SMTP_SECURE ?? "false") === "true";
  const from = (await getDbSetting("smtp_from")) ?? process.env.SMTP_FROM ?? "GoWin <noreply@gowin.com>";
  const appUrl = (await getDbSetting("app_url")) ?? process.env.APP_URL ?? "";

  if (!host || !user || !pass) return null;
  return { host, port, user, pass, secure, from, appUrl };
}

async function sendMail(opts: MailOptions): Promise<boolean> {
  const cfg = await getSmtpConfig();
  if (!cfg) {
    logger.warn({ to: opts.to, subject: opts.subject }, "SMTP not configured — email not sent");
    return false;
  }
  try {
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    await transporter.sendMail({ from: cfg.from, ...opts });
    logger.info({ to: opts.to, subject: opts.subject }, "Email sent");
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to send email");
    return false;
  }
}

export async function sendTestEmail(to: string): Promise<boolean> {
  return sendMail({
    to,
    subject: "GoWin — Email Configuration Test",
    text: "This is a test email from your GoWin Sportsbook. Your email settings are working correctly.",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1a1a">Email Test Successful</h2>
        <p>This is a test email from your <strong>GoWin Sportsbook</strong> admin panel.</p>
        <p style="color:#666;font-size:14px">Your SMTP configuration is working correctly. Users will now receive email notifications for password resets, OTP codes, and account alerts.</p>
        <p style="color:#666;font-size:14px">— The GoWin Admin Panel</p>
      </div>
    `,
  });
}

export async function sendOtpEmail(to: string, username: string, otp: string): Promise<boolean> {
  return sendMail({
    to,
    subject: "GoWin — Password Reset Code",
    text: `Hi ${username},\n\nYour password reset code is: ${otp}\n\nThis code expires in 10 minutes. If you did not request this, please ignore this email.\n\nGoWin Team`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1a1a">Password Reset Code</h2>
        <p>Hi <strong>${username}</strong>,</p>
        <p>Use the code below to reset your GoWin password:</p>
        <div style="background:#f4f4f4;border-radius:8px;padding:24px;text-align:center;margin:24px 0">
          <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1a1a1a">${otp}</span>
        </div>
        <p style="color:#666;font-size:14px">This code expires in <strong>10 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
        <p style="color:#666;font-size:14px">— The GoWin Team</p>
      </div>
    `,
  });
}

export async function sendTempPasswordEmail(to: string, username: string, tempPassword: string): Promise<boolean> {
  return sendMail({
    to,
    subject: "GoWin — Temporary Password",
    text: `Hi ${username},\n\nAn administrator has reset your GoWin account password.\n\nTemporary password: ${tempPassword}\n\nThis password expires in 1 hour. You will be required to set a new password after logging in.\n\nGoWin Team`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1a1a">Your Temporary Password</h2>
        <p>Hi <strong>${username}</strong>,</p>
        <p>An administrator has reset your GoWin account. Use the temporary password below to log in:</p>
        <div style="background:#f4f4f4;border-radius:8px;padding:24px;text-align:center;margin:24px 0">
          <span style="font-size:24px;font-weight:bold;letter-spacing:4px;color:#1a1a1a;font-family:monospace">${tempPassword}</span>
        </div>
        <p style="color:#e44">⚠ This password expires in <strong>1 hour</strong>.</p>
        <p style="color:#666;font-size:14px">You will be prompted to set a new password immediately after logging in.</p>
        <p style="color:#666;font-size:14px">— The GoWin Team</p>
      </div>
    `,
  });
}

export async function sendPayoutCompletedEmail(to: string, username: string, amount: string, currency: string): Promise<boolean> {
  const formatted = `${parseFloat(amount).toFixed(2)} ${currency}`;
  return sendMail({
    to,
    subject: "GoWin — Payout Successful",
    text: `Hi ${username},\n\nGreat news! Your withdrawal of ${formatted} has been processed successfully and sent to your mobile money account.\n\nGoWin Team`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#16a34a">✅ Payout Successful</h2>
        <p>Hi <strong>${username}</strong>,</p>
        <p>Your withdrawal has been processed successfully.</p>
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:20px;margin:20px 0;text-align:center">
          <p style="color:#15803d;font-size:14px;margin:0 0 4px 0">Amount Sent</p>
          <p style="font-size:28px;font-weight:bold;color:#15803d;margin:0">${formatted}</p>
        </div>
        <p style="color:#666;font-size:14px">The funds have been sent to your registered mobile money account. Please check your phone for a confirmation message from your mobile money provider.</p>
        <p style="color:#666;font-size:14px">— The GoWin Team</p>
      </div>
    `,
  });
}

export async function sendPayoutFailedEmail(to: string, username: string, amount: string, currency: string): Promise<boolean> {
  const formatted = `${parseFloat(amount).toFixed(2)} ${currency}`;
  return sendMail({
    to,
    subject: "GoWin — Payout Failed — Balance Refunded",
    text: `Hi ${username},\n\nUnfortunately, your withdrawal of ${formatted} could not be processed. Your balance has been refunded automatically.\n\nPlease check your profile payment account settings and try again, or contact support.\n\nGoWin Team`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#dc2626">❌ Payout Failed — Balance Refunded</h2>
        <p>Hi <strong>${username}</strong>,</p>
        <p>We were unable to process your withdrawal.</p>
        <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:20px;margin:20px 0;text-align:center">
          <p style="color:#b91c1c;font-size:14px;margin:0 0 4px 0">Amount Refunded</p>
          <p style="font-size:28px;font-weight:bold;color:#b91c1c;margin:0">${formatted}</p>
        </div>
        <p style="color:#666;font-size:14px">Your balance has been automatically refunded. Please verify your payment account details in your profile and try again. If this continues, please contact support.</p>
        <p style="color:#666;font-size:14px">— The GoWin Team</p>
      </div>
    `,
  });
}

export async function sendWithdrawalApprovedEmail(to: string, username: string, amount: string, currency: string): Promise<boolean> {
  const formatted = `${parseFloat(amount).toFixed(2)} ${currency}`;
  return sendMail({
    to,
    subject: "GoWin — Withdrawal Approved",
    text: `Hi ${username},\n\nYour withdrawal request of ${formatted} has been approved and is queued for payout. You will receive another notification once the funds are sent to your mobile money account.\n\nGoWin Team`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#2563eb">✓ Withdrawal Approved</h2>
        <p>Hi <strong>${username}</strong>,</p>
        <p>Your withdrawal request has been approved.</p>
        <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:20px;margin:20px 0;text-align:center">
          <p style="color:#1d4ed8;font-size:14px;margin:0 0 4px 0">Withdrawal Amount</p>
          <p style="font-size:28px;font-weight:bold;color:#1d4ed8;margin:0">${formatted}</p>
        </div>
        <p style="color:#666;font-size:14px">Your withdrawal is now queued for processing. You will receive another notification once the payout is sent to your mobile money account.</p>
        <p style="color:#666;font-size:14px">— The GoWin Team</p>
      </div>
    `,
  });
}

export async function sendAccountLockedEmail(to: string, username: string): Promise<boolean> {
  const appUrl = (await getDbSetting("app_url")) ?? process.env.APP_URL ?? "";
  return sendMail({
    to,
    subject: "GoWin — Account Locked",
    text: `Hi ${username},\n\nYour GoWin account has been locked due to 3 failed login attempts.\n\nVisit the login page and click "Forgot password?" to reset your password and regain access.\n\nGoWin Team`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#c0392b">Account Locked</h2>
        <p>Hi <strong>${username}</strong>,</p>
        <p>Your GoWin account has been locked due to <strong>3 consecutive failed login attempts</strong>.</p>
        <p>To regain access, please reset your password using the link below:</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${appUrl}/forgot-password" style="background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Reset Password</a>
        </div>
        <p style="color:#666;font-size:14px">If this was not you, please contact support immediately.</p>
        <p style="color:#666;font-size:14px">— The GoWin Team</p>
      </div>
    `,
  });
}
