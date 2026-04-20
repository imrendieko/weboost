import nodemailer from 'nodemailer';

export function getMissingSmtpEnv(): string[] {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  return required.filter((key) => !process.env[key]);
}

export function isSmtpConfigured(): boolean {
  return getMissingSmtpEnv().length === 0;
}

function buildTransporter() {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true';

  if (!host || !portRaw || !user || !pass) {
    const missing = getMissingSmtpEnv();
    throw new Error(`Konfigurasi SMTP belum lengkap. Tambahkan env: ${missing.join(', ')}.`);
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port)) {
    throw new Error('SMTP_PORT tidak valid.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendForgotPasswordOtpEmail(params: { to: string; otp: string; expiresMinutes: number }) {
  const transporter = buildTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!from) {
    throw new Error('Alamat pengirim email belum dikonfigurasi. Set SMTP_FROM atau SMTP_USER.');
  }

  const subject = 'Kode OTP Reset Password WeBoost';
  const text = `Kode OTP reset password Anda adalah ${params.otp}. Kode berlaku ${params.expiresMinutes} menit.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Reset Password WeBoost</h2>
      <p style="margin-top: 0; color: #475569;">Gunakan kode OTP berikut untuk melanjutkan reset password:</p>
      <div style="margin: 20px 0; padding: 14px 18px; background: #0f172a; color: #ffffff; border-radius: 12px; font-size: 28px; letter-spacing: 6px; font-weight: 700; text-align: center;">${params.otp}</div>
      <p style="color: #475569;">Kode OTP berlaku selama <strong>${params.expiresMinutes} menit</strong>.</p>
      <p style="color: #64748b; font-size: 13px;">Jika Anda tidak meminta reset password, abaikan email ini.</p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to: params.to,
    subject,
    text,
    html,
  });
}
