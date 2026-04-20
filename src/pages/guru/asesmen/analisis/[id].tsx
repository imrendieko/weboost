import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowLeft, FaChartLine, FaLightbulb, FaPoll, FaSearch, FaTable, FaTrophy, FaUser } from 'react-icons/fa';
import GuruNavbar from '@/components/GuruNavbar';
import StarBackground from '@/components/StarBackground';
import DataTablePagination from '@/components/DataTablePagination';

interface GuruSession {
  id_guru: number;
  nama_guru: string;
}

interface TPAnalysisGuru {
  id_analisis_guru: number;
  persentase_tp_guru: number;
  saran_guru: string;
  tp_asesmen: number;
  tp_asesmen_detail?: {
    id_tp: number;
    nama_tp: string;
  };
}

interface SummaryGuru {
  total_siswa: number;
  rata_rata_skor: number;
  rata_rata_maksimum: number;
  rata_rata_durasi_detik: number;
}

interface AnalisisGuruResponse {
  summary: SummaryGuru;
  analysis: TPAnalysisGuru[];
}

interface AsesmenDetail {
  judul_asesmen?: string;
}

interface AttemptRow {
  id_attempt: number;
  skor_total: number;
  skor_maksimum: number;
  siswa?: {
    nama_siswa: string;
    kelas?: {
      nama_kelas: string;
    } | null;
    lembaga?: {
      nama_lembaga: string;
    } | null;
  } | null;
}

type StatusFilter = 'all' | 'lulus' | 'tidak_lulus';

function CircularProgress({ percentage, label }: { percentage: number; label: string }) {
  const safePercentage = Math.max(0, Math.min(100, percentage));
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const progressLength = (safePercentage / 100) * arcLength;

  return (
    <div className="flex w-[240px] flex-col items-center">
      <div className="relative flex h-[200px] w-[200px] items-center justify-center">
        <svg
          width="200"
          height="200"
          viewBox="0 0 190 190"
          className="-rotate-[135deg]"
        >
          <circle
            cx="95"
            cy="95"
            r={radius}
            fill="none"
            stroke="#132433"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
          />
          <circle
            cx="95"
            cy="95"
            r={radius}
            fill="none"
            stroke="#73CCFF"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${progressLength} ${circumference}`}
            style={{ transition: 'stroke-dasharray 600ms ease' }}
          />
        </svg>
        <p className="absolute text-[30px] font-bold leading-none text-white">{Math.round(safePercentage)}%</p>
      </div>
      <p className="mt-1 w-full px-2 text-center text-[13px] leading-5 text-gray-200">{label}</p>
    </div>
  );
}

export default function AnalisisAsesmenGuruPage() {
  const router = useRouter();
  const { id } = router.query;
  const asesmenId = typeof id === 'string' ? Number(id) : null;

  const [loading, setLoading] = useState(true);
  const [guruSession, setGuruSession] = useState<GuruSession | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryGuru | null>(null);
  const [analysisData, setAnalysisData] = useState<TPAnalysisGuru[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [asesmenTitle, setAsesmenTitle] = useState('');
  const [scoreRows, setScoreRows] = useState<AttemptRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchName, setSearchName] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const isLulus = (row: AttemptRow) => row.skor_maksimum > 0 && row.skor_total >= row.skor_maksimum * 0.75;

  useEffect(() => {
    // Ambil sesi guru + data analisis inti (summary, detail TP, progres siswa).
    const loadData = async () => {
      try {
        const rawSession = localStorage.getItem('guru_session');
        if (!rawSession) {
          router.push('/login');
          return;
        }

        const session = JSON.parse(rawSession) as GuruSession;
        setGuruSession(session);

        if (!asesmenId || Number.isNaN(asesmenId)) {
          setLoading(false);
          return;
        }

        const [analysisRes, asesmenRes, progresRes] = await Promise.all([fetch(`/api/asesmen/analisis-guru?id_asesmen=${asesmenId}`), fetch(`/api/asesmen/${asesmenId}`), fetch(`/api/asesmen/progres/${asesmenId}`)]);

        const analysisDataRes: AnalisisGuruResponse = await analysisRes.json();

        if (!analysisRes.ok) {
          throw new Error('Gagal mengambil data analisis guru');
        }

        setSummaryData(analysisDataRes.summary);
        setAnalysisData(analysisDataRes.analysis || []);

        if (asesmenRes.ok) {
          const asesmenData: AsesmenDetail = await asesmenRes.json();
          setAsesmenTitle(asesmenData.judul_asesmen || '');
        }

        if (progresRes.ok) {
          const progresData: AttemptRow[] = await progresRes.json();
          setScoreRows(progresData || []);
        }

        if (analysisDataRes.analysis && analysisDataRes.analysis.length > 0) {
          const newSuggestions: string[] = [];
          analysisDataRes.analysis.forEach((item) => {
            if (item.saran_guru) {
              newSuggestions.push(item.saran_guru);
            }
          });
          setSuggestions(newSuggestions);
        }
      } catch (error) {
        console.error('Error loading guru analysis:', error);
      } finally {
        setLoading(false);
      }
    };

    if (router.isReady) {
      loadData();
    }
  }, [router, asesmenId]);

  const filteredScoreRows = useMemo(() => {
    // Tabel siswa dianalisis lewat search + filter status + sorting lulus duluan.
    const keyword = searchName.trim().toLowerCase();
    let rows = scoreRows;

    if (keyword) {
      rows = rows.filter((item) => (item.siswa?.nama_siswa || '').toLowerCase().includes(keyword));
    }

    if (statusFilter === 'lulus') {
      rows = rows.filter((item) => isLulus(item));
    }

    if (statusFilter === 'tidak_lulus') {
      rows = rows.filter((item) => !isLulus(item));
    }

    return [...rows].sort((a, b) => {
      const statusA = isLulus(a) ? 0 : 1;
      const statusB = isLulus(b) ? 0 : 1;

      if (statusA !== statusB) {
        return statusA - statusB;
      }

      return (a.siswa?.nama_siswa || '').localeCompare(b.siswa?.nama_siswa || '', 'id');
    });
  }, [scoreRows, searchName, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredScoreRows.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;
  const paginatedScoreRows = useMemo(() => filteredScoreRows.slice(startIndex, startIndex + rowsPerPage), [filteredScoreRows, startIndex, rowsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchName, statusFilter]);

  const totalLulus = scoreRows.filter((item) => isLulus(item)).length;
  const totalTidakLulus = scoreRows.length - totalLulus;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!guruSession || !summaryData) {
    return null;
  }

  return (
    <div className="analisis-theme-scope min-h-screen bg-black text-white relative overflow-hidden">
      <StarBackground />
      <GuruNavbar guruName={guruSession.nama_guru} />

      <div className="relative z-10 pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="mana-btn mana-btn--neutral mb-6 inline-flex items-center gap-2 rounded-lg px-4 py-2 transition-all"
          >
            <FaArrowLeft className="text-white" />
            Kembali
          </button>

          <div className="mb-8 flex items-center gap-3">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FaChartLine className="text-3xl text-white" />
              Hasil Analisis Asesmen
            </h2>
          </div>
          <p className="-mt-6 mb-8 text-base text-gray-300 font-medium">{asesmenTitle || (asesmenId ? `Asesmen #${asesmenId}` : 'Asesmen')}</p>

          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-8">
              <p className="text-gray-400 text-base font-medium mb-2 inline-flex items-center gap-2">
                <FaPoll className="text-white" />
                Rata-rata Nilai Siswa
              </p>
              <div className="text-5xl font-bold text-white">
                {summaryData.rata_rata_skor}/{summaryData.rata_rata_maksimum}
              </div>
              <div className="mt-2 h-1 bg-gradient-to-r from-[#0E5BFF] to-transparent rounded-full" />
            </div>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-8">
              <p className="text-gray-400 text-base font-medium mb-2 inline-flex items-center gap-2">
                <FaUser className="text-white" />
                Jumlah Siswa Submit
              </p>
              <div className="text-5xl font-bold text-white">{summaryData.total_siswa}</div>
              <div className="mt-2 h-1 bg-gradient-to-r from-[#0E5BFF] to-transparent rounded-full" />
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <FaTrophy className="text-white" />
              Ketercapaian Tujuan Pembelajaran
            </h2>

            {analysisData.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">Belum ada data analisis TP tersedia.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-8 place-items-center">
                {analysisData.map((item) => (
                  <div
                    key={item.id_analisis_guru}
                    className="flex justify-center"
                  >
                    <CircularProgress
                      percentage={Math.round(item.persentase_tp_guru)}
                      label={item.tp_asesmen_detail?.nama_tp || 'TP Unknown'}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <FaLightbulb className="text-white" />
            Saran Pembelajaran
          </h2>
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 md:p-8">
            <div className="space-y-3">
              {suggestions.length > 0 ? (
                <ol className="list-decimal pl-5 space-y-3">
                  {suggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      className="text-base text-gray-300 leading-relaxed"
                    >
                      {suggestion}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-base text-gray-400">Belum ada saran pembelajaran.</p>
              )}
            </div>
          </div>

          <div className="mt-10">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <FaTable className="text-white" />
              Nilai Asesmen Siswa
            </h2>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center">
                  <FaSearch className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Cari nama siswa"
                  className="nilai-asesmen-filter h-10 w-full rounded-lg border border-white/10 bg-gray-800/60 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="nilai-asesmen-filter h-10 rounded-lg border border-white/10 bg-gray-800/60 px-3 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">Semua Status</option>
                <option value="lulus">Lulus</option>
                <option value="tidak_lulus">Tidak Lulus</option>
              </select>
            </div>

            <div className="mb-4 flex flex-wrap gap-2 text-xs sm:text-sm">
              <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-300">Lulus: {totalLulus}</span>
              <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-amber-300">Tidak Lulus: {totalTidakLulus}</span>
            </div>

            <div className="nilai-asesmen-table-wrap rounded-2xl border border-white/10 bg-gray-900/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="nilai-asesmen-table w-full min-w-[760px] text-sm">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">No</th>
                      <th className="px-4 py-3 text-left font-semibold">Nama Siswa</th>
                      <th className="px-4 py-3 text-left font-semibold">Kelas</th>
                      <th className="px-4 py-3 text-left font-semibold">Sekolah</th>
                      <th className="px-4 py-3 text-left font-semibold">Nilai</th>
                      <th className="px-4 py-3 text-left font-semibold">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScoreRows.length === 0 ? (
                      <tr>
                        <td
                          className="px-4 py-8 text-center text-gray-400"
                          colSpan={6}
                        >
                          Belum ada data nilai siswa.
                        </td>
                      </tr>
                    ) : (
                      paginatedScoreRows.map((item, index) => {
                        const lulus = isLulus(item);
                        return (
                          <tr
                            key={item.id_attempt}
                            className="border-t border-white/10"
                          >
                            <td className="px-4 py-3">{startIndex + index + 1}</td>
                            <td className="px-4 py-3">{item.siswa?.nama_siswa || '-'}</td>
                            <td className="px-4 py-3">{item.siswa?.kelas?.nama_kelas || '-'}</td>
                            <td className="px-4 py-3">{item.siswa?.lembaga?.nama_lembaga || '-'}</td>
                            <td className="px-4 py-3 font-semibold">{item.skor_total}</td>
                            <td className={`px-4 py-3 font-semibold ${lulus ? 'text-emerald-300' : 'text-amber-300'}`}>{lulus ? 'Lulus' : 'Tidak Lulus'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {filteredScoreRows.length > 0 && (
                <div className="px-4 pb-4">
                  <DataTablePagination
                    totalItems={filteredScoreRows.length}
                    currentPage={safePage}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setCurrentPage}
                    onRowsPerPageChange={setRowsPerPage}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
