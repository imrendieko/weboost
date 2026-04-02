import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { verifyPassword } from '@/lib/password';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password harus diisi' });
    }

    const emailLower = String(email).trim().toLowerCase();
    const passwordValue = String(password).trim();

    // Check admin first
    const { data: adminData, error: adminError } = await supabaseAdmin.from('admin').select('*').eq('email_admin', emailLower).limit(1).maybeSingle();

    if (adminError) {
      console.error('Error checking admin login:', adminError);
    }

    if (adminData && (await verifyPassword(passwordValue, adminData.password_admin))) {
      return res.status(200).json({
        success: true,
        userType: 'admin',
        user: {
          id: adminData.id_admin,
          email: adminData.email_admin,
          nama: adminData.nama_admin,
        },
      });
    }

    // Check siswa
    const { data: siswaData, error: siswaError } = await supabaseAdmin.from('siswa').select('id_siswa, nama_siswa, email_siswa, password_siswa, nisn_siswa, kelas_siswa, lembaga_siswa').eq('email_siswa', emailLower).limit(1).maybeSingle();

    if (siswaError) {
      console.error('Error checking siswa login:', siswaError);
    }

    if (siswaData && (await verifyPassword(passwordValue, siswaData.password_siswa))) {
      return res.status(200).json({
        success: true,
        userType: 'siswa',
        user: {
          id: siswaData.id_siswa,
          email: siswaData.email_siswa,
          nama: siswaData.nama_siswa,
          nisn: siswaData.nisn_siswa,
          kelas: siswaData.kelas_siswa,
          lembaga: siswaData.lembaga_siswa,
        },
      });
    }

    // Check validated guru first to avoid legacy duplicate data blocking login.
    const { data: guruData, error: guruError } = await supabaseAdmin
      .from('guru')
      .select('id_guru, nama_guru, email_guru, password_guru, nip_guru, lembaga_guru, status_guru')
      .eq('email_guru', emailLower)
      .eq('status_guru', true)
      .limit(1)
      .maybeSingle();

    if (guruError) {
      console.error('Error checking guru login:', guruError);
    }

    if (guruData && (await verifyPassword(passwordValue, guruData.password_guru))) {
      return res.status(200).json({
        success: true,
        userType: 'guru',
        user: {
          id: guruData.id_guru,
          email: guruData.email_guru,
          nama: guruData.nama_guru,
          nip: guruData.nip_guru,
          lembaga: guruData.lembaga_guru,
          status: guruData.status_guru,
        },
      });
    }

    // If guru exists but not validated, return a clear validation error.
    const { data: unvalidatedGuru, error: unvalidatedGuruError } = await supabaseAdmin.from('guru').select('id_guru, password_guru').eq('email_guru', emailLower).eq('status_guru', false).limit(1).maybeSingle();

    if (unvalidatedGuruError) {
      console.error('Error checking unvalidated guru login:', unvalidatedGuruError);
    }

    if (unvalidatedGuru && (await verifyPassword(passwordValue, unvalidatedGuru.password_guru))) {
      return res.status(403).json({
        error: 'Akun Anda belum divalidasi oleh admin. Silakan hubungi admin untuk aktivasi akun.',
      });
    }

    // No user found
    return res.status(401).json({ error: 'Email atau password salah' });
  } catch (error: any) {
    console.error('Error in login:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
