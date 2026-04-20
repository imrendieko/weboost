import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { createOtpChallenge, type ResetUserType } from '@/lib/forgotPasswordToken';
import { getMissingSmtpEnv, isSmtpConfigured, sendForgotPasswordOtpEmail } from '@/lib/mailer';

type UserLookupResult = {
  userType: ResetUserType;
  id: number;
  email: string;
};

async function findUserByEmail(email: string): Promise<UserLookupResult | null> {
  const emailLower = email.trim().toLowerCase();

  const { data: admin } = await supabaseAdmin.from('admin').select('id_admin, email_admin').eq('email_admin', emailLower).limit(1).maybeSingle();
  if (admin) {
    return { userType: 'admin', id: admin.id_admin, email: admin.email_admin };
  }

  const { data: siswa } = await supabaseAdmin.from('siswa').select('id_siswa, email_siswa').eq('email_siswa', emailLower).limit(1).maybeSingle();
  if (siswa) {
    return { userType: 'siswa', id: siswa.id_siswa, email: siswa.email_siswa };
  }

  const { data: guruValidated } = await supabaseAdmin.from('guru').select('id_guru, email_guru').eq('email_guru', emailLower).eq('status_guru', true).limit(1).maybeSingle();

  if (guruValidated) {
    return { userType: 'guru', id: guruValidated.id_guru, email: guruValidated.email_guru };
  }

  const { data: guruUnvalidated } = await supabaseAdmin.from('guru').select('id_guru, email_guru').eq('email_guru', emailLower).eq('status_guru', false).limit(1).maybeSingle();

  if (guruUnvalidated) {
    return { userType: 'guru', id: guruUnvalidated.id_guru, email: guruUnvalidated.email_guru };
  }

  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan` });
  }

  try {
    const { email } = req.body as { email?: string };
    const emailValue = String(email || '')
      .trim()
      .toLowerCase();

    if (!emailValue) {
      return res.status(400).json({ error: 'Email harus diisi.' });
    }

    if (!isSmtpConfigured()) {
      const missing = getMissingSmtpEnv();
      return res.status(500).json({
        error: `Fitur lupa password belum aktif. Env email belum diisi: ${missing.join(', ')}.`,
      });
    }

    const user = await findUserByEmail(emailValue);
    if (!user) {
      return res.status(404).json({ error: 'Email belum terdaftar di WeBoost.' });
    }

    const { otp, challengeToken } = createOtpChallenge({
      email: user.email,
      userType: user.userType,
      userId: user.id,
    });

    await sendForgotPasswordOtpEmail({
      to: user.email,
      otp,
      expiresMinutes: 10,
    });

    return res.status(200).json({
      success: true,
      message: 'Kode OTP berhasil dikirim ke email Anda.',
      challengeToken,
    });
  } catch (error) {
    console.error('forgot-password/request-otp error:', error);
    const message = error instanceof Error ? error.message : 'Gagal mengirim OTP. Silakan coba lagi.';
    return res.status(500).json({ error: message });
  }
}
