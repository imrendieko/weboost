import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const { nama_siswa, email_siswa, password_siswa, nisn_siswa, kelas_siswa, lembaga_siswa } = req.body;
      const emailLower = String(email_siswa).trim().toLowerCase();

      // Validate required fields
      if (!nama_siswa || !email_siswa || !nisn_siswa || !kelas_siswa || !lembaga_siswa) {
        return res.status(400).json({ error: 'Semua field harus diisi' });
      }

      // Check if email already exists for other siswa
      const { data: existingEmail } = await supabaseAdmin.from('siswa').select('id_siswa, email_siswa').eq('email_siswa', emailLower).neq('id_siswa', id).maybeSingle();

      if (existingEmail) {
        return res.status(400).json({ error: 'Email sudah digunakan oleh siswa lain' });
      }

      // Email must not collide with guru account email.
      const { data: existingEmailInGuru } = await supabaseAdmin.from('guru').select('id_guru').eq('email_guru', emailLower).maybeSingle();

      if (existingEmailInGuru) {
        return res.status(400).json({ error: 'Email sudah digunakan oleh akun guru' });
      }

      // Check if NISN already exists for other siswa
      const { data: existingNISN } = await supabaseAdmin.from('siswa').select('id_siswa, nisn_siswa').eq('nisn_siswa', nisn_siswa).neq('id_siswa', id).maybeSingle();

      if (existingNISN) {
        return res.status(400).json({ error: 'NISN sudah digunakan oleh siswa lain' });
      }

      // Prepare update data
      const updateData: any = {
        nama_siswa,
        email_siswa: emailLower,
        nisn_siswa,
        kelas_siswa: parseInt(kelas_siswa),
        lembaga_siswa: parseInt(lembaga_siswa),
      };

      // Only update password if provided
      if (password_siswa && password_siswa.trim() !== '') {
        updateData.password_siswa = password_siswa;
      }

      // Update siswa
      const { data, error } = await supabaseAdmin.from('siswa').update(updateData).eq('id_siswa', id).select();

      if (error) {
        console.error('Error updating siswa:', error);
        return res.status(500).json({ error: 'Gagal memperbarui data siswa' });
      }

      return res.status(200).json({ message: 'Data siswa berhasil diperbarui', data });
    } catch (error) {
      console.error('Error in update siswa API:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { error } = await supabaseAdmin.from('siswa').delete().eq('id_siswa', id);

      if (error) {
        console.error('Error deleting siswa:', error);

        // Check if it's a foreign key constraint error
        if (error.message && (error.message.includes('foreign key') || error.message.includes('FK') || error.message.includes('violate'))) {
          return res.status(400).json({
            error: 'Siswa ini sudah pernah mengerjakan penugasan. Hapus semua pengumpulan penugasan terlebih dahulu',
            code: 'FK_CONSTRAINT',
          });
        }

        return res.status(500).json({ error: 'Gagal menghapus data siswa' });
      }

      return res.status(200).json({ message: 'Data siswa berhasil dihapus' });
    } catch (error) {
      console.error('Error in delete siswa API:', error);

      // Check if it's a foreign key constraint error
      const errorMessage = String(error);
      if (errorMessage.includes('foreign key') || errorMessage.includes('FK') || errorMessage.includes('violate')) {
        return res.status(400).json({
          error: 'Siswa ini sudah pernah mengerjakan penugasan. Hapus semua pengumpulan penugasan terlebih dahulu',
          code: 'FK_CONSTRAINT',
        });
      }

      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
