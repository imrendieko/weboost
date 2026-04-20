import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';

interface GroupBody {
  id_sintak?: number;
  id_kelompok?: number;
  nama_kelompok?: string;
  anggotaIds?: number[];
}

function normalizeMemberIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<number>();
  value.forEach((item) => {
    const parsed = Number(item);
    if (Number.isFinite(parsed)) {
      unique.add(parsed);
    }
  });

  return [...unique];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return handleCreate(req, res);
  }

  if (req.method === 'PUT') {
    return handleUpdate(req, res);
  }

  res.setHeader('Allow', ['POST', 'PUT']);
  return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan` });
}

async function handleCreate(req: NextApiRequest, res: NextApiResponse) {
  try {
    const body = req.body as GroupBody;
    const sintakId = Number(body.id_sintak);
    const namaKelompok = String(body.nama_kelompok || '').trim();
    const anggotaIds = normalizeMemberIds(body.anggotaIds);

    if (!sintakId || !namaKelompok) {
      return res.status(400).json({ error: 'id_sintak dan nama_kelompok wajib diisi' });
    }

    if (anggotaIds.length === 0) {
      return res.status(400).json({ error: 'Pilih minimal satu anggota kelompok' });
    }

    const { data: existingGroups, error: existingGroupsError } = await supabaseAdmin
      .from('kelompok_pbl')
      .select(
        `
        id_kelompok,
        anggota:anggota_kelompok (
          id_siswa
        )
      `,
      )
      .eq('id_sintak', sintakId);

    if (existingGroupsError) {
      console.error('Error checking existing kelompok members:', existingGroupsError);
      return res.status(500).json({ error: existingGroupsError.message });
    }

    const duplicatedMember = (existingGroups || []).flatMap((group: any) => group.anggota || []).find((member: any) => anggotaIds.includes(member.id_siswa));
    if (duplicatedMember) {
      return res.status(400).json({ error: 'Ada siswa yang sudah terdaftar di kelompok lain pada sintak ini' });
    }

    const { data: createdGroup, error: createGroupError } = await supabaseAdmin
      .from('kelompok_pbl')
      .insert([
        {
          id_sintak: sintakId,
          nama_kelompok: namaKelompok,
        },
      ])
      .select()
      .single();

    if (createGroupError || !createdGroup) {
      console.error('Error creating kelompok_pbl:', createGroupError);
      return res.status(500).json({ error: createGroupError?.message || 'Gagal membuat kelompok' });
    }

    const memberPayload = anggotaIds.map((id_siswa) => ({
      id_kelompok: createdGroup.id_kelompok,
      id_siswa,
    }));

    const { error: memberError } = await supabaseAdmin.from('anggota_kelompok').insert(memberPayload);
    if (memberError) {
      console.error('Error inserting anggota_kelompok:', memberError);
      return res.status(500).json({ error: memberError.message });
    }

    return res.status(201).json({ message: 'Kelompok berhasil ditambahkan', data: createdGroup });
  } catch (error) {
    console.error('Error creating group:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}

async function handleUpdate(req: NextApiRequest, res: NextApiResponse) {
  try {
    const body = req.body as GroupBody;
    const kelompokId = Number(body.id_kelompok);
    const namaKelompok = String(body.nama_kelompok || '').trim();
    const anggotaIds = normalizeMemberIds(body.anggotaIds);

    if (!kelompokId) {
      return res.status(400).json({ error: 'id_kelompok wajib diisi' });
    }

    if (!namaKelompok) {
      return res.status(400).json({ error: 'nama_kelompok wajib diisi' });
    }

    if (anggotaIds.length === 0) {
      return res.status(400).json({ error: 'Pilih minimal satu anggota kelompok' });
    }

    const { data: currentGroup, error: currentGroupError } = await supabaseAdmin.from('kelompok_pbl').select('id_sintak').eq('id_kelompok', kelompokId).maybeSingle();
    if (currentGroupError || !currentGroup) {
      return res.status(404).json({ error: 'Kelompok tidak ditemukan' });
    }

    const { data: existingGroups, error: existingGroupsError } = await supabaseAdmin
      .from('kelompok_pbl')
      .select(
        `
        id_kelompok,
        anggota:anggota_kelompok (
          id_siswa
        )
      `,
      )
      .eq('id_sintak', currentGroup.id_sintak)
      .neq('id_kelompok', kelompokId);

    if (existingGroupsError) {
      console.error('Error checking existing kelompok members for update:', existingGroupsError);
      return res.status(500).json({ error: existingGroupsError.message });
    }

    const duplicatedMember = (existingGroups || []).flatMap((group: any) => group.anggota || []).find((member: any) => anggotaIds.includes(member.id_siswa));
    if (duplicatedMember) {
      return res.status(400).json({ error: 'Ada siswa yang sudah terdaftar di kelompok lain pada sintak ini' });
    }

    const { error: updateGroupError } = await supabaseAdmin.from('kelompok_pbl').update({ nama_kelompok: namaKelompok }).eq('id_kelompok', kelompokId);
    if (updateGroupError) {
      console.error('Error updating kelompok_pbl:', updateGroupError);
      return res.status(500).json({ error: updateGroupError.message });
    }

    const { error: deleteMembersError } = await supabaseAdmin.from('anggota_kelompok').delete().eq('id_kelompok', kelompokId);
    if (deleteMembersError) {
      console.error('Error deleting anggota_kelompok:', deleteMembersError);
      return res.status(500).json({ error: deleteMembersError.message });
    }

    const memberPayload = anggotaIds.map((id_siswa) => ({
      id_kelompok: kelompokId,
      id_siswa,
    }));

    const { error: memberError } = await supabaseAdmin.from('anggota_kelompok').insert(memberPayload);
    if (memberError) {
      console.error('Error updating anggota_kelompok:', memberError);
      return res.status(500).json({ error: memberError.message });
    }

    return res.status(200).json({ message: 'Kelompok berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating group:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
