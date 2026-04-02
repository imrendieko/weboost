import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { hashPasswordIfNeeded } from '@/lib/password';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET - Get admin profile
  if (req.method === 'GET') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID admin harus disediakan' });
      }

      const { data, error } = await supabaseAdmin.from('admin').select('id_admin, nama_admin, email_admin, password_admin').eq('id_admin', id).single();

      if (error) {
        console.error('Error fetching admin profile:', error);
        return res.status(500).json({ error: 'Gagal mengambil data profil admin' });
      }

      if (!data) {
        return res.status(404).json({ error: 'Profil admin tidak ditemukan' });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error in GET /api/admin/profil:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  }

  // PUT - Update admin profile
  if (req.method === 'PUT') {
    try {
      const { id, nama_admin, email_admin, password_admin } = req.body;

      console.log('PUT /api/admin/profil - Request body:', { id, nama_admin, email_admin, password_admin: '***' });

      // Convert id to integer
      const adminId = parseInt(id);

      if (!adminId || isNaN(adminId)) {
        return res.status(400).json({ error: 'ID admin tidak valid' });
      }

      if (!nama_admin || !email_admin || !password_admin) {
        return res.status(400).json({ error: 'Semua field harus diisi' });
      }

      // Update using raw RPC call as fallback if needed
      const hashedPassword = await hashPasswordIfNeeded(String(password_admin));
      const updateData = {
        nama_admin: nama_admin.trim(),
        email_admin: email_admin.trim().toLowerCase(),
        password_admin: hashedPassword,
      };

      console.log('Attempting to update admin ID:', adminId);

      // Try update with select in one query
      const { data: updatedData, error: updateError } = await supabaseAdmin.from('admin').update(updateData).eq('id_admin', adminId).select('id_admin, nama_admin, email_admin, password_admin').single();

      console.log('Update result:', { updatedData, updateError });

      if (updateError) {
        console.error('Supabase update error:', updateError);

        // Try alternative approach with RPC
        try {
          console.log('Trying RPC approach...');
          const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('update_admin_profile', {
            admin_id: adminId,
            new_nama: updateData.nama_admin,
            new_email: updateData.email_admin,
            new_password: updateData.password_admin,
          });

          if (!rpcError && rpcData) {
            console.log('RPC update successful');
            return res.status(200).json({
              success: true,
              message: 'Profil berhasil diperbarui (via RPC)',
              data: {
                id_admin: adminId,
                ...updateData,
              },
            });
          }
        } catch (rpcErr) {
          console.log('RPC not available, continuing with error response');
        }

        return res.status(500).json({
          error: 'Gagal memperbarui profil admin',
          details: updateError.message,
          hint: 'Check RLS policies and service role key',
        });
      }

      if (!updatedData) {
        console.error('No data returned - possible RLS issue');
        return res.status(500).json({
          error: 'Update gagal - data tidak dikembalikan',
          details: 'Kemungkinan masalah RLS policy. Jalankan SQL_FIX_ADMIN_RLS.sql',
        });
      }

      console.log('Update successful:', updatedData);

      return res.status(200).json({
        success: true,
        message: 'Profil berhasil diperbarui',
        data: updatedData,
      });
    } catch (error) {
      console.error('Exception in PUT /api/admin/profil:', error);
      return res.status(500).json({
        error: 'Terjadi kesalahan server',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Method not allowed
  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
