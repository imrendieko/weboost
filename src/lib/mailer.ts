import nodemailer from 'nodemailer';

export function getMissingSmtpEnv(): string[] {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  return required.filter((key) => !process.env[key]);
}

export function isSmtpConfigured(): boolean {
  return getMissingSmtpEnv().length === 0;
}

function buildTransporter() {
  const host = String(process.env.SMTP_HOST || '').trim();
  const portRaw = process.env.SMTP_PORT;
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '');

  if (!host || !portRaw || !user || !pass) {
    const missing = getMissingSmtpEnv();
    throw new Error(`Konfigurasi SMTP belum lengkap. Tambahkan env: ${missing.join(', ')}.`);
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port)) {
    throw new Error('SMTP_PORT tidak valid.');
  }

  const secureEnv = String(process.env.SMTP_SECURE || '').trim().toLowerCase();
  const secure = secureEnv ? secureEnv === 'true' : port === 465;

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
  const from = String(process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();

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

export function getFriendlyMailerError(error: unknown): string {
  const raw = error instanceof Error ? `${error.message}` : String(error || '');
  const lowered = raw.toLowerCase();

  if (lowered.includes('535-5.7.8') || lowered.includes('badcredentials') || lowered.includes('invalid login')) {
    return 'SMTP login gagal (535). Untuk Gmail, gunakan App Password 16 karakter (bukan password akun biasa), pastikan SMTP_USER benar, lalu simpan juga di env Vercel.';
  }

  if (lowered.includes('self signed certificate') || lowered.includes('certificate')) {
    return 'Koneksi SMTP gagal karena masalah sertifikat TLS. Periksa SMTP_HOST, SMTP_PORT, dan SMTP_SECURE.';
  }

  if (lowered.includes('enotfound') || lowered.includes('getaddrinfo')) {
    return 'Host SMTP tidak ditemukan. Periksa nilai SMTP_HOST.';
  }

  if (lowered.includes('econnrefused') || lowered.includes('timeout')) {
    return 'Koneksi ke server SMTP gagal. Periksa SMTP_PORT/SMTP_SECURE dan pastikan server SMTP aktif.';
  }

  return raw || 'Gagal mengirim email OTP.';
}
