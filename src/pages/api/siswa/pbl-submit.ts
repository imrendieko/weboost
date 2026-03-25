import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { id_sintak, id_siswa, file_pengumpulan } = req.body as {
      id_sintak?: number;
      id_siswa?: number;
      file_pengumpulan?: string;
    };

    if (!id_sintak || !id_siswa || !file_pengumpulan?.trim()) {
      return res.status(400).json({ error: 'Payload pengumpulan PBL tidak valid' });
    }

    const { data: sintakRow, error: sintakError } = await supabaseAdmin.from('sintak_pbl').select('id_sintak, waktu_mulai, waktu_selesai').eq('id_sintak', id_sintak).single();

    if (sintakError || !sintakRow) {
      return res.status(404).json({ error: 'Sintak PBL tidak ditemukan' });
    }

    if (!sintakRow.waktu_mulai || !sintakRow.waktu_selesai) {
      return res.status(403).json({ error: 'Pengumpulan belum dibuka. Guru belum mengatur waktu pengumpulan.' });
    }

    const { data: groupMember, error: groupMemberError } = await supabaseAdmin
      .from('anggota_kelompok')
      .select(
        `
        id_kelompok,
        kelompok:kelompok_pbl!inner (
          id_sintak
        )
      `,
      )
      .eq('id_siswa', id_siswa)
      .eq('kelompok.id_sintak', id_sintak)
      .limit(1)
      .maybeSingle();

    if (groupMemberError) {
      console.error('Error checking anggota kelompok:', groupMemberError);
      return res.status(500).json({ error: groupMemberError.message });
    }

    const kelompokId = groupMember?.id_kelompok || null;

    if (kelompokId) {
      const { data: existingGroupSubmission, error: existingGroupError } = await supabaseAdmin.from('pengumpulan_pbl').select('id_pengumpulan').eq('id_sintak', id_sintak).eq('id_kelompok', kelompokId).limit(1).maybeSingle();

      if (existingGroupError) {
        console.error('Error checking existing group submission:', existingGroupError);
        return res.status(500).json({ error: existingGroupError.message });
      }

      if (existingGroupSubmission?.id_pengumpulan) {
        const { error: updateError } = await supabaseAdmin
          .from('pengumpulan_pbl')
          .update({
            file_pengumpulan: file_pengumpulan.trim(),
            id_siswa,
            waktu_pengumpulan: new Date().toISOString(),
          })
          .eq('id_pengumpulan', existingGroupSubmission.id_pengumpulan);

        if (updateError) {
          console.error('Error updating group submission:', updateError);
          return res.status(500).json({ error: updateError.message });
        }
      } else {
        const { error: insertError } = await supabaseAdmin.from('pengumpulan_pbl').insert([
          {
            id_sintak,
            id_siswa,
            id_kelompok: kelompokId,
            file_pengumpulan: file_pengumpulan.trim(),
            waktu_pengumpulan: new Date().toISOString(),
          },
        ]);

        if (insertError) {
          console.error('Error inserting group submission:', insertError);
          return res.status(500).json({ error: insertError.message });
        }
      }

      return res.status(200).json({ message: 'Pengumpulan kelompok berhasil disimpan', mode: 'kelompok' });
    }

    const { data: existingIndividualSubmission, error: existingIndividualError } = await supabaseAdmin
      .from('pengumpulan_pbl')
      .select('id_pengumpulan')
      .eq('id_sintak', id_sintak)
      .eq('id_siswa', id_siswa)
      .is('id_kelompok', null)
      .limit(1)
      .maybeSingle();

    if (existingIndividualError) {
      console.error('Error checking existing individual submission:', existingIndividualError);
      return res.status(500).json({ error: existingIndividualError.message });
    }

    if (existingIndividualSubmission?.id_pengumpulan) {
      const { error: updateError } = await supabaseAdmin
        .from('pengumpulan_pbl')
        .update({
          file_pengumpulan: file_pengumpulan.trim(),
          waktu_pengumpulan: new Date().toISOString(),
        })
        .eq('id_pengumpulan', existingIndividualSubmission.id_pengumpulan);

      if (updateError) {
        console.error('Error updating individual submission:', updateError);
        return res.status(500).json({ error: updateError.message });
      }
    } else {
      const { error: insertError } = await supabaseAdmin.from('pengumpulan_pbl').insert([
        {
          id_sintak,
          id_siswa,
          id_kelompok: null,
          file_pengumpulan: file_pengumpulan.trim(),
          waktu_pengumpulan: new Date().toISOString(),
        },
      ]);

      if (insertError) {
        console.error('Error inserting individual submission:', insertError);
        return res.status(500).json({ error: insertError.message });
      }
    }

    return res.status(200).json({ message: 'Pengumpulan individu berhasil disimpan', mode: 'individu' });
  } catch (error) {
    console.error('Error in POST /api/siswa/pbl-submit:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
