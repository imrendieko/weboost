import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { id_asesmen } = req.query;

      if (!id_asesmen) {
        return res.status(400).json({ error: 'id_asesmen diperlukan' });
      }

      const idAsesmen = parseInt(id_asesmen as string, 10);

      // Fetch all soal by asesmen
      const { data: soalData, error } = await supabaseAdmin.from('soal_asesmen').select('*').eq('id_asesmen', idAsesmen).order('urutan_soal', { ascending: true });

      if (error) {
        console.error('Error fetching soal:', error);
        return res.status(500).json({ error: error.message });
      }

      // Get unique TP IDs and fetch TP data
      const tpIds = [...new Set(soalData?.map((s) => s.id_tp).filter(Boolean) || [])];
      const { data: tpData } = await supabaseAdmin.from('tujuan_pembelajaran').select('id_tp, nama_tp').in('id_tp', tpIds);

      // Build TP map
      const tpMap = (tpData || []).reduce<Record<number, any>>((acc, tp) => {
        acc[tp.id_tp] = tp;
        return acc;
      }, {});

      // Fetch pilihan_ganda for all soal
      const soalIds = soalData?.map((s) => s.id_soal) || [];
      const { data: pilihanData } = await supabaseAdmin.from('pilihan_ganda').select('id_pilgan, id_soal, opsi_pilgan, urutan_pilgan, teks_pilgan, gambar_pilgan, kunci_pilgan, created_at').in('id_soal', soalIds);

      // Build pilihan map by soal ID
      const pilihanMap = (pilihanData || []).reduce<Record<number, any[]>>((acc, p) => {
        if (!acc[p.id_soal]) acc[p.id_soal] = [];
        acc[p.id_soal].push(p);
        return acc;
      }, {});

      // Combine data
      const result = (soalData || []).map((soal) => ({
        ...soal,
        tp: soal.id_tp ? tpMap[soal.id_tp] || null : null,
        pilihan_ganda: pilihanMap[soal.id_soal] || [],
      }));

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in GET /api/asesmen/soal:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { id_asesmen, teks_soal, gambar_soal, teks_jawaban, nilai_soal, kunci_teks, tipe_soal, urutan_soal, id_tp } = req.body;

      if (!id_asesmen) {
        return res.status(400).json({ error: 'id_asesmen diperlukan' });
      }

      // Validate that asesmen exists
      const { data: asesmenExists, error: asesmenError } = await supabaseAdmin.from('asesmen').select('id_asesmen').eq('id_asesmen', id_asesmen).single();

      if (asesmenError || !asesmenExists) {
        return res.status(404).json({
          error: `Asesmen dengan ID ${id_asesmen} tidak ditemukan`,
        });
      }

      const payloadWithImage = {
        id_asesmen,
        teks_soal: teks_soal || '',
        gambar_soal: gambar_soal || '',
        teks_jawaban: teks_jawaban || '',
        nilai_soal: nilai_soal || 10,
        kunci_teks: kunci_teks || '',
        tipe_soal: tipe_soal || 'pilihan_ganda',
        urutan_soal: urutan_soal || 1,
        id_tp: id_tp || 1,
      };

      const payloadWithoutImage = {
        id_asesmen,
        teks_soal: teks_soal || '',
        teks_jawaban: teks_jawaban || '',
        nilai_soal: nilai_soal || 10,
        kunci_teks: kunci_teks || '',
        tipe_soal: tipe_soal || 'pilihan_ganda',
        urutan_soal: urutan_soal || 1,
        id_tp: id_tp || 1,
      };

      let data;
      let error;

      ({ data, error } = await supabaseAdmin.from('soal_asesmen').insert([payloadWithImage]).select().single());

      if (error && error.message?.toLowerCase().includes('gambar_soal')) {
        ({ data, error } = await supabaseAdmin.from('soal_asesmen').insert([payloadWithoutImage]).select().single());
      }

      if (error) {
        console.error('Error creating soal:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json(data);
    } catch (error) {
      console.error('Error in POST /api/asesmen/soal:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
