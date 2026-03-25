import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { FaArrowLeft, FaChartLine, FaLightbulb, FaPoll, FaTrophy, FaUser } from 'react-icons/fa';
import GuruNavbar from '@/components/GuruNavbar';
import StarBackground from '@/components/StarBackground';

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

function CircularProgress({ percentage, label }: { percentage: number; label: string }) {
  const safePercentage = Math.max(0, Math.min(100, percentage));
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
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

export default function AnalisisAsesmenGuruPage() {
  const router = useRouter();
  const { id } = router.query;
  const asesmenId = typeof id === 'string' ? Number(id) : null;

  const [loading, setLoading] = useState(true);
  const [guruSession, setGuruSession] = useState<GuruSession | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryGuru | null>(null);
  const [analysisData, setAnalysisData] = useState<TPAnalysisGuru[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
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

        const response = await fetch(`/api/asesmen/analisis-guru?id_asesmen=${asesmenId}`);
        const data: AnalisisGuruResponse = await response.json();

        if (!response.ok) {
          throw new Error('Gagal mengambil data analisis guru');
        }

        setSummaryData(data.summary);
        setAnalysisData(data.analysis || []);

        if (data.analysis && data.analysis.length > 0) {
          const newSuggestions: string[] = [];
          data.analysis.forEach((item) => {
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
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
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
