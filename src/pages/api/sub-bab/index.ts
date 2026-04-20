import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { id_bab } = req.query;

      if (!id_bab) {
        return res.status(400).json({ error: 'id_bab diperlukan' });
      }

      // Fetch all sub-bab by bab
      const { data, error } = await supabaseAdmin.from('sub_bab').select('*').eq('nama_bab', id_bab).order('id_sub_bab', { ascending: true });

      if (error) {
        console.error('Error fetching sub-bab:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data || []);
    } catch (error) {
      console.error('Error in GET /api/sub-bab:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else if (req.method === 'POST') {
    try {
      const { nama_bab, judul_sub_bab, tautan_konten } = req.body;

      console.log('📥 POST /api/sub-bab - Request body:', { nama_bab, judul_sub_bab, tautan_konten });

      if (!nama_bab || !judul_sub_bab) {
        console.error('❌ Data tidak lengkap:', { nama_bab, judul_sub_bab });
        return res.status(400).json({ error: 'Data tidak lengkap' });
      }

      // Check if service role key is available
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ SUPABASE_SERVICE_ROLE_KEY tidak ditemukan!');
        return res.status(500).json({
          error: 'Kesalahan konfigurasi server',
          details: 'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.',
        });
      }

      console.log('✅ Inserting sub-bab with supabaseAdmin...');

      const { data, error } = await supabaseAdmin
        .from('sub_bab')
        .insert([
          {
            nama_bab,
            judul_sub_bab,
            tautan_konten: tautan_konten || '',
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating sub-bab:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return res.status(500).json({
          error: error.message,
          details: error,
          hint: error.message.includes('policy') ? 'RLS policy error. Check if table "sub_bab" has proper policies or use supabaseAdmin.' : 'Database error',
        });
      }

      console.log('✅ Sub-bab created:', data);
      return res.status(201).json(data);
    } catch (error) {
      console.error('Error in POST /api/sub-bab:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Metode ${req.method} tidak diizinkan`);
  }
}
