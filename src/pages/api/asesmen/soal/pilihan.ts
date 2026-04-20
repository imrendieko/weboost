import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { id_soal, opsi_pilgan, urutan_pilgan, teks_pilgan, gambar_pilgan, kunci_pilgan, pilihan_list } = req.body;

      if (!id_soal) {
        return res.status(400).json({
          error: 'id_soal diperlukan',
        });
      }

      // Validate that soal exists
      const { data: soalExists, error: soalError } = await supabaseAdmin.from('soal_asesmen').select('id_soal').eq('id_soal', id_soal).single();

      if (soalError || !soalExists) {
        return res.status(404).json({
          error: `Soal dengan ID ${id_soal} tidak ditemukan`,
        });
      }

      if (Array.isArray(pilihan_list) && pilihan_list.length > 0) {
        const payload = pilihan_list.map((item) => ({
          id_soal,
          opsi_pilgan: item.opsi_pilgan,
          urutan_pilgan: item.urutan_pilgan,
          teks_pilgan: item.teks_pilgan || '',
          gambar_pilgan: item.gambar_pilgan || '',
          kunci_pilgan: item.kunci_pilgan || false,
        }));

        const { data, error } = await supabaseAdmin.from('pilihan_ganda').insert(payload).select();

        if (error) {
          console.error('Error creating pilihan ganda list:', error);
          return res.status(500).json({ error: error.message });
        }

        return res.status(201).json(data);
      }

      if (!opsi_pilgan || urutan_pilgan === undefined) {
        return res.status(400).json({
          error: 'opsi_pilgan dan urutan_pilgan diperlukan untuk mode single insert',
        });
      }

      const { data, error } = await supabaseAdmin
        .from('pilihan_ganda')
        .insert([
          {
            id_soal,
            opsi_pilgan,
            urutan_pilgan,
            teks_pilgan: teks_pilgan || '',
            gambar_pilgan: gambar_pilgan || '',
            kunci_pilgan: kunci_pilgan || false,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating pilihan ganda:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json(data);
    } catch (error) {
      console.error('Error in POST /api/asesmen/soal/pilihan:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else {
    return res.status(405).json({ error: 'Metode tidak diizinkan' });
  }
}
