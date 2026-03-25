import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import SiswaNavbar from '@/components/SiswaNavbar';
import supabase from '@/lib/db';
import { LampiranType, parseLampiran, serializeLampiran } from '@/lib/pbl';
import { FaArrowLeft, FaCheck, FaClock, FaCommentAlt, FaExclamationCircle, FaFileAlt, FaLink, FaPaperPlane, FaProjectDiagram, FaSave, FaTrash, FaUser, FaVideo } from 'react-icons/fa';

interface SiswaSession {
  id_siswa: number;
  nama_siswa: string;
  email_siswa: string;
  kelas_siswa: number;
}

interface ElemenOption {
  id_elemen: number;
  nama_elemen: string;
  sampul_elemen?: string;
  guru?: {
    nama_guru: string;
  } | null;
  kelas?: {
    nama_kelas: string;
  } | null;
}

interface ApiKomentar {
  id_komentar: number;
  isi_komentar: string;
  parent_id: number | null;
  created_at: string;
  id_siswa: number | null;
  siswa?: {
    nama_siswa: string;
  } | null;
  guru?: {
    nama_guru: string;
  } | null;
}

interface ApiSintak {
  order: number;
  title: string;
  id_sintak: number | null;
  descriptionHtml: string;
  allowedSubmissionTypes: LampiranType[];
  waktu_mulai: string | null;
  waktu_selesai: string | null;
  lampiran: Array<{
    id_lampiran: number;
    file_lampiran: string;
    parsed: {
      type: LampiranType;
      label: string;
      url: string;
    } | null;
  }>;
  komentar: ApiKomentar[];
  myKelompok: {
    id_kelompok: number;
    nama_kelompok: string;
    anggota?: Array<{
      id_siswa: number;
      siswa?: {
        nama_siswa: string;
      } | null;
    }>;
  } | null;
  mySubmission: {
    id_pengumpulan: number;
    file_pengumpulan: string;
    waktu_pengumpulan: string | null;
    nilai_pbl?: number | null;
    komentar_pbl?: string | null;
    siswa?: {
      nama_siswa: string;
    } | null;
  } | null;
  draftType: LampiranType;
  draftUrl: string;
  draftFile: File | null;
  commentInput: string;
  replyingTo: ApiKomentar | null;
}

type NotificationType = 'success' | 'error';

interface NotificationState {
  show: boolean;
  type: NotificationType;
  message: string;
}

const PBL_SINTAK_TITLES = [
  'Sintak 1: Orientasi pada Masalah',
  'Sintak 2: Mengatur Peserta Didik untuk Belajar',
  'Sintak 3: Membimbing Pengalaman Individu Maupun Kelompok',
  'Sintak 4: Mengembangkan dan Menyajikan Hasil Karya',
  'Sintak 5: Menganalisis dan Mengevaluasi Proses Pemecahan Masalah',
] as const;

function getCurrentDate() {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const now = new Date();
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function formatDateTimeForDisplay(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDurationIndonesian(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days} hari`);
  }
  if (hours > 0) {
    parts.push(`${hours} jam`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} menit`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} detik`);
  }

  return parts.slice(0, 2).join(' ');
}

function getSubmissionTimingStatus(submissionTime: string | null | undefined, deadlineTime: string | null | undefined) {
  if (!submissionTime || !deadlineTime) {
    return null;
  }

  const submittedAt = new Date(submissionTime);
  const deadlineAt = new Date(deadlineTime);
  if (Number.isNaN(submittedAt.getTime()) || Number.isNaN(deadlineAt.getTime())) {
    return null;
  }

  const diffSeconds = Math.floor((submittedAt.getTime() - deadlineAt.getTime()) / 1000);
  if (diffSeconds > 0) {
    return {
      text: `Terlambat ${formatDurationIndonesian(diffSeconds)}`,
      className: 'text-red-300',
    };
  }

  if (diffSeconds < 0) {
    return {
      text: `Mengumpulkan lebih awal ${formatDurationIndonesian(Math.abs(diffSeconds))}`,
      className: 'text-emerald-300',
    };
  }

  return {
    text: 'Mengumpulkan tepat waktu',
    className: 'text-blue-300',
  };
}

function detectFileTypeFromUrl(url: string): LampiranType {
  const loweredUrl = url.toLowerCase();
  if (loweredUrl.includes('youtube.com') || loweredUrl.includes('youtu.be') || loweredUrl.match(/\.(mp4|mov|avi|webm)$/)) {
    return 'video';
  }

  if (loweredUrl.includes('http')) {
    return 'dokumen';
  }

  return 'tautan';
}

function parseSubmissionFile(rawValue: string) {
  const parsed = parseLampiran(rawValue);
  if (parsed) {
    return parsed;
  }

  return {
    type: detectFileTypeFromUrl(rawValue),
    label: 'File Pengumpulan',
    url: rawValue,
  };
}

export default function PBLSiswa() {
  const router = useRouter();
  const elemenQuery = router.query.elemen;
  const sintakQuery = router.query.sintak;
  const elemenId = typeof elemenQuery === 'string' ? Number(elemenQuery) : null;
  const sintakOrder = typeof sintakQuery === 'string' ? Number(sintakQuery) : null;
  const preferredSintakOrder = sintakOrder && sintakOrder >= 1 && sintakOrder <= 5 ? sintakOrder : null;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [siswaSession, setSiswaSession] = useState<SiswaSession | null>(null);
  const [elemenOptions, setElemenOptions] = useState<ElemenOption[]>([]);
  const [elemenName, setElemenName] = useState('');
  const [activeSintak, setActiveSintak] = useState(1);
  const [sintakState, setSintakState] = useState<ApiSintak[]>([]);
  const [notification, setNotification] = useState<NotificationState>({ show: false, type: 'success', message: '' });
  const notificationTimerRef = useRef<number | null>(null);

  const showNotification = (message: string, type: NotificationType) => {
    setNotification({ show: true, type, message });

    if (notificationTimerRef.current) {
      window.clearTimeout(notificationTimerRef.current);
    }

    notificationTimerRef.current = window.setTimeout(() => {
      setNotification({ show: false, type: 'success', message: '' });
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) {
        window.clearTimeout(notificationTimerRef.current);
      }
    };
  }, []);

  const fetchPblData = async (idSiswa: number, idElemen: number, initialOrder?: number | null) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/siswa/pbl?elemen=${idElemen}&siswa=${idSiswa}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal memuat halaman PBL siswa');
      }

      setElemenName(result.elemen?.nama_elemen || '');
      const mappedSintaks = (result.sintaks || []).map((item: any) => ({
        ...item,
        draftType: item.allowedSubmissionTypes?.[0] || 'dokumen',
        draftUrl: '',
        draftFile: null,
        commentInput: '',
        replyingTo: null,
      }));

      setSintakState(mappedSintaks);

      const availableOrders = new Set(mappedSintaks.map((item: ApiSintak) => item.order));
      if (initialOrder && availableOrders.has(initialOrder)) {
        setActiveSintak(initialOrder);
      } else {
        setActiveSintak(1);
      }
    } catch (error) {
      console.error('Error fetching siswa pbl:', error);
      showNotification(error instanceof Error ? error.message : 'Gagal memuat PBL', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const rawSession = localStorage.getItem('siswa_session');
        if (!rawSession) {
          router.push('/login');
          return;
        }

        const session = JSON.parse(rawSession) as SiswaSession;
        setSiswaSession(session);

        const { data: elemenData } = await supabase
          .from('elemen')
          .select(
            `
            id_elemen,
            nama_elemen,
            sampul_elemen,
            guru:guru_pengampu (
              nama_guru
            ),
            kelas:kelas_elemen (
              nama_kelas
            )
          `,
          )
          .eq('kelas_elemen', session.kelas_siswa)
          .order('nama_elemen', { ascending: true });

        setElemenOptions(
          ((elemenData as Array<any>) || []).map((item) => ({
            id_elemen: item.id_elemen,
            nama_elemen: item.nama_elemen,
            sampul_elemen: item.sampul_elemen,
            guru: Array.isArray(item.guru) ? item.guru[0] || null : item.guru || null,
            kelas: Array.isArray(item.kelas) ? item.kelas[0] || null : item.kelas || null,
          })),
        );

        if (elemenId) {
          await fetchPblData(session.id_siswa, elemenId, preferredSintakOrder);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading pbl siswa:', error);
        router.push('/login');
      }
    };

    if (router.isReady) {
      loadInitialData();
    }
  }, [router.isReady, elemenId, preferredSintakOrder]);

  const openElemenPbl = (idElemen: number, order?: number) => {
    const query = new URLSearchParams({ elemen: String(idElemen) });
    if (order) {
      query.set('sintak', String(order));
    }
    router.push(`/siswa/pbl?${query.toString()}`);
  };

  const updateSintak = (order: number, updater: (current: ApiSintak) => ApiSintak) => {
    setSintakState((current) => current.map((item) => (item.order === order ? updater(item) : item)));
  };

  const activeSintakState = sintakState.find((item) => item.order === activeSintak) || null;
  const isSubmissionTimeConfigured = Boolean(activeSintakState?.waktu_mulai && activeSintakState?.waktu_selesai);
  const submissionTimingStatus = useMemo(() => {
    if (!activeSintakState?.mySubmission) {
      return null;
    }

    return getSubmissionTimingStatus(activeSintakState.mySubmission.waktu_pengumpulan, activeSintakState.waktu_selesai);
  }, [activeSintakState]);
  const parsedSubmissionFile = useMemo(() => {
    if (!activeSintakState?.mySubmission?.file_pengumpulan) {
      return null;
    }

    return parseSubmissionFile(activeSintakState.mySubmission.file_pengumpulan);
  }, [activeSintakState]);

  const groupedKomentar = useMemo(() => {
    if (!activeSintakState) {
      return [] as ApiKomentar[];
    }

    return activeSintakState.komentar.filter((item) => !item.parent_id);
  }, [activeSintakState]);
  const currentSiswaId = siswaSession?.id_siswa ?? 0;

  const renderReplyThread = (parentId: number) => {
    if (!activeSintakState) {
      return null;
    }

    const replies = activeSintakState.komentar.filter((reply) => reply.parent_id === parentId);
    if (replies.length === 0) {
      return null;
    }

    return (
      <div className="mt-4 space-y-3 border-l border-white/10 pl-4 md:pl-6">
        {replies.map((reply) => (
          <div
            key={reply.id_komentar}
            className="rounded-xl border border-white/10 bg-black/30 p-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10">
                  <FaUser className="text-xs text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{reply.siswa?.nama_siswa || reply.guru?.nama_guru || 'Pengguna'}</p>
                  <p className="text-xs text-gray-400">{formatDateTimeForDisplay(reply.created_at)}</p>
                  <p className="mt-1 text-sm leading-6 text-gray-200">{reply.isi_komentar}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateSintak(activeSintakState.order, (current) => ({
                      ...current,
                      replyingTo: reply,
                      commentInput: `@${reply.siswa?.nama_siswa || reply.guru?.nama_guru || 'pengguna'} `,
                    }))
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 transition hover:border-[#0080FF]/50 hover:text-white"
                >
                  <FaCommentAlt />
                  Balas
                </button>
                {reply.id_siswa === currentSiswaId && (
                  <button
                    type="button"
                    onClick={async () => {
                      const response = await fetch(`/api/pbl/comment/${reply.id_komentar}`, { method: 'DELETE' });
                      const result = await response.json();
                      if (!response.ok) {
                        showNotification(result.error || 'Gagal menghapus komentar', 'error');
                        return;
                      }
                      if (elemenId) {
                        await fetchPblData(currentSiswaId, elemenId);
                      }
                      showNotification('Komentar berhasil dihapus.', 'success');
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
                  >
                    <FaTrash />
                    Hapus
                  </button>
                )}
              </div>
            </div>
            {renderReplyThread(reply.id_komentar)}
          </div>
        ))}
      </div>
    );
  };

  const uploadFile = async (file: File) => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: base64,
        fileName: file.name,
        fileType: file.type,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.details || result.error || 'Gagal upload file');
    }

    return result.url as string;
  };

  const handleSubmitPBL = async () => {
    if (!siswaSession || !elemenId || !activeSintakState?.id_sintak) {
      return;
    }

    if (!isSubmissionTimeConfigured) {
      showNotification('Pengumpulan belum dibuka. Guru belum mengatur waktu pengumpulan.', 'error');
      return;
    }

    if (activeSintakState.mySubmission) {
      showNotification('Kelompok/Anda sudah mengumpulkan pada sintak ini.', 'success');
      return;
    }

    if (activeSintakState.draftType === 'dokumen' && !activeSintakState.draftFile) {
      showNotification('Pilih dokumen terlebih dahulu.', 'error');
      return;
    }

    if ((activeSintakState.draftType === 'video' || activeSintakState.draftType === 'tautan') && !activeSintakState.draftUrl.trim()) {
      showNotification('Isi URL terlebih dahulu.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const uploadedUrl = activeSintakState.draftType === 'dokumen' && activeSintakState.draftFile ? await uploadFile(activeSintakState.draftFile) : activeSintakState.draftUrl.trim();

      const payload = serializeLampiran({
        type: activeSintakState.draftType,
        label: activeSintakState.draftType === 'dokumen' ? activeSintakState.draftFile?.name || 'Dokumen Pengumpulan' : uploadedUrl,
        url: uploadedUrl,
      });

      const response = await fetch('/api/siswa/pbl-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_sintak: activeSintakState.id_sintak,
          id_siswa: siswaSession.id_siswa,
          file_pengumpulan: payload,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal mengirim pengumpulan PBL');
      }

      await fetchPblData(siswaSession.id_siswa, elemenId);
      showNotification('Pengumpulan berhasil dikirim.', 'success');
    } catch (error) {
      console.error('Error submitting pbl siswa:', error);
      showNotification(error instanceof Error ? error.message : 'Gagal mengirim pengumpulan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!siswaSession || !elemenId || !activeSintakState?.id_sintak) {
      return;
    }

    if (!activeSintakState.commentInput.trim()) {
      showNotification('Komentar tidak boleh kosong.', 'error');
      return;
    }

    setCommentSubmitting(true);
    try {
      const response = await fetch('/api/pbl/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_sintak: activeSintakState.id_sintak,
          id_siswa: siswaSession.id_siswa,
          isi_komentar: activeSintakState.commentInput,
          parent_id: activeSintakState.replyingTo?.id_komentar || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Gagal menambahkan komentar');
      }

      await fetchPblData(siswaSession.id_siswa, elemenId);
      showNotification('Komentar berhasil ditambahkan.', 'success');
    } catch (error) {
      console.error('Error adding pbl comment siswa:', error);
      showNotification(error instanceof Error ? error.message : 'Gagal menambahkan komentar', 'error');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const openSubmissionPreview = (rawFile: string) => {
    const parsed = parseSubmissionFile(rawFile);
    const query = new URLSearchParams({
      url: parsed.url,
      type: parsed.type,
      name: parsed.label || 'File Pengumpulan',
      back: router.asPath,
    });

    router.push(`/guru/pbl/preview?${query.toString()}`);
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
      {siswaSession && <SiswaNavbar siswaName={siswaSession.nama_siswa} />}

      <div className="relative z-10 px-6 pb-12 pt-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold">
                Selamat Datang, <span className="text-[#FFFFFF]">{siswaSession?.nama_siswa.split(' ')[0]}!</span>
              </h1>
              <p className="text-gray-400">{getCurrentDate()}</p>
            </div>
            <CountdownTimer />
          </div>

          {notification.show && (
            <div className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${notification.type === 'success' ? 'border-green-500/40 bg-green-500/15 text-green-200' : 'border-red-500/40 bg-red-500/15 text-red-200'}`}>
              {notification.type === 'success' ? <FaCheck /> : <FaExclamationCircle />}
              <span>{notification.message}</span>
            </div>
          )}

          {!elemenId ? (
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <FaProjectDiagram className="text-white" />
                Pilih Elemen PBL
              </h2>
              {elemenOptions.length === 0 ? (
                <p className="text-gray-400">Belum ada elemen untuk kelas Anda.</p>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {elemenOptions.map((option) => (
                    <div
                      key={option.id_elemen}
                      className="card-container cursor-pointer"
                    >
                      <div className="card">
                        <div
                          className="card-front bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 rounded-xl overflow-hidden shadow-lg hover:shadow-[0_0_30px_rgba(0,128,255,0.3)] transition-all duration-300"
                          onClick={() => openElemenPbl(option.id_elemen)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              openElemenPbl(option.id_elemen);
                            }
                          }}
                        >
                          <div className="relative h-48 w-full bg-gray-900">
                            <Image
                              src={option.sampul_elemen || '/default-cover.jpg'}
                              alt={option.nama_elemen}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                          </div>
                          <div className="p-4">
                            <h3 className="text-xl font-bold text-white">{option.nama_elemen}</h3>
                            <p className="mt-1 text-sm text-gray-400">{option.kelas?.nama_kelas || 'Kelas belum terhubung'}</p>
                            <p className="mt-1 text-xs text-gray-300">Pengampu: {option.guru?.nama_guru || 'Guru'}</p>
                          </div>
                        </div>

                        <div className="card-back bg-gradient-to-br from-[#0080FF] to-[#0050AA] border border-white/20 rounded-xl p-6 shadow-lg overflow-hidden">
                          <h3 className="text-lg font-bold mb-3 text-white">Pilih Sintak PBL:</h3>
                          <div className="space-y-2 overflow-y-auto max-h-44 pr-1">
                            {PBL_SINTAK_TITLES.map((title, index) => {
                              const order = index + 1;
                              return (
                                <button
                                  key={`${option.id_elemen}-sintak-${order}`}
                                  type="button"
                                  onClick={() => openElemenPbl(option.id_elemen, order)}
                                  className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-left text-sm text-white/95 transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/35"
                                >
                                  {title}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeSintakState ? (
            <>
              <button
                type="button"
                onClick={() => router.back()}
                className="mb-6 flex items-center gap-2 rounded-lg border border-white/10 bg-gray-800/50 px-4 py-2 text-gray-300 transition-all hover:bg-gray-700/50 hover:text-white"
              >
                <FaArrowLeft />
                Kembali
              </button>

              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="flex items-center gap-3 text-3xl font-bold">
                  <FaProjectDiagram className="text-[#FFFFFF]" />
                  PBL {elemenName}
                </h2>
              </div>

              <div className="mb-8 grid grid-cols-1 gap-3 rounded-2xl border border-white/10 p-3 xl:grid-cols-5">
                {sintakState.map((item) => (
                  <button
                    key={item.order}
                    type="button"
                    onClick={() => setActiveSintak(item.order)}
                    className={`rounded-xl px-4 py-4 text-center text-sm font-semibold transition-all ${item.order === activeSintak ? 'bg-[#0E5BFF] text-white shadow-[0_12px_30px_rgba(14,91,255,0.35)]' : 'bg-white text-black hover:bg-white/90'}`}
                  >
                    Sintak {item.order}
                  </button>
                ))}
              </div>

              <h3 className="mb-6 text-2xl font-bold">{activeSintakState.title}</h3>

              <div className="space-y-6">
                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                  <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
                    <FaFileAlt className="text-white" />
                    Lampiran Tugas
                  </h3>
                  <div className="space-y-3">
                    {activeSintakState.lampiran.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-6 text-center text-gray-400">Belum ada lampiran tugas pada sintak ini.</div>
                    ) : (
                      activeSintakState.lampiran.map((attachment) => {
                        const parsed = attachment.parsed || parseLampiran(attachment.file_lampiran);
                        if (!parsed) {
                          return null;
                        }

                        return (
                          <div
                            key={attachment.id_lampiran}
                            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                          >
                            <div>
                              <p className="font-semibold text-white">{parsed.label || 'Lampiran'}</p>
                              <p className="mt-1 text-sm capitalize text-gray-400">{parsed.type}</p>
                            </div>
                            <a
                              href={parsed.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg bg-[#0E5BFF] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0B49CB]"
                            >
                              <FaLink />
                              Lihat Lampiran PBL
                            </a>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                  <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
                    <FaFileAlt className="text-white" />
                    Deskripsi Tugas
                  </h3>
                  <div
                    className="prose prose-invert max-w-none text-sm leading-7"
                    dangerouslySetInnerHTML={{ __html: activeSintakState.descriptionHtml || '<p>Tidak ada deskripsi.</p>' }}
                  />
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                  <h3 className="mb-5 flex items-center gap-2 text-xl font-bold">
                    <FaClock className="text-white" />
                    Waktu Pengerjaan
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <p className="text-sm text-gray-300">Waktu Mulai</p>
                      <p className="mt-2 font-semibold text-white">{formatDateTimeForDisplay(activeSintakState.waktu_mulai)}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <p className="text-sm text-gray-300">Waktu Terakhir</p>
                      <p className="mt-2 font-semibold text-white">{formatDateTimeForDisplay(activeSintakState.waktu_selesai)}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                  <h3 className="mb-5 flex items-center gap-2 text-xl font-bold">
                    <FaFileAlt className="text-white" />
                    Pengumpulan Siswa
                  </h3>

                  {activeSintakState.myKelompok && (
                    <div className="mb-4 rounded-xl border border-[#0080FF]/40 bg-[#0080FF]/15 p-4">
                      <p className="font-semibold text-white">Kelompok Anda: {activeSintakState.myKelompok.nama_kelompok}</p>
                      <p className="text-sm text-gray-200 mt-1">Anggota: {(activeSintakState.myKelompok.anggota || []).map((member) => member.siswa?.nama_siswa || '-').join(', ')}</p>
                    </div>
                  )}

                  {activeSintakState.mySubmission ? (
                    <div className="rounded-2xl border border-white/15 bg-black/25 p-4 md:p-5">
                      <p className="mb-4 text-sm text-emerald-200">Pengumpulan sudah ada. Anda tidak perlu mengumpulkan lagi.</p>

                      <div className="overflow-hidden rounded-xl border border-white/10">
                        <table className="w-full border-collapse text-sm">
                          <tbody>
                            <tr className="border-b border-white/10">
                              <th className="w-1/3 bg-white/10 px-4 py-3 text-left font-semibold text-white">Status Pengumpulan</th>
                              <td className="bg-emerald-500/15 px-4 py-3 text-emerald-200 font-medium">Sudah dikumpulkan</td>
                            </tr>
                            <tr className="border-b border-white/10">
                              <th className="bg-white/10 px-4 py-3 text-left font-semibold text-white">Status Penilaian</th>
                              <td className="px-4 py-3 text-gray-100">
                                {activeSintakState.mySubmission.nilai_pbl !== null && activeSintakState.mySubmission.nilai_pbl !== undefined ? `Sudah dinilai (${activeSintakState.mySubmission.nilai_pbl})` : 'Belum dinilai'}
                              </td>
                            </tr>
                            <tr className="border-b border-white/10">
                              <th className="bg-white/10 px-4 py-3 text-left font-semibold text-white">Keterangan Waktu</th>
                              <td className={`px-4 py-3 ${submissionTimingStatus?.className || 'text-gray-100'}`}>{submissionTimingStatus?.text || '-'}</td>
                            </tr>
                            <tr className="border-b border-white/10">
                              <th className="bg-white/10 px-4 py-3 text-left font-semibold text-white">Terakhir Diubah</th>
                              <td className="px-4 py-3 text-gray-100">{formatDateTimeForDisplay(activeSintakState.mySubmission.waktu_pengumpulan)}</td>
                            </tr>
                            <tr className="border-b border-white/10">
                              <th className="bg-white/10 px-4 py-3 text-left font-semibold text-white">File Pengumpulan</th>
                              <td className="px-4 py-3 text-gray-100">
                                <button
                                  type="button"
                                  onClick={() => openSubmissionPreview(activeSintakState.mySubmission!.file_pengumpulan)}
                                  className="inline-flex items-center gap-2 rounded-lg border border-[#0E5BFF]/40 bg-[#0E5BFF]/20 px-3 py-2 font-medium text-[#AED0FF] transition hover:bg-[#0E5BFF]/30"
                                >
                                  <FaFileAlt />
                                  {parsedSubmissionFile?.label || 'Lihat File Pengumpulan'}
                                </button>
                              </td>
                            </tr>
                            <tr>
                              <th className="bg-white/10 px-4 py-3 text-left font-semibold text-white">Komentar Guru</th>
                              <td className="px-4 py-3 text-gray-100">{activeSintakState.mySubmission.komentar_pbl?.trim() ? activeSintakState.mySubmission.komentar_pbl : 'Tidak ada komentar'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <>
                      {!isSubmissionTimeConfigured && (
                        <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">Pengumpulan belum dibuka karena guru belum mengatur waktu mulai dan waktu terakhir pengumpulan.</div>
                      )}

                      <div className="mb-4 grid grid-cols-3 gap-3 rounded-2xl bg-white p-2 text-sm font-semibold text-black">
                        {(
                          [
                            { key: 'dokumen', label: 'Dokumen', icon: <FaFileAlt /> },
                            { key: 'video', label: 'Video', icon: <FaVideo /> },
                            { key: 'tautan', label: 'Tautan', icon: <FaLink /> },
                          ] as Array<{ key: LampiranType; label: string; icon: React.ReactNode }>
                        )
                          .filter((option) => activeSintakState.allowedSubmissionTypes.includes(option.key))
                          .map((option) => (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => updateSintak(activeSintakState.order, (current) => ({ ...current, draftType: option.key, draftUrl: '', draftFile: null }))}
                              disabled={!isSubmissionTimeConfigured}
                              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 transition-all ${activeSintakState.draftType === option.key ? 'bg-[#0E5BFF] text-white' : 'text-black/70 hover:bg-black/5'}`}
                            >
                              {option.icon}
                              {option.label}
                            </button>
                          ))}
                      </div>

                      {activeSintakState.draftType === 'dokumen' ? (
                        <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/20 bg-black/20 px-4 py-3 text-gray-300 transition hover:border-[#0080FF]/50">
                          <input
                            type="file"
                            className="hidden"
                            disabled={!isSubmissionTimeConfigured}
                            onChange={(event) => {
                              const file = event.target.files?.[0] || null;
                              updateSintak(activeSintakState.order, (current) => ({ ...current, draftFile: file }));
                            }}
                          />
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[#4DA3FF]">
                            <FaFileAlt />
                          </div>
                          <span>{activeSintakState.draftFile?.name || 'Pilih dokumen untuk diunggah'}</span>
                        </label>
                      ) : (
                        <div className="relative mb-4">
                          <div className="pointer-events-none absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-[#4DA3FF]">
                            {activeSintakState.draftType === 'video' ? <FaVideo /> : <FaLink />}
                          </div>
                          <input
                            type="url"
                            value={activeSintakState.draftUrl}
                            disabled={!isSubmissionTimeConfigured}
                            onChange={(event) => updateSintak(activeSintakState.order, (current) => ({ ...current, draftUrl: event.target.value }))}
                            placeholder={activeSintakState.draftType === 'video' ? 'https://youtube.com/...' : 'https://contoh-link.com'}
                            className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-16 pr-4 text-white outline-none transition focus:border-[#0080FF] disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleSubmitPBL}
                        disabled={submitting || !isSubmissionTimeConfigured}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#0E5BFF] px-6 py-3 font-semibold text-white transition hover:bg-[#0B49CB] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FaSave />
                        {submitting ? 'Mengirim...' : 'Kirim Pengumpulan'}
                      </button>
                    </>
                  )}
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                  <h3 className="mb-5 flex items-center gap-2 text-xl font-bold">
                    <FaCommentAlt className="text-white" />
                    Komentar
                  </h3>

                  <div className="space-y-4">
                    {groupedKomentar.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-8 text-center text-gray-400">Belum ada komentar pada sintak ini.</div>
                    ) : (
                      groupedKomentar.map((comment) => (
                        <div
                          key={comment.id_komentar}
                          className="rounded-2xl border border-white/10 bg-black/20 p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10">
                                <FaUser className="text-sm text-white" />
                              </div>
                              <div>
                                <p className="font-semibold text-white">{comment.siswa?.nama_siswa || comment.guru?.nama_guru || 'Pengguna'}</p>
                                <p className="text-xs text-gray-400">{formatDateTimeForDisplay(comment.created_at)}</p>
                                <p className="mt-2 text-sm leading-6 text-gray-200">{comment.isi_komentar}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updateSintak(activeSintakState.order, (current) => ({
                                    ...current,
                                    replyingTo: comment,
                                    commentInput: `@${comment.siswa?.nama_siswa || comment.guru?.nama_guru || 'pengguna'} `,
                                  }))
                                }
                                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 transition hover:border-[#0080FF]/50 hover:text-white"
                              >
                                <FaCommentAlt />
                                Balas
                              </button>
                              {comment.id_siswa === currentSiswaId && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const response = await fetch(`/api/pbl/comment/${comment.id_komentar}`, { method: 'DELETE' });
                                    const result = await response.json();
                                    if (!response.ok) {
                                      showNotification(result.error || 'Gagal menghapus komentar', 'error');
                                      return;
                                    }
                                    if (elemenId) {
                                      await fetchPblData(currentSiswaId, elemenId);
                                    }
                                    showNotification('Komentar berhasil dihapus.', 'success');
                                  }}
                                  className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
                                >
                                  <FaTrash />
                                  Hapus
                                </button>
                              )}
                            </div>
                          </div>

                          {renderReplyThread(comment.id_komentar)}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 p-3">
                    {activeSintakState.replyingTo && (
                      <div className="mb-3 flex items-center justify-between rounded-xl border border-[#0080FF]/30 bg-[#0080FF]/10 px-4 py-3 text-sm text-[#c9e0ff]">
                        <span>Membalas komentar {activeSintakState.replyingTo.siswa?.nama_siswa || activeSintakState.replyingTo.guru?.nama_guru || 'pengguna'}</span>
                        <button
                          type="button"
                          onClick={() => updateSintak(activeSintakState.order, (current) => ({ ...current, replyingTo: null, commentInput: '' }))}
                          className="text-white/80 transition hover:text-white"
                        >
                          Batal
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10">
                        <FaCommentAlt className="text-sm text-white" />
                      </div>
                      <input
                        type="text"
                        value={activeSintakState.commentInput}
                        onChange={(event) => updateSintak(activeSintakState.order, (current) => ({ ...current, commentInput: event.target.value }))}
                        placeholder="Tambahkan komentar..."
                        className="flex-1 rounded-xl border border-transparent bg-transparent px-2 py-3 text-white outline-none placeholder:text-gray-300"
                      />
                      <button
                        type="button"
                        onClick={handleSubmitComment}
                        disabled={commentSubmitting}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[#0E5BFF] text-white transition hover:bg-[#0B49CB] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FaPaperPlane />
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        .card-container {
          perspective: 1000px;
          height: 320px;
        }

        .card {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1);
          will-change: transform;
        }

        .card-container:hover .card,
        .card-container:focus-within .card {
          transform: rotateY(180deg);
        }

        .card-front,
        .card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }

        .card-back {
          transform: rotateY(180deg) translateZ(1px);
        }
      `}</style>

      <footer className="relative border-t border-white/10 px-6 py-8">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm text-gray-400">
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
