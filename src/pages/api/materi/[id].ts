import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'ID tidak valid' });
  }

  if (req.method === 'GET') {
    try {
      // Fetch single materi dengan bab dan sub-bab
      const { data: materiData, error: materiError } = await supabaseAdmin
        .from('materi')
        .select(
          `
          *,
          kelas:kelas_materi (
            id_kelas,
            nama_kelas
          ),
          elemen:id_elemen (
            id_elemen,
            nama_elemen,
            sampul_elemen
          ),
          guru:guru_materi (
            id_guru,
            nama_guru
          )
        `,
        )
        .eq('id_materi', id)
        .single();

      if (materiError) {
        console.error('Error fetching materi:', materiError);
        return res.status(500).json({ error: materiError.message });
      }

      // Fetch all bab untuk materi ini
      const { data: babData, error: babError } = await supabaseAdmin.from('bab_materi').select('*').eq('nama_materi', id).order('id_bab', { ascending: true });

      if (babError) {
        console.error('Error fetching bab:', babError);
      }

      // Fetch all sub-bab untuk setiap bab
      const babWithSubBab = await Promise.all(
        (babData || []).map(async (bab) => {
          const { data: subBabData, error: subBabError } = await supabaseAdmin.from('sub_bab').select('*').eq('nama_bab', bab.id_bab).order('id_sub_bab', { ascending: true });

          if (subBabError) {
            console.error('Error fetching sub-bab:', subBabError);
          }

          return {
            ...bab,
            sub_bab: subBabData || [],
          };
        }),
      );

      return res.status(200).json({
        ...materiData,
        bab: babWithSubBab,
      });
    } catch (error) {
      console.error('Error in GET /api/materi/[id]:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { judul_materi, deskripsi_materi, file_materi, kelas_materi } = req.body;

      const updateData: any = {};
      if (judul_materi !== undefined) updateData.judul_materi = judul_materi;
      if (deskripsi_materi !== undefined) updateData.deskripsi_materi = deskripsi_materi;
      if (file_materi !== undefined) updateData.file_materi = file_materi;
      if (kelas_materi !== undefined) updateData.kelas_materi = kelas_materi;

      const { data, error } = await supabaseAdmin.from('materi').update(updateData).eq('id_materi', id).select().single();

      if (error) {
        console.error('Error updating materi:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error in PUT /api/materi/[id]:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Delete all sub-bab first
      const { data: babData } = await supabaseAdmin.from('bab_materi').select('id_bab').eq('nama_materi', id);

      if (babData && babData.length > 0) {
        const babIds = babData.map((b) => b.id_bab);
        await supabaseAdmin.from('sub_bab').delete().in('nama_bab', babIds);
      }

      // Delete all bab
      await supabaseAdmin.from('bab_materi').delete().eq('nama_materi', id);

      // Delete materi
      const { error } = await supabaseAdmin.from('materi').delete().eq('id_materi', id);

      if (error) {
        console.error('Error deleting materi:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ message: 'Materi berhasil dihapus' });
    } catch (error) {
      console.error('Error in DELETE /api/materi/[id]:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
