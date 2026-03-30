import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import GuruNavbar from '@/components/GuruNavbar';
import StarBackground from '@/components/StarBackground';
import { FaArrowLeft, FaCheck, FaExclamationTriangle, FaSearch, FaTrash, FaChartBar, FaChartLine } from 'react-icons/fa';

interface GuruSession {
  id_guru: number;
  nama_guru: string;
}

interface AttemptRow {
  id_attempt: number;
  submitted_at: string;
  skor_total: number;
  skor_maksimum: number;
  siswa?: {
    id_siswa: number;
    nama_siswa: string;
    kelas?: {
      nama_kelas: string;
    } | null;
    lembaga?: {
      nama_lembaga: string;
    } | null;
  } | null;
}

type ToastType = 'success' | 'error';
type SortType = 'default' | 'nilai_desc' | 'nilai_asc' | 'nama_asc' | 'nama_desc';

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ProgresPengerjaanAsesmenPage() {
  const router = useRouter();
  const { id } = router.query;
  const idAsesmen = typeof id === 'string' ? Number(id) : null;

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [guru, setGuru] = useState<GuruSession | null>(null);
  const [rows, setRows] = useState<AttemptRow[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('default');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: ToastType }>({
    show: false,
    message: '',
    type: 'success',
  });
  const [deleteTarget, setDeleteTarget] = useState<{ id_attempt: number; nama: string } | null>(null);

  const neutralButtonClass = 'mana-btn mana-btn--neutral inline-flex items-center gap-2 rounded-lg px-4 py-2 transition-all';
  const primaryButtonClass = 'mana-btn mana-btn--primary inline-flex items-center gap-2 rounded-lg px-3 py-2 transition-all';
  const dangerButtonClass = 'mana-btn mana-btn--danger inline-flex items-center gap-2 rounded-lg px-3 py-2 transition-all';

  const showToast = (message: string, type: ToastType) => {
    setToast({ show: true, message, type });
    window.setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3500);
  };

  const fetchProgres = async (currentAsesmenId: number) => {
    const response = await fetch(`/api/asesmen/progres/${currentAsesmenId}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.error || 'Gagal memuat progres pengerjaan');
    }

    setRows(result || []);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const rawSession = localStorage.getItem('guru_session');
        if (!rawSession) {
          router.push('/login');
          return;
        }

        const session = JSON.parse(rawSession) as GuruSession;
        setGuru(session);

        if (!idAsesmen || Number.isNaN(idAsesmen)) {
          setLoading(false);
          return;
        }

        await fetchProgres(idAsesmen);
      } catch (error) {
        console.error(error);
        showToast(error instanceof Error ? error.message : 'Gagal memuat data', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (router.isReady) {
      init();
    }
  }, [router.isReady, idAsesmen]);

  // Refresh data when page becomes visible (tab/window focus) or router changes
  useEffect(() => {
    if (!idAsesmen || Number.isNaN(idAsesmen)) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page became visible, refreshing progres data...');
        fetchProgres(idAsesmen).catch((error) => {
          console.error('Error refreshing progres data:', error);
        });
      }
    };

    const handleRouterChange = () => {
      if (router.pathname.includes('/progres/')) {
        console.log('Router change detected, refreshing progres data...');
        fetchProgres(idAsesmen).catch((error) => {
          console.error('Error refreshing progres data:', error);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    router.events?.on('routeChangeComplete', handleRouterChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      router.events?.off('routeChangeComplete', handleRouterChange);
    };
  }, [idAsesmen, router]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    let result = rows;

    if (keyword) {
      result = rows.filter((item) => {
        const nama = item.siswa?.nama_siswa?.toLowerCase() || '';
        const kelas = item.siswa?.kelas?.nama_kelas?.toLowerCase() || '';
        const lembaga = item.siswa?.lembaga?.nama_lembaga?.toLowerCase() || '';
        return nama.includes(keyword) || kelas.includes(keyword) || lembaga.includes(keyword);
      });
    }

    // Apply sorting
    let sorted = [...result];
    switch (sortBy) {
      case 'nilai_desc':
        sorted.sort((a, b) => b.skor_total / b.skor_maksimum - a.skor_total / a.skor_maksimum);
        break;
      case 'nilai_asc':
        sorted.sort((a, b) => a.skor_total / a.skor_maksimum - b.skor_total / b.skor_maksimum);
        break;
      case 'nama_asc':
        sorted.sort((a, b) => (a.siswa?.nama_siswa || '').localeCompare(b.siswa?.nama_siswa || '', 'id'));
        break;
      case 'nama_desc':
        sorted.sort((a, b) => (b.siswa?.nama_siswa || '').localeCompare(a.siswa?.nama_siswa || '', 'id'));
        break;
      default:
        break;
    }

    return sorted;
  }, [rows, search, sortBy]);

  const confirmDelete = async () => {
    if (!idAsesmen || !deleteTarget) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/asesmen/progres/${idAsesmen}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_attempt: deleteTarget.id_attempt }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Gagal menghapus pengerjaan siswa');
      }

      setDeleteTarget(null);
      await fetchProgres(idAsesmen);
      showToast('Pengerjaan siswa berhasil dihapus', 'success');
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : 'Gagal menghapus pengerjaan siswa', 'error');
    } finally {
      setDeleting(false);
    }
  };

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

      {toast.show && (
        <div className={`fixed top-24 right-6 z-[70] rounded-lg border px-5 py-3 shadow-lg ${toast.type === 'success' ? 'bg-green-500/90 border-green-300/40' : 'bg-red-500/90 border-red-300/40'}`}>
          <p className="text-sm font-semibold">{toast.message}</p>
        </div>
      )}

      {guru && <GuruNavbar guruName={guru.nama_guru} />}

      <div className="relative z-10 pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3 flex-wrap">
                <FaChartBar className="text-white flex-shrink-0" />
                <span>Progres Pengerjaan Asesmen</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">Daftar siswa yang sudah mengumpulkan pengerjaan.</p>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-2 sm:gap-3">
            {/* Row 1: Back button and Search */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className={neutralButtonClass + ' !px-3 !py-1 text-xs'}
              >
                <FaArrowLeft />
                Kembali
              </button>

              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama/kelas/lembaga"
                  className="w-full rounded-lg border border-white/10 bg-gray-800/60 pl-10 pr-4 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Row 2: Sort dropdowns */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {/* Filter Nilai */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-800/50 border border-white/10 rounded-lg text-xs sm:text-sm text-white focus:outline-none focus:border-[#0080FF]/50"
              >
                <option value="default">Urutkan: Nilai</option>
                <option value="nilai_desc">Nilai Tertinggi</option>
                <option value="nilai_asc">Nilai Terendah</option>
              </select>

              {/* Filter Nama */}
              <select
                value={sortBy === 'nama_asc' || sortBy === 'nama_desc' ? sortBy : 'nama_asc'}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-800/50 border border-white/10 rounded-lg text-xs sm:text-sm text-white focus:outline-none focus:border-[#0080FF]/50"
              >
                <option value="nama_asc">Urutkan: Nama A-Z</option>
                <option value="nama_desc">Nama Z-A</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-gray-900/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">No</th>
                    <th className="px-4 py-3 text-left font-semibold">Nama</th>
                    <th className="px-4 py-3 text-left font-semibold">Kelas</th>
                    <th className="px-4 py-3 text-left font-semibold">Lembaga</th>
                    <th className="px-4 py-3 text-left font-semibold">Waktu Pengumpulan</th>
                    <th className="px-4 py-3 text-left font-semibold">Nilai</th>
                    <th className="px-4 py-3 text-left font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-10 text-center text-gray-400"
                        colSpan={7}
                      >
                        Belum ada data pengerjaan untuk asesmen ini.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((item, index) => (
                      <tr
                        key={item.id_attempt}
                        className="border-t border-white/10"
                      >
                        <td className="px-4 py-3">{index + 1}</td>
                        <td className="px-4 py-3">{item.siswa?.nama_siswa || '-'}</td>
                        <td className="px-4 py-3">{item.siswa?.kelas?.nama_kelas || '-'}</td>
                        <td className="px-4 py-3">{item.siswa?.lembaga?.nama_lembaga || '-'}</td>
                        <td className="px-4 py-3">{formatDateTime(item.submitted_at)}</td>
                        <td className="px-4 py-3">
                          {item.skor_total} / {item.skor_maksimum}
                        </td>
                        <td className="px-2 sm:px-4 py-3">
                          <div className="flex gap-1 sm:gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.siswa?.id_siswa && idAsesmen) {
                                  router.push(`/guru/asesmen/analisis-siswa/${idAsesmen}?siswa_id=${item.siswa.id_siswa}`);
                                }
                              }}
                              title="Hasil Analisis"
                              className={primaryButtonClass + ' text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2'}
                            >
                              <FaChartLine className="flex-shrink-0" />
                              <span className="hidden sm:inline">Hasil Analisis</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  id_attempt: item.id_attempt,
                                  nama: item.siswa?.nama_siswa || 'Siswa',
                                })
                              }
                              title="Hapus Pengerjaan"
                              className={dangerButtonClass + ' text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2'}
                            >
                              <FaTrash className="flex-shrink-0" />
                              <span className="hidden sm:inline">Hapus Pengerjaan</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-red-400/30 bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-300">
                <FaExclamationTriangle />
              </div>
              <div>
                <h3 className="text-lg font-bold">Hapus Pengumpulan?</h3>
                <p className="text-sm text-gray-400">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <p className="text-sm text-gray-200 mb-5">
              Yakin ingin menghapus pengerjaan milik <span className="font-semibold">{deleteTarget.nama}</span>?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className={neutralButtonClass}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className={`${dangerButtonClass} px-4 disabled:opacity-60`}
              >
                {deleting ? <FaCheck className="animate-pulse" /> : <FaTrash />}
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
