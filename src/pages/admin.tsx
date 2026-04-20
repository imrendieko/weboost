import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '@/lib/db';
import AdminNavbar from '@/components/AdminNavbar';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import { KelolaUserStats, KelolaSekolahStats, KelolaKelasStats, KelolaElemenStats } from '@/components/AdminStatsCards';

interface AdminData {
  id_admin: number;
  nama_admin: string;
  email_admin: string;
}

interface StatsData {
  guruBelumValidasi: number;
  guruSudahValidasi: number;
  siswaBelumValidasi: number;
  siswaSudahValidasi: number;
  sekolahTerdaftar: number;
  kelasTerdaftar: number;
  elemenTerdaftar: number;
}

export default function Admin() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [stats, setStats] = useState<StatsData>({
    guruBelumValidasi: 0,
    guruSudahValidasi: 0,
    siswaBelumValidasi: 0,
    siswaSudahValidasi: 0,
    sekolahTerdaftar: 0,
    kelasTerdaftar: 0,
    elemenTerdaftar: 0,
  });

  // Get current date in Indonesian format
  const getCurrentDate = () => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const now = new Date();
    const dayName = days[now.getDay()];
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();

    return `${dayName}, ${day} ${month} ${year}`;
  };

  useEffect(() => {
    if (!router.isReady) return;

    // Cek sesi admin dulu, kalau valid baru lanjut ambil data dashboard.
    const checkAdminAuth = async () => {
      try {
        // Check if user is logged in
        const adminSession = localStorage.getItem('admin_session');

        if (!adminSession) {
          window.location.replace('/');
          return;
        }

        const sessionData = JSON.parse(adminSession);

        // Fetch admin data from database
        const { data: admin, error: adminError } = await supabase.from('admin').select('*').eq('id_admin', sessionData.id_admin).single();

        if (adminError || !admin) {
          console.error('Error fetching admin data:', adminError);
          localStorage.removeItem('admin_session');
          window.location.replace('/');
          return;
        }

        setAdminData(admin);

        // Fetch statistics data
        await fetchStats();

        setLoading(false);
      } catch (error) {
        console.error('Error checking admin auth:', error);
        window.location.replace('/');
      }
    };

    checkAdminAuth();
  }, [router]);

  const fetchStats = async () => {
    try {
      // Kita hitung statistik satu per satu biar kartu dashboard kebaca jelas.
      // Count guru belum validasi (status_guru = false)
      const { count: guruBelumValidasi, error: guruBelumError } = await supabase.from('guru').select('*', { count: 'exact', head: true }).eq('status_guru', false);

      // Count guru sudah validasi (status_guru = true)
      const { count: guruSudahValidasi, error: guruSudahError } = await supabase.from('guru').select('*', { count: 'exact', head: true }).eq('status_guru', true);

      // Count siswa belum validasi (status_siswa = false)
      const { count: siswaBelumValidasi } = await supabase.from('siswa').select('*', { count: 'exact', head: true }).eq('status_siswa', false);

      // Count siswa sudah validasi (status_siswa = true)
      const { count: siswaSudahValidasi } = await supabase.from('siswa').select('*', { count: 'exact', head: true }).eq('status_siswa', true);

      // Count sekolah (assuming lembaga table exists)
      // If not exists, set to 0
      let totalSekolah = 0;
      try {
        const { count: sekolahCount } = await supabase.from('lembaga').select('*', { count: 'exact', head: true });
        totalSekolah = sekolahCount || 0;
      } catch (e) {
        console.log('Lembaga table not found, setting to 0');
      }

      // Count kelas (assuming kelas table exists)
      let totalKelas = 0;
      try {
        const { count: kelasCount } = await supabase.from('kelas').select('*', { count: 'exact', head: true });
        totalKelas = kelasCount || 0;
      } catch (e) {
        console.log('Kelas table not found, setting to 0');
      }

      // Count elemen (assuming elemen table exists)
      let totalElemen = 0;
      try {
        const { count: elemenCount } = await supabase.from('elemen').select('*', { count: 'exact', head: true });
        totalElemen = elemenCount || 0;
      } catch (e) {
        console.log('Elemen table not found, setting to 0');
      }

      setStats({
        guruBelumValidasi: guruBelumValidasi || 0,
        guruSudahValidasi: guruSudahValidasi || 0,
        siswaBelumValidasi: siswaBelumValidasi || 0,
        siswaSudahValidasi: siswaSudahValidasi || 0,
        sekolahTerdaftar: totalSekolah,
        kelasTerdaftar: totalKelas,
        elemenTerdaftar: totalElemen,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B1F] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!adminData) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-[#0B0B1F] overflow-hidden">
      {/* Star Background */}
      <StarBackground />

      {/* Admin Navbar */}
      <AdminNavbar adminName={adminData.nama_admin} />

      {/* Main Content */}
      <div className="relative pt-32 pb-12 px-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-white text-3xl md:text-4xl font-bold mb-2">Selamat Datang, {adminData.nama_admin.split(' ')[0]}!</h1>
            <p className="text-gray-400 text-sm md:text-base">{getCurrentDate()}</p>
          </div>

          {/* Clock Timer */}
          <div className="flex justify-start md:justify-end">
            <CountdownTimer showDate={false} />
          </div>
        </div>

        {/* Statistics Section */}
        <div className="mb-8">
          <KelolaUserStats
            guruBelumValidasi={stats.guruBelumValidasi}
            guruSudahValidasi={stats.guruSudahValidasi}
            siswaBelumValidasi={stats.siswaBelumValidasi}
            siswaSudahValidasi={stats.siswaSudahValidasi}
          />
        </div>

        {/* Grid for other statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <KelolaSekolahStats sekolahTerdaftar={stats.sekolahTerdaftar} />

          <KelolaKelasStats kelasTerdaftar={stats.kelasTerdaftar} />

          <KelolaElemenStats elemenTerdaftar={stats.elemenTerdaftar} />
        </div>
      </div>

      {/* Footer */}
      <footer className="relative py-8 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400 text-sm">
            Copyright © 2026 All right reserved | This website is made with ❤️ by{' '}
            <a
              href="https://instagram.com/imrendieko"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0080FF] hover:underline"
            >
              @rendi
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
