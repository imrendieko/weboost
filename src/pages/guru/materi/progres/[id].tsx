import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import GuruNavbar from '@/components/GuruNavbar';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import DataTablePagination from '@/components/DataTablePagination';
import supabase from '@/lib/db';
import { FaSearch, FaSortAlphaDown, FaSortAlphaUp, FaChartBar, FaArrowLeft } from 'react-icons/fa';

interface GuruData {
  id_guru: number;
  nama_guru: string;
  email_guru: string;
}

interface ProgresData {
  id_siswa: number;
  nama_siswa: string;
  email_siswa: string;
  nama_kelas: string;
  persentase_progres: number;
}

export default function ProgresMateri() {
  const router = useRouter();
  const { id } = router.query; // id_sub_bab
  const [loading, setLoading] = useState(true);
  const [guruData, setGuruData] = useState<GuruData | null>(null);
  const [progresData, setProgresData] = useState<ProgresData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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
    const checkGuruAuth = async () => {
      try {
        const guruSession = localStorage.getItem('guru_session');

        if (!guruSession) {
          router.push('/login');
          return;
        }

        const sessionData = JSON.parse(guruSession);
        setGuruData(sessionData);
        setLoading(false);
      } catch (error) {
        console.error('Error checking guru auth:', error);
        router.push('/login');
      }
    };

    checkGuruAuth();
  }, [router]);

  useEffect(() => {
    if (id && !Array.isArray(id)) {
      fetchProgresData();
    }
  }, [id]);

  const fetchProgresData = async () => {
    try {
      console.log('🔍 Fetching progres data for sub_bab id:', id);

      // Step 1: Get sub_bab info
      const { data: subBabData, error: subBabError } = await supabase.from('sub_bab').select('*, nama_bab').eq('id_sub_bab', id).single();

      if (subBabError || !subBabData) {
        console.error('❌ Error fetching sub_bab:', subBabError);
        return;
      }

      console.log('✅ Sub-bab data:', subBabData);

      // Step 2: Get bab info
      const { data: babData, error: babError } = await supabase.from('bab_materi').select('*, nama_materi').eq('id_bab', subBabData.nama_bab).single();

      if (babError || !babData) {
        console.error('❌ Error fetching bab:', babError);
        return;
      }

      console.log('✅ Bab data:', babData);

      // Step 3: Get materi info with elemen
      const { data: materiData, error: materiError } = await supabase
        .from('materi')
        .select(
          `
          *,
          elemen:id_elemen (
            id_elemen,
            nama_elemen,
            kelas_elemen
          )
        `,
        )
        .eq('id_materi', babData.nama_materi)
        .single();

      if (materiError || !materiData) {
        console.error('❌ Error fetching materi:', materiError);
        return;
      }

      console.log('✅ Materi data:', materiData);

      // Step 3b: Hitung total sub-bab lintas semua sintak pada elemen yang sama.
      const elemenId = Number(materiData.elemen?.id_elemen ?? NaN);
      let materiIdsForElemen: number[] = [Number(babData.nama_materi)];

      if (Number.isFinite(elemenId) && elemenId > 0) {
        const { data: materiByElemen, error: materiByElemenError } = await supabase
          .from('materi')
          .select('id_materi')
          .eq('id_elemen', elemenId);

        if (materiByElemenError) {
          console.error('❌ Error fetching materi by elemen for progress denominator:', materiByElemenError);
        } else {
          materiIdsForElemen = [
            ...new Set([
              ...materiIdsForElemen,
              ...((materiByElemen || []).map((item: any) => Number(item.id_materi)).filter((value: number) => Number.isFinite(value) && value > 0) as number[]),
            ]),
          ];
        }
      }

      const { data: babRowsForElemen, error: babRowsForElemenError } = await supabase.from('bab_materi').select('id_bab').in('nama_materi', materiIdsForElemen);

      if (babRowsForElemenError) {
        console.error('❌ Error fetching bab_materi for progress denominator:', babRowsForElemenError);
      }

      const babIdsForElemen = ((babRowsForElemen || []).map((item: any) => Number(item.id_bab)).filter((value: number) => Number.isFinite(value) && value > 0) as number[]);

      let totalSubBabAcrossSintak = 0;
      if (babIdsForElemen.length > 0) {
        const { data: subBabRowsForElemen, error: subBabRowsForElemenError } = await supabase.from('sub_bab').select('id_sub_bab').in('nama_bab', babIdsForElemen);

        if (subBabRowsForElemenError) {
          console.error('❌ Error fetching sub_bab for progress denominator:', subBabRowsForElemenError);
        } else {
          totalSubBabAcrossSintak = (subBabRowsForElemen || []).length;
        }
      }

      console.log('✅ Total sub-bab lintas sintak:', totalSubBabAcrossSintak);

      // Get kelas_id from elemen
      const kelasId = materiData.elemen?.kelas_elemen;

      if (!kelasId) {
        console.error('❌ Kelas tidak ditemukan untuk materi ini');
        showNotification('Kelas tidak ditemukan untuk materi ini', 'error');
        return;
      }

      console.log('✅ Filtering siswa by kelas_id:', kelasId);

      // Step 4: Fetch siswa with matching kelas only
      const { data: siswaData, error: siswaError } = await supabase
        .from('siswa')
        .select(
          `
          id_siswa,
          nama_siswa,
          email_siswa,
          kelas:kelas_siswa (
            id_kelas,
            nama_kelas
          )
        `,
        )
        .eq('kelas_siswa', kelasId)
        .order('nama_siswa', { ascending: true });

      if (siswaError) {
        console.error('❌ Error fetching siswa:', siswaError);
        return;
      }

      console.log('✅ Found siswa:', siswaData?.length || 0);

      // Step 5: Fetch progres data for each siswa
      const transformedData: ProgresData[] = await Promise.all(
        (siswaData || []).map(async (siswa: any) => {
          // Ambil baris progres terbaru agar konsisten dengan progres yang dilihat siswa.
          const { data: progresData, error: progresError } = await supabase
            .from('progres_materi')
            .select('persentase_progres,sub_bab_selesai,total_sub_bab,created_at')
            .eq('nama_siswa', siswa.id_siswa)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (progresError) {
            console.error(`❌ Error fetching progres_materi siswa ${siswa.id_siswa}:`, progresError);
          }

          const subBabSelesai = typeof progresData?.sub_bab_selesai === 'number' ? progresData.sub_bab_selesai : 0;
          const persentaseValue = totalSubBabAcrossSintak > 0 ? Math.round((Math.min(subBabSelesai, totalSubBabAcrossSintak) / totalSubBabAcrossSintak) * 100) : 0;

          return {
            id_siswa: siswa.id_siswa,
            nama_siswa: siswa.nama_siswa,
            email_siswa: siswa.email_siswa,
            nama_kelas: siswa.kelas?.nama_kelas || '-',
            persentase_progres: persentaseValue,
          };
        }),
      );

      setProgresData(transformedData);
      console.log('✅ Progres data updated:', transformedData.length, 'records');
    } catch (error) {
      console.error('❌ Error fetching progres data:', error);
      showNotification('Gagal memuat data progres', 'error');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    // Simple console log for now, you can implement a toast notification
    if (type === 'error') {
      console.error('Notification:', message);
    } else {
      console.log('Notification:', message);
    }
  };

  const filteredData = progresData.filter(
    (item) => item.nama_siswa.toLowerCase().includes(searchTerm.toLowerCase()) || item.email_siswa.toLowerCase().includes(searchTerm.toLowerCase()) || item.nama_kelas.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Sort data by nama_siswa
  const sortedData = [...filteredData].sort((a, b) => {
    if (sortOrder === 'asc') {
      return a.nama_siswa.localeCompare(b.nama_siswa);
    } else {
      return b.nama_siswa.localeCompare(a.nama_siswa);
    }
  });

  const totalPages = Math.max(1, Math.ceil(sortedData.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = sortedData.slice(startIndex, endIndex);

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <StarBackground />

      {guruData && <GuruNavbar guruName={guruData.nama_guru} />}

      <div className="relative z-10 pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Selamat Datang, <span className="text-[#FFFFFF]">{guruData?.nama_guru.split(' ')[0]}!</span>
              </h1>
              <p className="text-gray-400">{getCurrentDate()}</p>
            </div>

            {/* Clock Timer */}
            <CountdownTimer showDate={false} />
          </div>

          {/* Back Button */}
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 rounded-lg border border-white/10 bg-gray-800/50 px-3 sm:px-4 py-1.5 sm:py-2 text-gray-300 transition-all hover:bg-gray-700/50 hover:text-white"
          >
            <FaArrowLeft />
            Kembali
          </button>

          {/* Content */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <FaChartBar className="text-[#FFFFFF]" />
              Statistik Siswa Mengakses Materi
            </h2>

            {/* Table Controls */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={toggleSortOrder}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-white/10 px-4 py-2 rounded-lg transition-colors"
              >
                {sortOrder === 'asc' ? <FaSortAlphaDown /> : <FaSortAlphaUp />}
                Urutkan {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
              </button>

              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari berdasarkan nama"
                  className="w-full bg-gray-800 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="py-3 px-4">No</th>
                    <th className="py-3 px-4">Nama</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4">Progres</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-gray-400"
                      >
                        Belum ada data siswa
                      </td>
                    </tr>
                  ) : (
                    currentData.map((item, index) => {
                      const progressValue = Math.max(0, Math.min(100, Number(item.persentase_progres) || 0));
                      const isZeroProgress = progressValue === 0;

                      return (
                        <tr
                          key={item.id_siswa}
                          className="border-b border-white/10 hover:bg-white/5"
                        >
                          <td className="py-4 px-4">{startIndex + index + 1}</td>
                          <td className="py-4 px-4">{item.nama_siswa}</td>
                          <td className="py-4 px-4">{item.email_siswa}</td>
                          <td className="py-4 px-4">{item.nama_kelas}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`relative h-6 flex-1 overflow-hidden rounded-full border ${isZeroProgress ? 'border-amber-400/70 bg-amber-100/70' : 'border-white/20 bg-gray-700'}`}>
                                <div
                                  className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                                  style={{ width: `${progressValue}%` }}
                                />
                                {isZeroProgress && <div className="absolute inset-y-1 left-1 w-3 rounded-full bg-amber-500/75" />}
                              </div>
                              <span
                                className={`min-w-[52px] rounded-full border px-2.5 py-0.5 text-right text-sm font-semibold ${
                                  isZeroProgress ? 'border-amber-400/70 bg-amber-100/80 text-amber-900' : 'border-green-400/40 bg-green-500/15 text-white'
                                }`}
                              >
                                {progressValue}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {sortedData.length > 0 && (
              <DataTablePagination
                totalItems={sortedData.length}
                currentPage={currentPage}
                rowsPerPage={rowsPerPage}
                onPageChange={setCurrentPage}
                onRowsPerPageChange={setRowsPerPage}
              />
            )}
          </div>
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
