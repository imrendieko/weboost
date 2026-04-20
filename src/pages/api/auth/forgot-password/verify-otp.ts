import type { NextApiRequest, NextApiResponse } from 'next';
import { createResetToken, verifyOtpChallenge } from '@/lib/forgotPasswordToken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan` });
  }

  try {
    const { challengeToken, otp } = req.body as { challengeToken?: string; otp?: string };

    if (!challengeToken || !otp) {
      return res.status(400).json({ error: 'Kode OTP dan sesi verifikasi wajib diisi.' });
    }

    const otpValue = String(otp).trim();
    if (!/^\d{6}$/.test(otpValue)) {
      return res.status(400).json({ error: 'Kode OTP harus 6 digit angka.' });
    }

    const verification = verifyOtpChallenge(String(challengeToken), otpValue);
    if (!verification.ok || !verification.context) {
      return res.status(400).json({ error: verification.error || 'OTP tidak valid.' });
    }

    const resetToken = createResetToken(verification.context);

    return res.status(200).json({
      success: true,
      message: 'OTP valid. Silakan masukkan password baru.',
      resetToken,
    });
  } catch (error) {
    console.error('forgot-password/verify-otp error:', error);
    return res.status(500).json({ error: 'Gagal memvalidasi OTP. Silakan coba lagi.' });
  }
}
