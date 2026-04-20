import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { hashPasswordIfNeeded } from '@/lib/password';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'ID siswa tidak valid' });
  }

  if (req.method === 'PUT') {
    try {
      const { nama_siswa, email_siswa, password_siswa, nisn_siswa, kelas_siswa, lembaga_siswa } = req.body;
      const emailLower = String(email_siswa).trim().toLowerCase();
      const nisnString = String(nisn_siswa).trim();

      // Validate required fields
      if (!nama_siswa || !email_siswa || !nisn_siswa || !kelas_siswa || !lembaga_siswa) {
        return res.status(400).json({ error: 'Semua field harus diisi' });
      }

      if (!/^\d+$/.test(nisnString)) {
        return res.status(400).json({ error: 'NISN hanya boleh berisi angka' });
      }

      if (nisnString.length < 10) {
        return res.status(400).json({ error: 'NISN tidak boleh kurang dari 10 digit' });
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
      const { data: existingNISN } = await supabaseAdmin.from('siswa').select('id_siswa, nisn_siswa').eq('nisn_siswa', nisnString).neq('id_siswa', id).maybeSingle();

      if (existingNISN) {
        return res.status(400).json({ error: 'NISN sudah digunakan oleh siswa lain' });
      }

      // Prepare update data
      const updateData: any = {
        nama_siswa,
        email_siswa: emailLower,
        nisn_siswa: nisnString,
        kelas_siswa: parseInt(kelas_siswa),
        lembaga_siswa: parseInt(lembaga_siswa),
      };

      // Only update password if provided
      if (password_siswa && password_siswa.trim() !== '') {
        updateData.password_siswa = await hashPasswordIfNeeded(String(password_siswa));
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
      const siswaId = Number(id);

      if (!Number.isFinite(siswaId)) {
        return res.status(400).json({ error: 'ID siswa tidak valid' });
      }

      // Clean dependent rows first to avoid FK constraint failures when deleting siswa.
      const { data: attempts, error: attemptsError } = await supabaseAdmin.from('asesmen_attempt').select('id_attempt').eq('id_siswa', siswaId);
      if (attemptsError) {
        console.error('Error reading asesmen_attempt before deleting siswa:', attemptsError);
      }

      const attemptIds = (attempts || []).map((row: any) => Number(row.id_attempt)).filter((value: number) => Number.isFinite(value));
      if (attemptIds.length > 0) {
        const { error: validasiError } = await supabaseAdmin.from('validasi_nilai').delete().in('id_attempt', attemptIds);
        if (validasiError) {
          console.error('Error deleting validasi_nilai before deleting siswa:', validasiError);
        }
      }

      const { error: analisisSiswaError } = await supabaseAdmin.from('analisis_siswa').delete().eq('nama_siswa', siswaId);
      if (analisisSiswaError) {
        console.error('Error deleting analisis_siswa before deleting siswa:', analisisSiswaError);
      }

      const { error: attemptDeleteError } = await supabaseAdmin.from('asesmen_attempt').delete().eq('id_siswa', siswaId);
      if (attemptDeleteError) {
        console.error('Error deleting asesmen_attempt before deleting siswa:', attemptDeleteError);
      }

      const { data: komentarRows, error: komentarRowsError } = await supabaseAdmin.from('komentar_pbl').select('id_komentar').eq('id_siswa', siswaId);
      if (komentarRowsError) {
        console.error('Error fetching komentar_pbl before deleting siswa:', komentarRowsError);
      }

      const komentarIds = (komentarRows || []).map((row: any) => Number(row.id_komentar)).filter((value: number) => Number.isFinite(value));
      if (komentarIds.length > 0) {
        const { error: replyDeleteError } = await supabaseAdmin.from('komentar_pbl').delete().in('parent_id', komentarIds);
        if (replyDeleteError) {
          console.error('Error deleting komentar_pbl replies before deleting siswa:', replyDeleteError);
        }

        const { error: komentarByIdDeleteError } = await supabaseAdmin.from('komentar_pbl').delete().in('id_komentar', komentarIds);
        if (komentarByIdDeleteError) {
          console.error('Error deleting komentar_pbl by ids before deleting siswa:', komentarByIdDeleteError);
        }
      }

      const { error: pengumpulanError } = await supabaseAdmin.from('pengumpulan_pbl').delete().eq('id_siswa', siswaId);
      if (pengumpulanError) {
        console.error('Error deleting pengumpulan_pbl before deleting siswa:', pengumpulanError);
      }

      const { error: anggotaError } = await supabaseAdmin.from('anggota_kelompok').delete().eq('id_siswa', siswaId);
      if (anggotaError) {
        console.error('Error deleting anggota_kelompok before deleting siswa:', anggotaError);
      }

      const { error: progresMateriError } = await supabaseAdmin.from('progres_materi').delete().eq('nama_siswa', siswaId);
      if (progresMateriError) {
        console.error('Error deleting progres_materi by nama_siswa before deleting siswa:', progresMateriError);

        // Compatibility fallback if some databases use id_siswa as the relation column.
        const { error: progresMateriFallbackError } = await supabaseAdmin.from('progres_materi').delete().eq('id_siswa', siswaId);
        if (progresMateriFallbackError) {
          console.error('Error deleting progres_materi by id_siswa before deleting siswa:', progresMateriFallbackError);
        }
      }

      const { error } = await supabaseAdmin.from('siswa').delete().eq('id_siswa', siswaId);

      if (error) {
        console.error('Error deleting siswa:', error);

        // Check if it's a foreign key constraint error
        if (error.message && (error.message.includes('foreign key') || error.message.includes('FK') || error.message.includes('violate'))) {
          return res.status(400).json({
            error: 'Data siswa masih terhubung ke data lain dan belum bisa dihapus. Hubungi admin sistem untuk pengecekan relasi.',
            code: 'FK_CONSTRAINT',
            details: error.message,
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

  return res.status(405).json({ error: 'Metode tidak diizinkan' });
}
