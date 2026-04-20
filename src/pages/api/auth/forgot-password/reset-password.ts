import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { verifyResetToken } from '@/lib/forgotPasswordToken';
import { hashPasswordIfNeeded } from '@/lib/password';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan` });
  }

  try {
    const { resetToken, password, confirmPassword } = req.body as {
      resetToken?: string;
      password?: string;
      confirmPassword?: string;
    };

    const newPassword = String(password || '');
    const confirm = String(confirmPassword || '');

    if (!resetToken || !newPassword || !confirm) {
      return res.status(400).json({ error: 'Semua field wajib diisi.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter.' });
    }

    if (newPassword !== confirm) {
      return res.status(400).json({ error: 'Konfirmasi password tidak sama.' });
    }

    const tokenCheck = verifyResetToken(String(resetToken));
    if (!tokenCheck.ok || !tokenCheck.context) {
      return res.status(400).json({ error: tokenCheck.error || 'Token reset tidak valid.' });
    }

    const hashedPassword = await hashPasswordIfNeeded(newPassword);
    const { userType, userId } = tokenCheck.context;

    if (userType === 'admin') {
      const { error } = await supabaseAdmin.from('admin').update({ password_admin: hashedPassword }).eq('id_admin', userId);
      if (error) {
        throw error;
      }
    } else if (userType === 'siswa') {
      const { error } = await supabaseAdmin.from('siswa').update({ password_siswa: hashedPassword }).eq('id_siswa', userId);
      if (error) {
        throw error;
      }
    } else {
      const { error } = await supabaseAdmin.from('guru').update({ password_guru: hashedPassword }).eq('id_guru', userId);
      if (error) {
        throw error;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Password berhasil diperbarui. Silakan login dengan password baru.',
    });
  } catch (error) {
    console.error('forgot-password/reset-password error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan password baru. Silakan coba lagi.' });
  }
}
