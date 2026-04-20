import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AdminNavbar from '@/components/AdminNavbar';
import StarBackground from '@/components/StarBackground';
import JawabanSiswaTable from '@/components/JawabanSiswaTable';
import { FaArrowLeft, FaChartLine, FaClock, FaLightbulb, FaPoll, FaTrophy, FaGraduationCap, FaCheckCircle, FaHourglassEnd, FaExclamationCircle } from 'react-icons/fa';

interface AdminSession {
  id_admin: number;
  nama_admin: string;
}

interface SiswaInfo {
  id_siswa: number;
  nama_siswa: string;
}

interface TPAnalysis {
  id_analisis_siswa: number;
  persentase_tp_siswa: number;
  saran_siswa: string;
  tp_asesmen: number;
  tp_asesmen_detail?: {
    id_tp: number;
    nama_tp: string;
  };
}

interface AttemptData {
  skor_total: number;
  skor_maksimum: number;
  durasi_detik: number;
}

interface AnalisisResponse {
  attempt: AttemptData;
  analysis: TPAnalysis[];
  siswa?: SiswaInfo;
  pending_validation?: boolean;
}

interface AsesmenDetail {
  judul_asesmen?: string;
}

interface Jawaban {
  id_soal: string;
  urutan_soal: number;
  teks_soal: string;
  tipe_soal: string;
  nilai_soal: number;
  jawaban_siswa: string | null;
  kunci_jawaban: string | null;
  skor_asli: number;
  skor_tervalidasi: number | null;
  status_validasi: string | null;
}

interface JawabanResponse {
  id_attempt: string;
  jawaban: Jawaban[];
}

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

export default function AnalisisSiswaAsesmenAdmin() {
  const router = useRouter();
  const { id } = router.query;
  const asesmenId = typeof id === 'string' ? Number(id) : null;
  const siswaId = typeof router.query.siswa_id === 'string' ? Number(router.query.siswa_id) : null;

  const [loading, setLoading] = useState(true);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [siswaInfo, setSiswaInfo] = useState<SiswaInfo | null>(null);
  const [attemptData, setAttemptData] = useState<AttemptData | null>(null);
  const [analysisData, setAnalysisData] = useState<TPAnalysis[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [asesmenTitle, setAsesmenTitle] = useState('');
  const [jawabanList, setJawabanList] = useState<Jawaban[]>([]);
  const [pendingValidation, setPendingValidation] = useState(false);

  useEffect(() => {
    // Detail analisis per siswa: load attempt, analisis TP, dan jawaban terstruktur.
    const loadData = async () => {
      const rawAdminSession = localStorage.getItem('admin_session');
      if (!rawAdminSession) {
        router.push('/login');
        return;
      }

      const adminSession = JSON.parse(rawAdminSession) as AdminSession;
      setAdminSession(adminSession);

      if (!asesmenId || !siswaId || Number.isNaN(asesmenId) || Number.isNaN(siswaId)) {
        setLoading(false);
        return;
      }

      try {
        const asesmenResponse = await fetch(`/api/asesmen/${asesmenId}`);
        if (asesmenResponse.ok) {
          const asesmenData: AsesmenDetail = await asesmenResponse.json();
          setAsesmenTitle(asesmenData.judul_asesmen || '');
        }

        const fetchAnalisis = async () => {
          const response = await fetch(`/api/asesmen/analisis?id_asesmen=${asesmenId}&id_siswa=${siswaId}`);
          const data: AnalisisResponse = await response.json();
          if (!response.ok) {
            throw new Error('Gagal mengambil data analisis');
          }
          return data;
        };

        let data = await fetchAnalisis();
        setPendingValidation(Boolean(data.pending_validation));

        if (data.siswa) {
          setSiswaInfo(data.siswa);
        }
        setAttemptData(data.attempt);

        if (!data.analysis || data.analysis.length === 0) {
          // Trigger generator fallback kalau hasil analisis belum ada di database.
          await fetch('/api/asesmen/generate-analisis-fallback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_asesmen: asesmenId, id_siswa: siswaId }),
          });

          await new Promise((resolve) => setTimeout(resolve, 400));
          data = await fetchAnalisis();
          setAttemptData(data.attempt);
        }

        if (data.analysis && data.analysis.length > 0) {
          setAnalysisData(data.analysis);
          const newSuggestions: string[] = [];
          data.analysis.forEach((item: TPAnalysis) => {
            if (item.saran_siswa) {
              newSuggestions.push(item.saran_siswa);
            }
          });
          setSuggestions(newSuggestions);
        }

        try {
          const jawabanResponse = await fetch(`/api/asesmen/jawaban-siswa?id_siswa=${siswaId}&id_asesmen=${asesmenId}`);
          if (jawabanResponse.ok) {
            const jawabanData: JawabanResponse = await jawabanResponse.json();
            setJawabanList(jawabanData.jawaban || []);
          }
        } catch (error) {
          console.error('Error loading jawaban:', error);
        }
      } catch (error) {
        console.error('Error loading analysis:', error);
      }

      setLoading(false);
    };

    if (router.isReady) {
      loadData();
    }
  }, [router.isReady, asesmenId, siswaId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!adminSession || !attemptData) {
    return null;
  }

  const durationHours = Math.floor(attemptData.durasi_detik / 3600);
  const durationMinutes = Math.floor((attemptData.durasi_detik % 3600) / 60);
  const durationSeconds = attemptData.durasi_detik % 60;
  const durationFormatted = `${String(durationHours).padStart(2, '0')}:${String(durationMinutes).padStart(2, '0')}:${String(durationSeconds).padStart(2, '0')}`;

  const hasUnvalidatedAnswers = jawabanList.some((jawaban) => jawaban.status_validasi !== 'validated');
  const validationStatus = hasUnvalidatedAnswers ? 'Belum Divalidasi' : 'Sudah Divalidasi';
  const isFullyValidated = !hasUnvalidatedAnswers;
  const shouldHoldResult = pendingValidation || hasUnvalidatedAnswers;

  const calculateTotalScore = () => {
    return jawabanList.reduce((total, jawaban) => {
      if (jawaban.status_validasi === 'validated') {
        return total + (jawaban.skor_tervalidasi || 0);
      }
      return total + (jawaban.skor_asli || 0);
    }, 0);
  };

  const totalScoreSiswa = calculateTotalScore();
  const batasLulus = attemptData.skor_maksimum * 0.75;
  const isLulus = totalScoreSiswa >= batasLulus;

  return (
    <div className="analisis-theme-scope min-h-screen bg-black text-white relative overflow-hidden">
      <StarBackground />
      <AdminNavbar adminName={adminSession.nama_admin} />

      <div className="relative z-10 pt-32 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-gray-800/50 px-3 sm:px-4 py-1.5 sm:py-2 text-gray-300 transition-all hover:bg-gray-700/50 hover:text-white"
            >
              <FaArrowLeft />
              Kembali
            </button>

            <p className="text-2xl font-bold flex items-center gap-2">
              <FaGraduationCap className="analysis-student-cap" />
              <span className="text-white">{siswaInfo?.nama_siswa || 'Siswa'}</span>
            </p>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FaChartLine className="text-3xl text-white" />
              Analisis Hasil Asesmen
            </h1>
            {asesmenTitle && <p className="mt-2 text-base text-gray-300">{asesmenTitle}</p>}
          </div>

          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-8">
              <p className="text-gray-400 text-base font-medium mb-2 inline-flex items-center gap-2">
                <FaPoll className="text-white" />
                Nilai Siswa
              </p>
              {shouldHoldResult ? <div className="text-lg font-semibold text-amber-300">Menunggu validasi nilai oleh guru</div> : <div className="text-5xl font-bold text-white">{totalScoreSiswa}</div>}
              <div className="mt-2 h-1 bg-gradient-to-r from-[#0E5BFF] to-transparent rounded-full" />

              <div
                className={`mt-6 px-4 py-3 rounded-xl flex items-center gap-2 font-medium transition-all ${
                  isFullyValidated ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 text-emerald-300' : 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-300'
                }`}
              >
                {isFullyValidated ? (
                  <>
                    <FaCheckCircle className="text-lg flex-shrink-0" />
                    <span>{validationStatus}</span>
                  </>
                ) : (
                  <>
                    <FaHourglassEnd className="text-lg flex-shrink-0 animate-pulse" />
                    <span>{validationStatus}</span>
                  </>
                )}
              </div>

              <div className={`kelulusan-badge mt-3 px-4 py-3 rounded-xl flex items-center gap-2 font-semibold transition-all ${shouldHoldResult ? 'kelulusan-badge--pending' : isLulus ? 'kelulusan-badge--pass' : 'kelulusan-badge--fail'}`}>
                {shouldHoldResult ? (
                  <>
                    <FaHourglassEnd className="text-lg flex-shrink-0 animate-pulse" />
                    <span>Status Kelulusan: Menunggu validasi nilai</span>
                  </>
                ) : isLulus ? (
                  <>
                    <FaCheckCircle className="text-lg flex-shrink-0" />
                    <span>Status Kelulusan: Lulus</span>
                  </>
                ) : (
                  <>
                    <FaExclamationCircle className="text-lg flex-shrink-0" />
                    <span>Status Kelulusan: Tidak Lulus</span>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-8">
              <p className="text-gray-400 text-base font-medium mb-2 inline-flex items-center gap-2">
                <FaClock className="text-white" />
                Waktu Pengerjaan
              </p>
              <div className="text-5xl font-bold text-white">{durationFormatted}</div>
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
                    key={item.id_analisis_siswa}
                    className="flex justify-center"
                  >
                    <CircularProgress
                      percentage={Math.round(item.persentase_tp_siswa)}
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

          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <FaPoll className="text-white" />
              Jawaban & Validasi
            </h2>
            <div className="border border-white/10 bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 md:p-8 overflow-x-auto">
              <JawabanSiswaTable
                jawabanList={jawabanList}
                isGuru={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
