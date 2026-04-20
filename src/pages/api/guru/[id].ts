import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { hashPasswordIfNeeded } from '@/lib/password';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'ID guru tidak valid' });
  }

  const guruId = parseInt(id);

  if (!Number.isFinite(guruId)) {
    return res.status(400).json({ error: 'ID guru tidak valid' });
  }

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
        return res.status(404).json({ error: 'Guru tidak ditemukan' });
      }

      return res.status(200).json({
        ...data,
        nuptk_guru: String((data as any)?.nuptk_guru ?? '')
          .replace(/\D/g, '')
          .padStart(16, '0'),
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { nama_guru, email_guru, password_guru, nuptk_guru, lembaga_guru } = req.body;
      const namaGuruTrimmed = String(nama_guru ?? '').trim();
      const emailLower = String(email_guru ?? '')
        .trim()
        .toLowerCase();

      // Validate required fields
      if (!namaGuruTrimmed || !emailLower || !nuptk_guru) {
        return res.status(400).json({ error: 'Field wajib belum lengkap' });
      }

      // Keep existing lembaga if client does not send one.
      let lembagaGuruValue = Number(lembaga_guru);
      if (!Number.isFinite(lembagaGuruValue) || lembagaGuruValue <= 0) {
        const { data: currentGuru, error: currentGuruError } = await supabaseAdmin.from('guru').select('lembaga_guru').eq('id_guru', guruId).single();

        if (currentGuruError || !currentGuru?.lembaga_guru) {
          return res.status(400).json({ error: 'Lembaga guru tidak valid' });
        }

        lembagaGuruValue = Number(currentGuru.lembaga_guru);
      }

      // Convert NUPTK to string to prevent precision loss with large numbers
      const nuptkString = String(nuptk_guru).trim();

      if (!/^\d+$/.test(nuptkString)) {
        return res.status(400).json({ error: 'NUPTK hanya boleh berisi angka' });
      }

      if (nuptkString.length !== 16) {
        return res.status(400).json({ error: 'NUPTK harus terdiri dari tepat 16 digit' });
      }

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
        nama_guru: namaGuruTrimmed,
        email_guru: emailLower,
        nuptk_guru: nuptkString,
        lembaga_guru: lembagaGuruValue,
      };

      // Only update password if provided
      if (password_guru && password_guru.trim() !== '') {
        updateData.password_guru = await hashPasswordIfNeeded(String(password_guru));
      }

      const { data, error } = await supabaseAdmin.from('guru').update(updateData).eq('id_guru', guruId).select().single();

      if (error) {
        console.error('Error updating guru:', error);
        return res.status(500).json({ error: 'Gagal memperbarui data guru' });
      }

      return res.status(200).json({
        message: 'Data guru berhasil diperbarui',
        data: {
          ...data,
          nuptk_guru: String((data as any)?.nuptk_guru ?? '')
            .replace(/\D/g, '')
            .padStart(16, '0'),
        },
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else if (req.method === 'DELETE') {
    try {
      if (!Number.isFinite(guruId)) {
        return res.status(400).json({ error: 'ID guru tidak valid' });
      }

      // Remove direct references to guru where possible.
      const { error: materiNullError } = await supabaseAdmin.from('materi').update({ guru_materi: null }).eq('guru_materi', guruId);
      if (materiNullError) {
        console.error('Error updating materi.guru_materi:', materiNullError);
      }

      // First, set guru_pengampu to null for all elemen that reference this guru
      const { error: elemenError } = await supabaseAdmin.from('elemen').update({ guru_pengampu: null }).eq('guru_pengampu', guruId);

      if (elemenError) {
        console.error('Error updating elemen guru_pengampu:', elemenError);
        return res.status(500).json({ error: 'Gagal memperbarui referensi guru di elemen' });
      }

      // Delete asesmen data created by this guru, including dependent rows.
      const { data: asesmenRows, error: asesmenRowsError } = await supabaseAdmin.from('asesmen').select('id_asesmen').eq('guru_asesmen', guruId);
      if (asesmenRowsError) {
        console.error('Error fetching asesmen for guru delete:', asesmenRowsError);
        return res.status(500).json({ error: 'Gagal membaca relasi asesmen guru' });
      }

      const asesmenIds = (asesmenRows || []).map((row: any) => Number(row.id_asesmen)).filter((value: number) => Number.isFinite(value));
      if (asesmenIds.length > 0) {
        const { data: attemptRows, error: attemptRowsError } = await supabaseAdmin.from('asesmen_attempt').select('id_attempt').in('id_asesmen', asesmenIds);
        if (attemptRowsError) {
          console.error('Error fetching asesmen_attempt for guru delete:', attemptRowsError);
          return res.status(500).json({ error: 'Gagal membaca relasi pengerjaan asesmen' });
        }

        const attemptIds = (attemptRows || []).map((row: any) => Number(row.id_attempt)).filter((value: number) => Number.isFinite(value));
        if (attemptIds.length > 0) {
          const { error: validasiDeleteError } = await supabaseAdmin.from('validasi_nilai').delete().in('id_attempt', attemptIds);
          if (validasiDeleteError) {
            console.error('Error deleting validasi_nilai for guru delete:', validasiDeleteError);
            return res.status(500).json({ error: 'Gagal membersihkan validasi nilai asesmen' });
          }
        }

        const { error: analisisSiswaDeleteError } = await supabaseAdmin.from('analisis_siswa').delete().in('nama_asesmen', asesmenIds);
        if (analisisSiswaDeleteError) {
          console.error('Error deleting analisis_siswa for guru delete:', analisisSiswaDeleteError);
        }

        const { error: analisisGuruDeleteError } = await supabaseAdmin.from('analisis_guru').delete().in('nama_asesmen', asesmenIds);
        if (analisisGuruDeleteError) {
          console.error('Error deleting analisis_guru for guru delete:', analisisGuruDeleteError);
        }

        const { error: attemptDeleteError } = await supabaseAdmin.from('asesmen_attempt').delete().in('id_asesmen', asesmenIds);
        if (attemptDeleteError) {
          console.error('Error deleting asesmen_attempt for guru delete:', attemptDeleteError);
          return res.status(500).json({ error: 'Gagal membersihkan pengerjaan asesmen' });
        }

        const { error: soalDeleteError } = await supabaseAdmin.from('soal_asesmen').delete().in('id_asesmen', asesmenIds);
        if (soalDeleteError) {
          console.error('Error deleting soal_asesmen for guru delete:', soalDeleteError);
          return res.status(500).json({ error: 'Gagal membersihkan soal asesmen' });
        }

        const { error: asesmenDeleteError } = await supabaseAdmin.from('asesmen').delete().in('id_asesmen', asesmenIds);
        if (asesmenDeleteError) {
          console.error('Error deleting asesmen for guru delete:', asesmenDeleteError);
          return res.status(500).json({ error: 'Gagal menghapus asesmen milik guru' });
        }
      }

      // Delete PBL data created by this guru, including dependent rows.
      const { data: pblRows, error: pblRowsError } = await supabaseAdmin.from('pbl').select('id_pbl').eq('guru_pbl', guruId);
      if (pblRowsError) {
        console.error('Error fetching pbl for guru delete:', pblRowsError);
        return res.status(500).json({ error: 'Gagal membaca relasi PBL guru' });
      }

      const pblIds = (pblRows || []).map((row: any) => Number(row.id_pbl)).filter((value: number) => Number.isFinite(value));
      if (pblIds.length > 0) {
        const { data: sintakRows, error: sintakRowsError } = await supabaseAdmin.from('sintak_pbl').select('id_sintak').in('id_pbl', pblIds);
        if (sintakRowsError) {
          console.error('Error fetching sintak_pbl for guru delete:', sintakRowsError);
          return res.status(500).json({ error: 'Gagal membaca relasi sintak PBL' });
        }

        const sintakIds = (sintakRows || []).map((row: any) => Number(row.id_sintak)).filter((value: number) => Number.isFinite(value));
        if (sintakIds.length > 0) {
          const { data: kelompokRows, error: kelompokRowsError } = await supabaseAdmin.from('kelompok_pbl').select('id_kelompok').in('id_sintak', sintakIds);
          if (kelompokRowsError) {
            console.error('Error fetching kelompok_pbl for guru delete:', kelompokRowsError);
            return res.status(500).json({ error: 'Gagal membaca relasi kelompok PBL' });
          }

          const kelompokIds = (kelompokRows || []).map((row: any) => Number(row.id_kelompok)).filter((value: number) => Number.isFinite(value));

          const { data: komentarRows, error: komentarRowsError } = await supabaseAdmin.from('komentar_pbl').select('id_komentar').in('id_sintak', sintakIds);
          if (komentarRowsError) {
            console.error('Error fetching komentar_pbl for guru delete:', komentarRowsError);
            return res.status(500).json({ error: 'Gagal membaca relasi komentar PBL' });
          }

          const komentarIds = (komentarRows || []).map((row: any) => Number(row.id_komentar)).filter((value: number) => Number.isFinite(value));
          if (komentarIds.length > 0) {
            const { error: deleteRepliesError } = await supabaseAdmin.from('komentar_pbl').delete().in('parent_id', komentarIds);
            if (deleteRepliesError) {
              console.error('Error deleting komentar replies for guru delete:', deleteRepliesError);
              return res.status(500).json({ error: 'Gagal membersihkan balasan komentar PBL' });
            }

            const { error: deleteKomentarByIdError } = await supabaseAdmin.from('komentar_pbl').delete().in('id_komentar', komentarIds);
            if (deleteKomentarByIdError) {
              console.error('Error deleting komentar_pbl by ids for guru delete:', deleteKomentarByIdError);
              return res.status(500).json({ error: 'Gagal membersihkan komentar PBL' });
            }
          }

          const { error: pengumpulanDeleteError } = await supabaseAdmin.from('pengumpulan_pbl').delete().in('id_sintak', sintakIds);
          if (pengumpulanDeleteError) {
            console.error('Error deleting pengumpulan_pbl for guru delete:', pengumpulanDeleteError);
            return res.status(500).json({ error: 'Gagal membersihkan pengumpulan PBL' });
          }

          if (kelompokIds.length > 0) {
            const { error: anggotaDeleteError } = await supabaseAdmin.from('anggota_kelompok').delete().in('id_kelompok', kelompokIds);
            if (anggotaDeleteError) {
              console.error('Error deleting anggota_kelompok for guru delete:', anggotaDeleteError);
              return res.status(500).json({ error: 'Gagal membersihkan anggota kelompok PBL' });
            }
          }

          const { error: kelompokDeleteError } = await supabaseAdmin.from('kelompok_pbl').delete().in('id_sintak', sintakIds);
          if (kelompokDeleteError) {
            console.error('Error deleting kelompok_pbl for guru delete:', kelompokDeleteError);
            return res.status(500).json({ error: 'Gagal membersihkan kelompok PBL' });
          }

          const { error: lampiranDeleteError } = await supabaseAdmin.from('lampiran_pbl').delete().in('id_sintak', sintakIds);
          if (lampiranDeleteError) {
            console.error('Error deleting lampiran_pbl for guru delete:', lampiranDeleteError);
            return res.status(500).json({ error: 'Gagal membersihkan lampiran PBL' });
          }
        }

        const { error: sintakDeleteError } = await supabaseAdmin.from('sintak_pbl').delete().in('id_pbl', pblIds);
        if (sintakDeleteError) {
          console.error('Error deleting sintak_pbl for guru delete:', sintakDeleteError);
          return res.status(500).json({ error: 'Gagal membersihkan sintak PBL' });
        }

        const { error: pblDeleteError } = await supabaseAdmin.from('pbl').delete().in('id_pbl', pblIds);
        if (pblDeleteError) {
          console.error('Error deleting pbl for guru delete:', pblDeleteError);
          return res.status(500).json({ error: 'Gagal menghapus PBL milik guru' });
        }
      }

      // Any standalone comments authored by this guru should also be removed.
      const { error: guruKomentarDeleteError } = await supabaseAdmin.from('komentar_pbl').delete().eq('id_guru', guruId);
      if (guruKomentarDeleteError) {
        console.error('Error deleting komentar_pbl authored by guru:', guruKomentarDeleteError);
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

      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan` });
  }
}
