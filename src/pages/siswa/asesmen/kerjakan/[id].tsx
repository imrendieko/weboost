import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import StarBackground from '@/components/StarBackground';
import SiswaNavbar from '@/components/SiswaNavbar';
import { FaArrowLeft, FaArrowRight, FaCheckCircle, FaClock, FaCode, FaFlagCheckered, FaListOl, FaPaperPlane, FaPlay, FaStopwatch } from 'react-icons/fa';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';

interface SiswaSession {
  id_siswa: number;
  nama_siswa: string;
}

interface Pilihan {
  id_pilgan: number;
  opsi_pilgan: string;
  teks_pilgan: string;
  gambar_pilgan: string;
}

interface Soal {
  id_soal: number;
  teks_soal: string;
  teks_jawaban?: string;
  gambar_soal?: string;
  nilai_soal: number;
  urutan_soal: number;
  tipe_soal: 'pilihan_ganda' | 'uraian' | 'baris_kode';
  pilihan_ganda?: Pilihan[];
}

interface AttemptResult {
  id_attempt: number;
  skor_total: number;
  skor_maksimum: number;
  submitted_at: string;
  durasi_detik: number;
}

interface QuizResponse {
  asesmen: {
    id_asesmen: number;
    judul_asesmen: string;
    waktu_mulai: string;
    waktu_terakhir: string;
    durasi_asesmen?: number | null;
    durasi_kuis?: number | null;
  } | null;
  soal: Soal[];
  attempt: AttemptResult | null;
  notFound?: boolean;
  message?: string;
}

const OPTION_THEME = [
  {
    base: 'bg-rose-500/20 border-rose-300/40 hover:bg-rose-500/35',
    active: 'bg-rose-500 border-rose-200 text-white shadow-[0_14px_30px_rgba(244,63,94,0.38)]',
    badge: '▲',
  },
  {
    base: 'bg-sky-500/20 border-sky-300/40 hover:bg-sky-500/35',
    active: 'bg-sky-500 border-sky-200 text-white shadow-[0_14px_30px_rgba(14,165,233,0.38)]',
    badge: '◆',
  },
  {
    base: 'bg-amber-400/20 border-amber-200/40 hover:bg-amber-400/35',
    active: 'bg-amber-400 border-amber-100 text-black shadow-[0_14px_30px_rgba(250,204,21,0.38)]',
    badge: '●',
  },
  {
    base: 'bg-emerald-500/20 border-emerald-300/40 hover:bg-emerald-500/35',
    active: 'bg-emerald-500 border-emerald-200 text-white shadow-[0_14px_30px_rgba(16,185,129,0.38)]',
    badge: '■',
  },
  {
    base: 'bg-violet-500/20 border-violet-300/40 hover:bg-violet-500/35',
    active: 'bg-violet-500 border-violet-200 text-white shadow-[0_14px_30px_rgba(139,92,246,0.38)]',
    badge: '⬟',
  },
];

function getCurrentDate() {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const now = new Date();
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hh = String(Math.floor(safe / 3600)).padStart(2, '0');
  const mm = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export default function SiswaKerjakanAsesmen() {
  const router = useRouter();
  const { id } = router.query;
  const asesmenId = typeof id === 'string' ? Number(id) : null;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [siswaSession, setSiswaSession] = useState<SiswaSession | null>(null);
  const [quizData, setQuizData] = useState<QuizResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [startCountdown, setStartCountdown] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'info' | 'error' | 'success' | 'warning'; onConfirm?: () => void }>({
    show: false,
    message: '',
    type: 'info',
  });
  const [showTimeoutNotification, setShowTimeoutNotification] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const rawSession = localStorage.getItem('siswa_session');
      if (!rawSession) {
        router.push('/login');
        return;
      }

      const session = JSON.parse(rawSession) as SiswaSession;
      setSiswaSession(session);

      if (!asesmenId || Number.isNaN(asesmenId)) {
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/siswa/asesmen/quiz?id_asesmen=${asesmenId}&id_siswa=${session.id_siswa}`);
      const data = await response.json();
      if (!response.ok) {
        setLoadError(data?.error || 'Gagal memuat data asesmen');
      } else if (data?.notFound) {
        setLoadError(data?.message || 'Asesmen tidak ditemukan');
      } else {
        setQuizData(data);
      }

      setLoading(false);
    };

    if (router.isReady) {
      loadData();
    }
  }, [router, asesmenId]);

  useEffect(() => {
    if (!quizData || showIntro || quizData.attempt || !quizData.asesmen) {
      return;
    }

    const durationMinutes = quizData.asesmen.durasi_asesmen || quizData.asesmen.durasi_kuis || 0;
    if (durationMinutes <= 0) {
      return;
    }

    if (secondsLeft === null) {
      setSecondsLeft(durationMinutes * 60);
      return;
    }

    if (secondsLeft <= 0) {
      handleSubmit(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((prev) => (prev === null ? null : prev - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [quizData, showIntro, secondsLeft]);

  useEffect(() => {
    if (startCountdown === null) {
      return;
    }

    if (startCountdown > 0) {
      const timer = window.setTimeout(() => {
        setStartCountdown((prev) => (prev === null ? null : prev - 1));
      }, 1000);
      return () => window.clearTimeout(timer);
    }

    const startTimer = window.setTimeout(() => {
      setShowIntro(false);
      setStartTime(new Date());
      const durationMinutes = quizData?.asesmen?.durasi_asesmen || quizData?.asesmen?.durasi_kuis || 0;
      if (durationMinutes > 0) {
        setSecondsLeft(durationMinutes * 60);
      }
      setStartCountdown(null);
    }, 1400);

    return () => window.clearTimeout(startTimer);
  }, [startCountdown, quizData]);

  useEffect(() => {
    if (!quizData?.soal || quizData.soal.length === 0) {
      return;
    }

    setAnswers((current) => {
      const next = { ...current };
      let changed = false;

      quizData.soal.forEach((item) => {
        // Initialize baris_kode type questions with teks_jawaban if it exists
        if (item.tipe_soal === 'baris_kode') {
          const currentAnswer = next[item.id_soal];
          const hasTeksJawaban = (item.teks_jawaban || '').trim().length > 0;
          
          // If no current answer and has teks_jawaban, initialize with it
          if (!currentAnswer && hasTeksJawaban) {
            next[item.id_soal] = item.teks_jawaban || '';
            changed = true;
            console.log(`✅ Initialized soal ${item.id_soal} with teks_jawaban`);
          }
        }
      });

      return changed ? next : current;
    });
  }, [quizData]);

  // Save answers to localStorage whenever they change
  useEffect(() => {
    if (asesmenId) {
      const key = `quiz_answers_${asesmenId}`;
      localStorage.setItem(key, JSON.stringify(answers));
    }
  }, [answers, asesmenId]);

  // Restore answers from localStorage when component mounts
  useEffect(() => {
    if (asesmenId && quizData && quizData.soal.length > 0) {
      const key = `quiz_answers_${asesmenId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const restored = JSON.parse(saved);
          setAnswers((current) => {
            // Merge: Keep teks_jawaban initialization, override only if localStorage has non-empty values
            const merged = { ...current };
            Object.entries(restored).forEach(([idSoalStr, answer]) => {
              if (answer && typeof answer === 'string' && answer.trim().length > 0) {
                merged[Number(idSoalStr)] = answer;
              }
            });
            console.log('✅ Answers restored from localStorage:', merged);
            return merged;
          });
        } catch (e) {
          console.error('Error restoring answers:', e);
        }
      }
    }
  }, [asesmenId, quizData?.soal?.length]);

  const soal = useMemo(() => quizData?.soal || [], [quizData]);
  const currentSoal = soal[currentIndex] || null;

  const answeredCount = useMemo(() => {
    return soal.filter((item) => (answers[item.id_soal] || '').trim().length > 0).length;
  }, [soal, answers]);

  const unansweredCount = useMemo(() => {
    return Math.max(0, soal.length - answeredCount);
  }, [soal.length, answeredCount]);

  const canManualSubmit = useMemo(() => {
    return soal.length > 0 && unansweredCount === 0 && !submitting;
  }, [soal.length, unansweredCount, submitting]);

  const progressPercent = useMemo(() => {
    if (soal.length === 0) {
      return 0;
    }
    return Math.round(((currentIndex + 1) / soal.length) * 100);
  }, [currentIndex, soal.length]);

  const startQuiz = () => {
    if (startCountdown !== null) {
      return;
    }
    setStartCountdown(3);
  };

  const handleAnswer = (idSoal: number, value: string) => {
    setAnswers((current) => ({
      ...current,
      [idSoal]: value,
    }));
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!siswaSession || !quizData || !startTime || submitting) {
      return;
    }

    if (!autoSubmit && unansweredCount > 0) {
      setNotification({
        show: true,
        message: `Masih ada ${unansweredCount} soal yang belum dijawab. Jawab semua soal dulu sebelum mengumpulkan.`,
        type: 'warning',
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/siswa/asesmen/quiz/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_siswa: siswaSession.id_siswa,
          id_asesmen: quizData?.asesmen?.id_asesmen,
          started_at: startTime.toISOString(),
          answers,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengumpulkan asesmen');
      }

      if (autoSubmit) {
        setShowTimeoutNotification(true);
        setNotification({
          show: true,
          message: 'Waktu habis. Jawaban Anda telah dikumpulkan otomatis.',
          type: 'success',
        });
        // Clear localStorage after submit
        if (asesmenId) {
          localStorage.removeItem(`quiz_answers_${asesmenId}`);
        }
        // Delay update attempt saat auto submit agar notifikasi bisa terlihat dulu
        setTimeout(() => {
          setQuizData((current) =>
            current
              ? {
                  ...current,
                  attempt: data.attempt,
                }
              : current,
          );
        }, 2000);
      } else {
        // Clear localStorage after submit
        if (asesmenId) {
          localStorage.removeItem(`quiz_answers_${asesmenId}`);
        }
        setQuizData((current) =>
          current
            ? {
                ...current,
                attempt: data.attempt,
              }
            : current,
        );
      }
    } catch (error) {
      console.error(error);
      setNotification({
        show: true,
        message: error instanceof Error ? error.message : 'Terjadi kesalahan saat submit asesmen',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!siswaSession) {
    return null;
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        <StarBackground />
        <SiswaNavbar siswaName={siswaSession.nama_siswa} />
        <div className="relative z-10 pt-24 pb-12 px-6">
          <div className="max-w-3xl mx-auto rounded-2xl border border-red-400/40 bg-red-500/15 p-8 text-center">
            <h1 className="text-2xl font-bold mb-2">Asesmen Tidak Tersedia</h1>
            <p className="text-gray-200 mb-6">{loadError}</p>
            <button
              type="button"
              onClick={() => router.back()}
              className="mb-6 flex items-center gap-2 rounded-lg border border-white/10 bg-gray-800/50 px-3 sm:px-4 py-1.5 sm:py-2 text-gray-300 transition-all hover:bg-gray-700/50 hover:text-white"
            >
              <FaArrowLeft />
              Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!quizData || !quizData.asesmen) {
    return null;
  }

  if (quizData.attempt) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        <StarBackground />
        <SiswaNavbar siswaName={siswaSession.nama_siswa} />

        <div className="relative z-10 pt-24 pb-12 px-6">
          <div className="max-w-3xl mx-auto">
            <button
              type="button"
              onClick={() => router.back()}
              className="mb-6 flex items-center gap-2 rounded-lg border border-white/10 bg-gray-800/50 px-3 sm:px-4 py-1.5 sm:py-2 text-gray-300 transition-all hover:bg-gray-700/50 hover:text-white"
            >
              <FaArrowLeft />
              Kembali
            </button>

            {showTimeoutNotification && (
              <div className="mb-6 rounded-2xl border border-green-400/40 bg-green-500/15 p-6">
                <div className="flex items-start gap-4">
                  <div className="text-3xl text-green-300">✓</div>
                  <div>
                    <p className="text-base font-semibold text-green-100 mb-2">Waktu Pengerjaan Habis</p>
                    <p className="text-sm text-green-50">Jawaban Anda telah dikumpulkan otomatis. Terima kasih telah fokus dalam mengerjakan asesmen ini.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-green-400/40 bg-green-500/15 p-8 text-center">
              <FaCheckCircle className="mx-auto text-5xl text-green-300 mb-4" />
              <h1 className="text-3xl font-bold mb-2">Asesmen Sudah Dikerjakan</h1>
              <p className="text-gray-200 mb-6">{quizData.asesmen.judul_asesmen}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-sm text-gray-400">Skor Anda</p>
                  <p className="text-2xl font-bold text-white">
                    {quizData.attempt.skor_total} / {quizData.attempt.skor_maksimum}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-sm text-gray-400">Durasi Pengerjaan</p>
                  <p className="text-2xl font-bold text-white">{formatDuration(quizData.attempt.durasi_detik)}</p>
                </div>
              </div>

              <p className="mt-6 text-sm text-gray-300">
                Dikumpulkan pada{' '}
                {new Date(quizData.attempt.submitted_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <StarBackground />
      <SiswaNavbar siswaName={siswaSession.nama_siswa} />

      {startCountdown !== null && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-gradient-to-b from-blue-500/20 to-indigo-500/15 p-8 text-center shadow-[0_20px_80px_rgba(14,91,255,0.25)]">
            <p className="text-sm uppercase tracking-[0.2em] text-blue-200 mb-4">Bersiap...</p>
            <div className="mx-auto mb-4 flex h-40 w-40 items-center justify-center rounded-full border-4 border-white/30 bg-white/10 animate-pulse">
              {startCountdown > 0 ? <span className="text-7xl font-black">{startCountdown}</span> : <span className="text-2xl font-black leading-tight">Selamat mengerjakan</span>}
            </div>
            <p className="text-gray-200 text-sm">Fokus, tenang, dan kerjakan yang terbaik.</p>
          </div>
        </div>
      )}

      <div className="relative z-10 pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">{quizData.asesmen.judul_asesmen}</h1>
              <p className="text-gray-400">{getCurrentDate()}</p>
            </div>
          </div>

          {!showIntro && (
            <div className="mb-5 rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>
                  Progress soal: {currentIndex + 1}/{soal.length}
                </span>
                <span>
                  Terjawab: {answeredCount}/{soal.length}
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full bg-[#0E5BFF] transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="mt-4 grid grid-cols-7 gap-2 md:grid-cols-10 xl:grid-cols-12">
                {soal.map((item, index) => {
                  const isActive = index === currentIndex;
                  const isAnswered = (answers[item.id_soal] || '').trim().length > 0;
                  return (
                    <button
                      key={item.id_soal}
                      type="button"
                      onClick={() => setCurrentIndex(index)}
                      className={`h-9 rounded-lg text-xs font-bold transition ${isActive ? 'bg-white text-black' : isAnswered ? 'bg-emerald-500/80 text-white' : 'bg-white/10 text-gray-200 hover:bg-white/20'}`}
                      title={`Soal ${index + 1}`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {showIntro ? (
            <div className="rounded-2xl border border-blue-400/40 bg-blue-500/15 p-8">
              <h2 className="text-2xl font-bold mb-3">Siap Mulai Asesmen?</h2>
              <p className="text-gray-200 mb-4">Jawab semua soal seperti game quiz interaktif. Fokus dan santai!</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 inline-flex items-center gap-3">
                  <FaListOl className="text-blue-300" />
                  <div>
                    <p className="text-xs text-gray-400">Total Soal</p>
                    <p className="font-bold">{soal.length}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 inline-flex items-center gap-3">
                  <FaStopwatch className="text-blue-300" />
                  <div>
                    <p className="text-xs text-gray-400">Durasi</p>
                    <p className="font-bold">{quizData.asesmen.durasi_asesmen || quizData.asesmen.durasi_kuis || 0} menit</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={startQuiz}
                disabled={startCountdown !== null}
                className="inline-flex items-center gap-3 rounded-xl bg-[#0E5BFF] px-6 py-3 font-semibold text-white transition hover:bg-[#0B49CB]"
              >
                <FaPlay />
                {startCountdown !== null ? 'Memulai...' : 'Mulai Sekarang'}
              </button>
            </div>
          ) : currentSoal ? (
            <>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-6 mb-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                  {secondsLeft !== null && (
                    <div className="inline-flex items-center gap-2 rounded-lg border border-yellow-400/40 bg-yellow-500/20 px-3 py-2 text-yellow-100 animate-pulse">
                      <FaClock />
                      Sisa Waktu: {formatDuration(secondsLeft)}
                    </div>
                  )}
                </div>

                <div className="mb-4 rounded-xl border border-blue-400/30 bg-gradient-to-b from-[#071427] to-[#030b1a] p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-blue-200 mb-2">Soal</p>
                  <p className="text-2xl font-semibold text-white leading-relaxed whitespace-pre-wrap">{currentSoal.teks_soal}</p>
                </div>

                {currentSoal.gambar_soal && (
                  <div className="mb-4 rounded-xl overflow-hidden border border-white/10 bg-black/50 p-2">
                    <img
                      src={currentSoal.gambar_soal}
                      alt="Gambar soal"
                      className="w-full h-auto max-h-[70vh] object-contain mx-auto"
                    />
                  </div>
                )}

                {currentSoal.tipe_soal === 'pilihan_ganda' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(currentSoal.pilihan_ganda || []).map((option, index) => {
                      const selected = answers[currentSoal.id_soal] === option.opsi_pilgan;
                      const theme = OPTION_THEME[index] || OPTION_THEME[OPTION_THEME.length - 1];

                      return (
                        <button
                          key={option.id_pilgan}
                          type="button"
                          onClick={() => handleAnswer(currentSoal.id_soal, option.opsi_pilgan)}
                          className={`rounded-xl border p-4 text-left transition-all duration-200 ${selected ? theme.active : theme.base}`}
                        >
                          <div className="mb-2 inline-flex items-center gap-2">
                            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-lg font-black ${selected ? 'bg-white/25 text-white' : 'bg-black/20 text-white'}`}>{theme.badge}</span>
                            <span className="font-bold text-sm">{option.opsi_pilgan}</span>
                          </div>
                          <p className="font-semibold mb-1">{option.teks_pilgan || 'Pilihan gambar'}</p>
                          {option.gambar_pilgan && (
                            <img
                              src={option.gambar_pilgan}
                              alt={`Pilihan ${option.opsi_pilgan}`}
                              className="mt-2 rounded-lg max-h-32 w-full object-contain bg-black/30"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div>
                    {currentSoal.tipe_soal === 'baris_kode' && (
                      <p className="text-sm text-blue-200 mb-2 inline-flex items-center gap-2">
                        <FaCode />
                        Edit kode program berikut untuk menjawab (case-sensitive)
                      </p>
                    )}
                    {currentSoal.tipe_soal === 'baris_kode' ? (
                      <div className="rounded-xl border border-blue-500/40 overflow-hidden bg-[#0b1020]">
                        <div className="flex items-center gap-2 border-b border-white/10 bg-black/30 px-3 py-2 text-xs text-gray-300">
                          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                          <span className="h-2.5 w-2.5 rounded-full bg-yellow-300" />
                          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                          <span className="ml-2 uppercase tracking-[0.18em] text-blue-200">Code Editor</span>
                        </div>
                        <CodeMirror
                          value={answers[currentSoal.id_soal] || ''}
                          extensions={[javascript()]}
                          onChange={(value) => handleAnswer(currentSoal.id_soal, value)}
                          theme="dark"
                          height="360px"
                        />
                      </div>
                    ) : (
                      <textarea
                        value={answers[currentSoal.id_soal] || ''}
                        onChange={(event) => handleAnswer(currentSoal.id_soal, event.target.value)}
                        rows={5}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#0080FF]"
                        placeholder="Tulis jawaban Anda..."
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 disabled:opacity-50"
                  >
                    <FaArrowLeft />
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.min(soal.length - 1, prev + 1))}
                    disabled={currentIndex >= soal.length - 1}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 disabled:opacity-50"
                  >
                    Berikutnya
                    <FaArrowRight />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={!canManualSubmit}
                  className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {unansweredCount > 0 ? <FaPaperPlane /> : <FaFlagCheckered />}
                  {submitting ? 'Mengumpulkan...' : unansweredCount > 0 ? `Jawab Semua Soal (${unansweredCount})` : 'Kumpulkan Jawaban'}
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">Soal tidak tersedia.</div>
          )}
        </div>
      </div>

      {/* Notification Modal */}
      {notification.show && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center px-6">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300 ${
              notification.type === 'success'
                ? 'border-green-400/40 bg-gradient-to-b from-green-500/20 to-green-500/10'
                : notification.type === 'error'
                  ? 'border-red-400/40 bg-gradient-to-b from-red-500/20 to-red-500/10'
                  : notification.type === 'warning'
                    ? 'border-yellow-400/40 bg-gradient-to-b from-yellow-500/20 to-yellow-500/10'
                    : 'border-blue-400/40 bg-gradient-to-b from-blue-500/20 to-blue-500/10'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 text-3xl ${notification.type === 'success' ? 'text-green-300' : notification.type === 'error' ? 'text-red-300' : notification.type === 'warning' ? 'text-yellow-300' : 'text-blue-300'}`}>
                {notification.type === 'success' ? '✓' : notification.type === 'error' ? '✕' : notification.type === 'warning' ? '⚠' : 'ℹ'}
              </div>
              <div className="flex-1">
                <p className={`text-base font-semibold mb-4 ${notification.type === 'success' ? 'text-green-100' : notification.type === 'error' ? 'text-red-100' : notification.type === 'warning' ? 'text-yellow-100' : 'text-blue-100'}`}>
                  {notification.message}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNotification({ ...notification, show: false });
                    notification.onConfirm?.();
                  }}
                  className={`w-full rounded-lg px-4 py-2.5 font-semibold transition ${
                    notification.type === 'success'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : notification.type === 'error'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : notification.type === 'warning'
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
