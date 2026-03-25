import type { NextApiRequest, NextApiResponse } from 'next';
import supabase from '@/lib/db';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { nama_elemen, sampul_elemen, deskripsi_elemen, kelas_elemen, guru_pengampu, tujuan_pembelajaran } = req.body;

      // Validate required fields
      if (!nama_elemen || !kelas_elemen || !tujuan_pembelajaran || tujuan_pembelajaran.length === 0) {
        return res.status(400).json({ error: 'Nama elemen, kelas, dan minimal satu tujuan pembelajaran harus diisi' });
      }

      // Insert new elemen
      const { data: elemenData, error: elemenError } = await supabase
        .from('elemen')
        .insert([
          {
            nama_elemen,
            sampul_elemen: sampul_elemen || null,
            deskripsi_elemen: deskripsi_elemen || null,
            kelas_elemen: parseInt(kelas_elemen),
            guru_pengampu: guru_pengampu ? parseInt(guru_pengampu) : null,
          },
        ])
        .select()
        .single();

      if (elemenError || !elemenData) {
        console.error('Error creating elemen:', elemenError);
        return res.status(500).json({ error: 'Gagal menambahkan elemen', details: elemenError?.message });
      }

      // Insert tujuan pembelajaran
      const tpData = tujuan_pembelajaran.map((tp: string) => ({
        nama_tp: tp,
        elemen_tp: elemenData.id_elemen,
      }));

      const { error: tpError } = await supabase.from('tujuan_pembelajaran').insert(tpData);

      if (tpError) {
        console.error('Error creating tujuan pembelajaran:', tpError);
        // Rollback: delete the elemen
        await supabase.from('elemen').delete().eq('id_elemen', elemenData.id_elemen);
        return res.status(500).json({ error: 'Gagal menambahkan tujuan pembelajaran', details: tpError.message });
      }

      // Auto-create materi for this elemen (if guru_pengampu is set)
      if (guru_pengampu) {
        const { data: materiData, error: materiError } = await supabaseAdmin
          .from('materi')
          .insert([
            {
              id_elemen: elemenData.id_elemen,
              deskripsi_materi: deskripsi_elemen || '',
              kelas_materi: parseInt(kelas_elemen),
              guru_materi: parseInt(guru_pengampu),
            },
          ])
          .select()
          .single();

        if (materiError) {
          console.error('Warning: Failed to auto-create materi:', materiError);
          // Don't fail the whole request, just log the warning
        } else {
          console.log('✅ Auto-created materi for elemen:', materiData);
        }
      }

      return res.status(201).json({ message: 'Elemen berhasil ditambahkan', data: elemenData });
    } catch (error) {
      console.error('Error in create elemen API:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
