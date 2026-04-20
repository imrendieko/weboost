import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const idSiswa = Number(req.query.id_siswa);
      if (!idSiswa) {
        return res.status(400).json({ error: 'id_siswa wajib diisi' });
      }

      const { data, error } = await supabaseAdmin.from('progres_materi').select('*').eq('nama_siswa', idSiswa).order('created_at', { ascending: false }).limit(1).maybeSingle();

      if (error) {
        console.error('Error fetching progres_materi:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data || null);
    } catch (error) {
      console.error('Error in GET /api/siswa/progres-materi:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { id_siswa, sub_bab_selesai, total_sub_bab } = req.body as {
        id_siswa?: number;
        sub_bab_selesai?: number;
        total_sub_bab?: number;
      };

      if (!id_siswa || total_sub_bab === undefined || sub_bab_selesai === undefined) {
        return res.status(400).json({ error: 'Payload progres_materi tidak lengkap' });
      }

      const persentase = total_sub_bab > 0 ? Math.round((sub_bab_selesai / total_sub_bab) * 100) : 0;

      const { data: existing, error: existingError } = await supabaseAdmin.from('progres_materi').select('id_progres').eq('nama_siswa', id_siswa).order('created_at', { ascending: false }).limit(1).maybeSingle();

      if (existingError) {
        console.error('Error checking progres_materi existing row:', existingError);
        return res.status(500).json({ error: existingError.message });
      }

      if (existing?.id_progres) {
        const { error: updateError } = await supabaseAdmin
          .from('progres_materi')
          .update({
            sub_bab_selesai,
            total_sub_bab,
            persentase_progres: persentase,
          })
          .eq('id_progres', existing.id_progres);

        if (updateError) {
          console.error('Error updating progres_materi:', updateError);
          return res.status(500).json({ error: updateError.message });
        }
      } else {
        const { error: insertError } = await supabaseAdmin.from('progres_materi').insert([
          {
            nama_siswa: id_siswa,
            sub_bab_selesai,
            total_sub_bab,
            persentase_progres: persentase,
          },
        ]);

        if (insertError) {
          console.error('Error inserting progres_materi:', insertError);
          return res.status(500).json({ error: insertError.message });
        }
      }

      return res.status(200).json({
        message: 'Progres materi tersimpan',
        data: {
          sub_bab_selesai,
          total_sub_bab,
          persentase_progres: persentase,
        },
      });
    } catch (error) {
      console.error('Error in POST /api/siswa/progres-materi:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan` });
}
