import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('elemen')
        .select(
          `
          *,
          kelas:kelas_elemen (
            id_kelas,
            nama_kelas
          ),
          guru:guru_pengampu (
            id_guru,
            nama_guru
          ),
          tujuan_pembelajaran:tujuan_pembelajaran (
            id_tp,
            nama_tp
          )
        `,
        )
        .eq('id_elemen', id)
        .single();

      if (error) {
        console.error('Error fetching elemen:', error);
        return res.status(500).json({ error: 'Gagal mengambil data elemen' });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error in get elemen API:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { nama_elemen, sampul_elemen, deskripsi_elemen, kelas_elemen, guru_pengampu, tujuan_pembelajaran } = req.body;

      // Validate required fields
      if (!nama_elemen || !kelas_elemen || !tujuan_pembelajaran || tujuan_pembelajaran.length === 0) {
        return res.status(400).json({ error: 'Nama elemen, kelas, dan minimal satu tujuan pembelajaran harus diisi' });
      }

      // Prepare update data
      const updateData: any = {
        nama_elemen,
        deskripsi_elemen: deskripsi_elemen || null,
        kelas_elemen: parseInt(kelas_elemen),
        guru_pengampu: guru_pengampu ? parseInt(guru_pengampu) : null,
      };

      // Only update sampul if provided
      if (sampul_elemen !== undefined) {
        updateData.sampul_elemen = sampul_elemen;
      }

      // Update elemen
      const { data: elemenData, error: elemenError } = await supabaseAdmin.from('elemen').update(updateData).eq('id_elemen', id).select().single();

      if (elemenError) {
        console.error('Error updating elemen:', elemenError);
        return res.status(500).json({ error: 'Gagal memperbarui data elemen' });
      }

      // Delete existing tujuan pembelajaran
      await supabaseAdmin.from('tujuan_pembelajaran').delete().eq('elemen_tp', id);

      // Insert new tujuan pembelajaran
      const tpData = tujuan_pembelajaran.map((tp: string) => ({
        nama_tp: tp,
        elemen_tp: parseInt(id as string),
      }));

      const { error: tpError } = await supabaseAdmin.from('tujuan_pembelajaran').insert(tpData);

      if (tpError) {
        console.error('Error updating tujuan pembelajaran:', tpError);
        return res.status(500).json({ error: 'Gagal memperbarui tujuan pembelajaran', details: tpError.message });
      }

      return res.status(200).json({ message: 'Data elemen berhasil diperbarui', data: elemenData });
    } catch (error) {
      console.error('Error in update elemen API:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      console.log('🗑️ Attempting to delete elemen with id:', id);

      // Step 1: Get all materi related to this elemen
      const { data: materiList, error: materiError } = await supabaseAdmin.from('materi').select('id_materi').eq('id_elemen', id);

      if (materiError) {
        console.error('Error fetching related materi:', materiError);
        return res.status(500).json({ error: 'Gagal memeriksa data materi terkait' });
      }

      console.log('📚 Found materi related to elemen:', materiList?.length || 0);

      // Step 2: Delete all related data if materi exists
      if (materiList && materiList.length > 0) {
        const materiIds = materiList.map((m) => m.id_materi);

        // Get all bab related to these materi
        const { data: babList, error: babError } = await supabaseAdmin.from('bab_materi').select('id_bab').in('nama_materi', materiIds);

        if (babError) {
          console.error('Error fetching related bab:', babError);
        }

        // Delete sub_bab for each bab
        if (babList && babList.length > 0) {
          const babIds = babList.map((b) => b.id_bab);

          console.log('🗑️ Deleting sub_bab...');
          const { error: subBabError } = await supabaseAdmin.from('sub_bab').delete().in('nama_bab', babIds);

          if (subBabError) {
            console.error('Error deleting sub_bab:', subBabError);
            return res.status(500).json({ error: 'Gagal menghapus sub bab terkait' });
          }
        }

        // Delete bab_materi
        console.log('🗑️ Deleting bab_materi...');
        const { error: babDeleteError } = await supabaseAdmin.from('bab_materi').delete().in('nama_materi', materiIds);

        if (babDeleteError) {
          console.error('Error deleting bab:', babDeleteError);
          return res.status(500).json({ error: 'Gagal menghapus bab terkait' });
        }

        // Delete materi
        console.log('🗑️ Deleting materi...');
        const { error: materiDeleteError } = await supabaseAdmin.from('materi').delete().eq('id_elemen', id);

        if (materiDeleteError) {
          console.error('Error deleting materi:', materiDeleteError);
          return res.status(500).json({ error: 'Gagal menghapus materi terkait' });
        }
      }

      // Step 3: Delete tujuan pembelajaran
      console.log('🗑️ Deleting tujuan_pembelajaran...');
      const { error: tpError } = await supabaseAdmin.from('tujuan_pembelajaran').delete().eq('elemen_tp', id);

      if (tpError) {
        console.error('Error deleting tujuan pembelajaran:', tpError);
        return res.status(500).json({ error: 'Gagal menghapus tujuan pembelajaran' });
      }

      // Step 4: Finally delete the elemen
      console.log('🗑️ Deleting elemen...');
      const { error: elemenError } = await supabaseAdmin.from('elemen').delete().eq('id_elemen', id);

      if (elemenError) {
        console.error('Error deleting elemen:', elemenError);
        return res.status(500).json({ error: 'Gagal menghapus data elemen', details: elemenError.message });
      }

      console.log('✅ Elemen deleted successfully');
      return res.status(200).json({ message: 'Data elemen beserta semua data terkait berhasil dihapus' });
    } catch (error) {
      console.error('Error in delete elemen API:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
