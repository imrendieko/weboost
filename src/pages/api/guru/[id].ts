import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid guru ID' });
  }

  const guruId = parseInt(id);

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('guru')
        .select(
          `
          *,
          lembaga:lembaga_guru(id_lembaga, nama_lembaga)
        `,
        )
        .eq('id_guru', guruId)
        .single();

      if (error) {
        console.error('Error fetching guru:', error);
        return res.status(404).json({ error: 'Guru not found' });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { nama_guru, email_guru, password_guru, nip_guru, lembaga_guru } = req.body;
      const emailLower = String(email_guru).trim().toLowerCase();

      // Validate required fields
      if (!nama_guru || !email_guru || !nip_guru || !lembaga_guru) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Convert NIP to string to prevent precision loss with large numbers
      const nipString = String(nip_guru).trim();

      // Email must be unique among other guru and all siswa.
      const { data: existingGuruEmail } = await supabaseAdmin.from('guru').select('id_guru').eq('email_guru', emailLower).neq('id_guru', guruId).maybeSingle();

      if (existingGuruEmail) {
        return res.status(400).json({ error: 'Email sudah digunakan oleh akun guru lain' });
      }

      const { data: existingSiswaEmail } = await supabaseAdmin.from('siswa').select('id_siswa').eq('email_siswa', emailLower).maybeSingle();

      if (existingSiswaEmail) {
        return res.status(400).json({ error: 'Email sudah digunakan oleh akun siswa' });
      }

      // Prepare update data
      const updateData: any = {
        nama_guru,
        email_guru: emailLower,
        nip_guru: nipString,
        lembaga_guru,
      };

      // Only update password if provided
      if (password_guru && password_guru.trim() !== '') {
        updateData.password_guru = password_guru;
      }

      const { data, error } = await supabaseAdmin.from('guru').update(updateData).eq('id_guru', guruId).select().single();

      if (error) {
        console.error('Error updating guru:', error);
        return res.status(500).json({ error: 'Failed to update guru' });
      }

      return res.status(200).json({ message: 'Data guru berhasil diperbarui', data });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // First, set guru_pengampu to null for all elemen that reference this guru
      const { error: elemenError } = await supabaseAdmin.from('elemen').update({ guru_pengampu: null }).eq('guru_pengampu', guruId);

      if (elemenError) {
        console.error('Error updating elemen guru_pengampu:', elemenError);
        return res.status(500).json({ error: 'Gagal memperbarui referensi guru di elemen' });
      }

      // Then delete the guru
      const { error } = await supabaseAdmin.from('guru').delete().eq('id_guru', guruId);

      if (error) {
        console.error('Error deleting guru:', error);

        // Check if it's a foreign key constraint error
        if (error.message && (error.message.includes('foreign key') || error.message.includes('FK') || error.message.includes('violate'))) {
          return res.status(400).json({
            error: 'Guru ini sudah pernah mengajar dan membuat penugasan. Hapus semua penugasan terlebih dahulu',
            code: 'FK_CONSTRAINT',
          });
        }

        return res.status(500).json({ error: 'Gagal menghapus data guru' });
      }

      return res.status(200).json({ message: 'Data guru berhasil dihapus' });
    } catch (error) {
      console.error('Error:', error);

      // Check if it's a foreign key constraint error
      const errorMessage = String(error);
      if (errorMessage.includes('foreign key') || errorMessage.includes('FK') || errorMessage.includes('violate')) {
        return res.status(400).json({
          error: 'Guru ini sudah pernah mengajar dan membuat penugasan. Hapus semua penugasan terlebih dahulu',
          code: 'FK_CONSTRAINT',
        });
      }

      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
