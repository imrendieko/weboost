import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import GuruNavbar from '@/components/GuruNavbar';
import StarBackground from '@/components/StarBackground';
import { FaArrowLeft, FaChartLine, FaClock, FaLightbulb, FaPoll, FaTrophy, FaUser } from 'react-icons/fa';

interface GuruSession {
  id_guru: number;
  nama_guru: string;
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
}

function CircularProgress({ percentage, label }: { percentage: number; label: string }) {
  const safePercentage = Math.max(0, Math.min(100, percentage));
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270deg gauge
  const progressLength = (safePercentage / 100) * arcLength;

  return (
    <div className="relative w-[220px] h-[220px] rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          width="190"
          height="190"
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
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-2xl font-bold text-white leading-none mt-7">{Math.round(safePercentage)}%</p>
        <p className="mt-3 text-[13px] leading-5 text-gray-200 line-clamp-2">{label}</p>
      </div>
    </div>
  );
}

export default function AnalisisSiswaAsesmenGuru() {
  const router = useRouter();
  const { id } = router.query;
  const asesmenId = typeof id === 'string' ? Number(id) : null;
  const siswaId = typeof router.query.siswa_id === 'string' ? Number(router.query.siswa_id) : null;

  const [loading, setLoading] = useState(true);
  const [guruSession, setGuruSession] = useState<GuruSession | null>(null);
  const [siswaInfo, setSiswaInfo] = useState<SiswaInfo | null>(null);
  const [attemptData, setAttemptData] = useState<AttemptData | null>(null);
  const [analysisData, setAnalysisData] = useState<TPAnalysis[]>([]);
  const [overallPercentage, setOverallPercentage] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const rawGuruSession = localStorage.getItem('guru_session');
      if (!rawGuruSession) {
        router.push('/login');
        return;
      }

      const guruSession = JSON.parse(rawGuruSession) as GuruSession;
      setGuruSession(guruSession);

      if (!asesmenId || !siswaId || Number.isNaN(asesmenId) || Number.isNaN(siswaId)) {
        setLoading(false);
        return;
      }

      try {
        const fetchAnalisis = async () => {
          const response = await fetch(`/api/asesmen/analisis?id_asesmen=${asesmenId}&id_siswa=${siswaId}`);
          const data: AnalisisResponse = await response.json();
          if (!response.ok) {
            throw new Error('Gagal mengambil data analisis');
          }
          return data;
        };

        let data = await fetchAnalisis();

        if (data.siswa) {
          setSiswaInfo(data.siswa);
        }
        setAttemptData(data.attempt);

        if (!data.analysis || data.analysis.length === 0) {
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
          const average = data.analysis.reduce((sum: number, item: TPAnalysis) => sum + item.persentase_tp_siswa, 0) / data.analysis.length;
          setOverallPercentage(Math.round(average));

          const newSuggestions: string[] = [];
          data.analysis.forEach((item: TPAnalysis) => {
            if (item.saran_siswa) {
              newSuggestions.push(item.saran_siswa);
            }
          });
          setSuggestions(newSuggestions);
        }
      } catch (error) {
        console.error('Error loading analysis:', error);
      }

      setLoading(false);
    };

    if (router.isReady) {
      loadData();
    }
  }, [router, asesmenId, siswaId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!guruSession || !attemptData) {
    return null;
  }

  const durationHours = Math.floor(attemptData.durasi_detik / 3600);
  const durationMinutes = Math.floor((attemptData.durasi_detik % 3600) / 60);
  const durationSeconds = attemptData.durasi_detik % 60;
  const durationFormatted = `${String(durationHours).padStart(2, '0')}:${String(durationMinutes).padStart(2, '0')}:${String(durationSeconds).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <StarBackground />
      {guruSession && <GuruNavbar guruName={guruSession.nama_guru} />}

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

          {/* Header with Student Info */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
              <FaChartLine className="text-3xl text-white" />
              Analisis Hasil Asesmen
            </h2>
            {siswaInfo && (
              <p className="text-gray-400 flex items-center gap-2">
                <FaUser className="text-blue-400" />
                <span className="font-semibold text-white">{siswaInfo.nama_siswa}</span>
              </p>
            )}
          </div>

          {/* Score and Duration Cards */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-8">
              <p className="text-gray-400 text-base font-medium mb-2 inline-flex items-center gap-2">
                <FaPoll className="text-white" />
                Nilai Siswa
              </p>
              <div className="text-5xl font-bold text-white">
                {attemptData.skor_total}/{attemptData.skor_maksimum}
              </div>
              <div className="mt-2 h-1 bg-gradient-to-r from-[#0E5BFF] to-transparent rounded-full" />
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

          {/* TP Analysis Charts */}
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

          {/* Saran Pembelajaran */}
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <FaLightbulb className="text-white" />
            Saran Pembelajaran
          </h2>
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 md:p-8">
            <div className="space-y-3">
              {suggestions.length > 0 ? (
                suggestions.map((suggestion, index) => (
                  <p
                    key={index}
                    className="text-base text-gray-300 leading-relaxed"
                  >
                    {suggestion}
                  </p>
                ))
              ) : (
                <p className="text-base text-gray-400">Belum ada saran pembelajaran.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
