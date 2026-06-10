import { createRequire } from "node:module";
import { logger } from "./logger";

const require = createRequire(import.meta.url);

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

function isSmtpConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransporter() {
  const nodemailer = require("nodemailer");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendMail(opts: MailOptions): Promise<boolean> {
  if (!isSmtpConfigured()) {
    logger.warn("SMTP not configured — email not sent", { to: opts.to, subject: opts.subject });
    return false;
  }
  try {
    const transporter = createTransporter();
    const from = process.env.SMTP_FROM || `GoWin <noreply@gowin.com>`;
    await transporter.sendMail({ from, ...opts });
    logger.info("Email sent", { to: opts.to, subject: opts.subject });
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to send email");
    return false;
  }
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

export async function sendAccountLockedEmail(to: string, username: string): Promise<boolean> {
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
          <a href="${process.env.APP_URL || ""}/forgot-password" style="background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Reset Password</a>
        </div>
        <p style="color:#666;font-size:14px">If this was not you, please contact support immediately.</p>
        <p style="color:#666;font-size:14px">— The GoWin Team</p>
      </div>
    `,
  });
}
