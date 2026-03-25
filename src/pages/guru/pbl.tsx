import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import GuruNavbar from '@/components/GuruNavbar';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import supabase from '@/lib/db';
import { LampiranType, parseLampiran } from '@/lib/pbl';
import {
  FaArrowLeft,
  FaCheck,
  FaClock,
  FaCommentAlt,
  FaExclamationCircle,
  FaFileAlt,
  FaLink,
  FaPaperPlane,
  FaProjectDiagram,
  FaSave,
  FaSearch,
  FaSortAlphaDown,
  FaSortAlphaUp,
  FaTrash,
  FaUnderline,
  FaUser,
  FaVideo,
  FaUsers,
} from 'react-icons/fa';
import { FaBold, FaItalic, FaListUl, FaPlus } from 'react-icons/fa6';

const PBL_SYNTAX_TITLES = [
  'Sintak 1: Orientasi pada Masalah',
  'Sintak 2: Mengatur Peserta Didik untuk Belajar',
  'Sintak 3: Membimbing Pengalaman Individu Maupun Kelompok',
  'Sintak 4: Mengembangkan dan Menyajikan Hasil Karya',
  'Sintak 5: Menganalisis dan Mengevaluasi Proses Pemecahan Masalah',
] as const;

interface GuruData {
  id_guru: number;
  nama_guru: string;
  email_guru: string;
}

interface ElemenOption {
  id_elemen: number;
  nama_elemen: string;
  sampul_elemen?: string;
  kelas?: {
    nama_kelas: string;
  } | null;
}

interface ApiLampiran {
  id_lampiran: number;
  file_lampiran: string;
}

interface ApiPengumpulan {
  id_pengumpulan: number;
  id_kelompok: number | null;
  file_pengumpulan: string;
  waktu_pengumpulan: string | null;
  nilai_pbl?: number | null;
  komentar_pbl?: string | null;
  kelompok?: {
    id_kelompok: number;
    nama_kelompok: string;
  } | null;
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

interface ApiSiswaOption {
  id_siswa: number;
  nama_siswa: string;
  kelas?: {
    nama_kelas: string;
  } | null;
  lembaga?: {
    nama_lembaga: string;
  } | null;
}

interface ApiKelompok {
  id_kelompok: number;
  id_sintak: number;
  nama_kelompok: string;
  anggota?: Array<{
    id_anggota: number;
    id_siswa: number;
    siswa?: ApiSiswaOption | null;
  }>;
}

interface ApiKomentar {
  id_komentar: number;
  isi_komentar: string;
  parent_id: number | null;
  created_at: string;
  id_guru: number | null;
  id_siswa: number | null;
  siswa?: {
    nama_siswa: string;
  } | null;
  guru?: {
    nama_guru: string;
  } | null;
}

interface LocalLampiran {
  id?: number;
  type: LampiranType;
  label: string;
  url: string;
  file?: File | null;
}

interface SintakState {
  order: number;
  title: string;
  id_sintak: number | null;
  descriptionHtml: string;
  waktu_mulai: string;
  waktu_selesai: string;
  allowedSubmissionTypes: LampiranType[];
  lampiran: LocalLampiran[];
  kelompok: ApiKelompok[];
  pengumpulan: ApiPengumpulan[];
  komentar: ApiKomentar[];
  draftType: LampiranType;
  draftUrl: string;
  draftFile: File | null;
  groupNameInput: string;
  selectedMemberIds: number[];
  commentInput: string;
  replyingTo: ApiKomentar | null;
}

type NotificationType = 'success' | 'error';

interface NotificationState {
  show: boolean;
  type: NotificationType;
  message: string;
}

function getCurrentDate() {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const now = new Date();
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function formatDateTimeForInput(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDisplayDateTime(value: string | null | undefined) {
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
      text: `Lebih awal ${formatDurationIndonesian(Math.abs(diffSeconds))}`,
      className: 'text-emerald-300',
    };
  }

  return {
    text: 'Tepat waktu',
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

function RichTextEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const applyCommand = (command: 'bold' | 'italic' | 'underline' | 'insertUnorderedList') => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    onChange(editorRef.current?.innerHTML || '');
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5">
      <div className="flex flex-wrap gap-2 border-b border-white/10 px-4 py-3">
        {[
          { key: 'bold', label: 'Bold', icon: <FaBold /> },
          { key: 'italic', label: 'Italic', icon: <FaItalic /> },
          { key: 'underline', label: 'Underline', icon: <FaUnderline /> },
          { key: 'insertUnorderedList', label: 'Bullet List', icon: <FaListUl /> },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => applyCommand(item.key as 'bold' | 'italic' | 'underline' | 'insertUnorderedList')}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-gray-200 transition hover:border-[#0080FF]/60 hover:text-white"
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        className="min-h-[220px] px-4 py-4 text-sm leading-7 text-white focus:outline-none"
        style={{ whiteSpace: 'pre-wrap' }}
      />
    </div>
  );
}

export default function PBLGuru() {
  const router = useRouter();
  const elemenQuery = router.query.elemen;
  const elemenId = typeof elemenQuery === 'string' ? Number(elemenQuery) : null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [guruData, setGuruData] = useState<GuruData | null>(null);
  const [elemenOptions, setElemenOptions] = useState<ElemenOption[]>([]);
  const [siswaOptions, setSiswaOptions] = useState<ApiSiswaOption[]>([]);
  const [elemenName, setElemenName] = useState('');
  const [activeSintak, setActiveSintak] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [notification, setNotification] = useState<NotificationState>({ show: false, type: 'success', message: '' });
  const [sintakState, setSintakState] = useState<SintakState[]>([]);
  const [deletingSubmission, setDeletingSubmission] = useState(false);
  const [deleteSubmissionTarget, setDeleteSubmissionTarget] = useState<{
    id_pengumpulan: number;
    nama: string;
    waktu: string | null;
  } | null>(null);
  const [gradingDrafts, setGradingDrafts] = useState<Record<number, { nilai: string; komentar: string }>>({});
  const [savingGradingMap, setSavingGradingMap] = useState<Record<number, boolean>>({});
  const notificationTimerRef = useRef<number | null>(null);
  const startDateTimeRef = useRef<HTMLInputElement>(null);
  const endDateTimeRef = useRef<HTMLInputElement>(null);

  const openDateTimePicker = (input: HTMLInputElement | null) => {
    if (!input) {
      return;
    }

    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof pickerInput.showPicker === 'function') {
      try {
        pickerInput.showPicker();
      } catch {
        input.focus();
      }
      return;
    }

    input.focus();
  };

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

  const loadSiswaByKelas = async (kelasId: number | null) => {
    if (!kelasId) {
      setSiswaOptions([]);
      return;
    }

    const { data, error } = await supabase
      .from('siswa')
      .select(
        `
        id_siswa,
        nama_siswa,
        kelas:kelas_siswa (
          nama_kelas
        ),
        lembaga:lembaga_siswa (
          nama_lembaga
        )
      `,
      )
      .eq('kelas_siswa', kelasId)
      .order('nama_siswa', { ascending: true });

    if (error) {
      console.error('Error fetching siswa options:', error);
      setSiswaOptions([]);
      return;
    }

    setSiswaOptions(
      ((data as Array<any>) || []).map((item) => ({
        id_siswa: item.id_siswa,
        nama_siswa: item.nama_siswa,
        kelas: Array.isArray(item.kelas) ? item.kelas[0] || null : item.kelas || null,
        lembaga: Array.isArray(item.lembaga) ? item.lembaga[0] || null : item.lembaga || null,
      })),
    );
  };

  const fetchPblData = async (guruId: number, currentElemenId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pbl?elemen=${currentElemenId}&guru=${guruId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal memuat halaman PBL');
      }

      const kelasRel = Array.isArray(result.elemen?.kelas) ? result.elemen?.kelas[0] : result.elemen?.kelas;
      await loadSiswaByKelas(kelasRel?.id_kelas || null);

      setElemenName(result.elemen?.nama_elemen || '');
      setSintakState(
        (result.sintaks || []).map((item: any) => ({
          order: item.order,
          title: item.title,
          id_sintak: item.id_sintak,
          descriptionHtml: item.descriptionHtml || '',
          waktu_mulai: formatDateTimeForInput(item.waktu_mulai),
          waktu_selesai: formatDateTimeForInput(item.waktu_selesai),
          allowedSubmissionTypes: item.allowedSubmissionTypes || ['dokumen'],
          lampiran: ((item.lampiran || []) as ApiLampiran[])
            .map((lampiran) => {
              const parsed = parseLampiran(lampiran.file_lampiran);
              if (!parsed) {
                return null;
              }

              return {
                id: lampiran.id_lampiran,
                type: parsed.type,
                label: parsed.label,
                url: parsed.url,
                file: null,
              } as LocalLampiran;
            })
            .filter(Boolean) as LocalLampiran[],
          kelompok: item.kelompok || [],
          pengumpulan: item.pengumpulan || [],
          komentar: item.komentar || [],
          draftType: 'dokumen',
          draftUrl: '',
          draftFile: null,
          groupNameInput: '',
          selectedMemberIds: [],
          commentInput: '',
          replyingTo: null,
        })),
      );
      // Only set to 1 if no sintak query parameter exists
      if (!router.query.sintak) {
        setActiveSintak(1);
      }
    } catch (error) {
      console.error('Error fetching PBL data:', error);
      showNotification(error instanceof Error ? error.message : 'Gagal memuat halaman PBL', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const guruSession = localStorage.getItem('guru_session');
        if (!guruSession) {
          router.push('/login');
          return;
        }

        const sessionData = JSON.parse(guruSession) as GuruData;
        setGuruData(sessionData);

        const { data: elemenData, error: elemenError } = await supabase
          .from('elemen')
          .select(
            `
            id_elemen,
            nama_elemen,
            sampul_elemen,
            kelas:kelas_elemen (
              nama_kelas
            )
          `,
          )
          .eq('guru_pengampu', sessionData.id_guru)
          .order('nama_elemen', { ascending: true });

        if (elemenError) {
          console.error('Error fetching elemen options:', elemenError);
        } else {
          setElemenOptions(
            ((elemenData as Array<any>) || []).map((item) => ({
              id_elemen: item.id_elemen,
              nama_elemen: item.nama_elemen,
              sampul_elemen: item.sampul_elemen,
              kelas: Array.isArray(item.kelas) ? item.kelas[0] || null : item.kelas || null,
            })),
          );
        }

        if (router.isReady && elemenId) {
          await fetchPblData(sessionData.id_guru, elemenId);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking guru auth:', error);
        router.push('/login');
      }
    };

    if (router.isReady) {
      loadInitialData();
    }
  }, [router.isReady, elemenId]);

  // Handle sintak query parameter
  useEffect(() => {
    if (router.isReady && !loading) {
      const sintakQuery = router.query.sintak;
      if (sintakQuery) {
        const sintakNum = typeof sintakQuery === 'string' ? Number(sintakQuery) : Number(Array.isArray(sintakQuery) ? sintakQuery[0] : sintakQuery);
        if (!isNaN(sintakNum) && sintakNum >= 1 && sintakNum <= 5) {
          setActiveSintak(sintakNum);
        }
      }
    }
  }, [router.isReady, router.query.sintak, router.query.elemen, loading]);

  const updateSintak = (order: number, updater: (current: SintakState) => SintakState) => {
    setSintakState((current) => current.map((item) => (item.order === order ? updater(item) : item)));
  };

  const activeSintakState = sintakState.find((item) => item.order === activeSintak) || null;

  const filteredPengumpulan = useMemo(() => {
    if (!activeSintakState) {
      return [];
    }

    const hasKelompok = activeSintakState.kelompok.length > 0;

    if (hasKelompok) {
      const groupedSubmissions = new Map<number, ApiPengumpulan>();

      activeSintakState.pengumpulan.forEach((submission) => {
        if (!submission.id_kelompok) {
          return;
        }

        if (!groupedSubmissions.has(submission.id_kelompok)) {
          groupedSubmissions.set(submission.id_kelompok, submission);
        }
      });

      return activeSintakState.kelompok
        .map((group) => {
          const submission = groupedSubmissions.get(group.id_kelompok) || null;
          const memberNames = (group.anggota || []).map((member) => member.siswa?.nama_siswa || '-').filter((name) => name !== '-');
          const firstMember = group.anggota?.[0]?.siswa;

          return {
            key: `group-${group.id_kelompok}`,
            nama: group.nama_kelompok,
            anggotaLabel: memberNames.length > 0 ? memberNames.join(', ') : '-',
            kelas: firstMember?.kelas?.nama_kelas || '-',
            lembaga: firstMember?.lembaga?.nama_lembaga || '-',
            pengumpul: submission?.siswa?.nama_siswa || '-',
            waktu: submission?.waktu_pengumpulan || null,
            submission,
          };
        })
        .filter((item) => {
          const keyword = searchTerm.toLowerCase();
          return item.nama.toLowerCase().includes(keyword) || item.anggotaLabel.toLowerCase().includes(keyword);
        })
        .sort((left, right) => (sortOrder === 'asc' ? left.nama.localeCompare(right.nama) : right.nama.localeCompare(left.nama)));
    }

    return [...activeSintakState.pengumpulan]
      .map((item) => ({
        key: `student-${item.id_pengumpulan}`,
        nama: item.siswa?.nama_siswa || '-',
        anggotaLabel: '-',
        kelas: item.siswa?.kelas?.nama_kelas || '-',
        lembaga: item.siswa?.lembaga?.nama_lembaga || '-',
        pengumpul: item.siswa?.nama_siswa || '-',
        waktu: item.waktu_pengumpulan,
        submission: item,
      }))
      .filter((item) => item.nama.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((left, right) => (sortOrder === 'asc' ? left.nama.localeCompare(right.nama) : right.nama.localeCompare(left.nama)));
  }, [activeSintakState, searchTerm, sortOrder]);

  const groupedKomentar = useMemo(() => {
    if (!activeSintakState) {
      return [] as ApiKomentar[];
    }

    return activeSintakState.komentar.filter((item) => !item.parent_id);
  }, [activeSintakState]);

  const currentGuruId = guruData?.id_guru ?? 0;

  const canGuruDeleteComment = (comment: ApiKomentar) => {
    return Boolean(comment.id_siswa) || (comment.id_guru ?? 0) === currentGuruId;
  };

  const renderReplyThread = (parentId: number) => {
    if (!activeSintakState) {
      return null;
    }

    const replies = activeSintakState.komentar.filter((reply) => reply.parent_id === parentId);
    if (replies.length === 0) {
      return null;
    }

    return (
      <div className="mt-4 space-y-3 border-l border-white/10 pl-5">
        {replies.map((reply) => (
          <div
            key={reply.id_komentar}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10">
                  <FaUser className="text-xs text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">{reply.siswa?.nama_siswa || reply.guru?.nama_guru || 'Pengguna'}</p>
                  <p className="text-xs text-gray-400">{formatDisplayDateTime(reply.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleReply(reply)}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 transition hover:border-[#0080FF]/50 hover:text-white"
                >
                  <FaCommentAlt />
                  Balas
                </button>
                {canGuruDeleteComment(reply) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(reply.id_komentar)}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
                  >
                    <FaTrash />
                    Hapus
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-200">{reply.isi_komentar}</p>
            {renderReplyThread(reply.id_komentar)}
          </div>
        ))}
      </div>
    );
  };

  const handleDraftTypeChange = (order: number, type: LampiranType) => {
    updateSintak(order, (current) => ({
      ...current,
      draftType: type,
      draftUrl: '',
      draftFile: null,
    }));
  };

  const toggleMemberSelection = (order: number, siswaId: number) => {
    updateSintak(order, (current) => {
      const exists = current.selectedMemberIds.includes(siswaId);
      return {
        ...current,
        selectedMemberIds: exists ? current.selectedMemberIds.filter((id) => id !== siswaId) : [...current.selectedMemberIds, siswaId],
      };
    });
  };

  const handleCreateKelompok = async (order: number) => {
    if (!guruData || !elemenId) {
      return;
    }

    const current = sintakState.find((item) => item.order === order);
    if (!current || !current.id_sintak) {
      showNotification('Simpan sintak terlebih dahulu sebelum membuat kelompok.', 'error');
      return;
    }

    if (!current.groupNameInput.trim()) {
      showNotification('Nama kelompok wajib diisi.', 'error');
      return;
    }

    if (current.selectedMemberIds.length === 0) {
      showNotification('Pilih minimal satu anggota kelompok.', 'error');
      return;
    }

    try {
      const response = await fetch('/api/pbl/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_sintak: current.id_sintak,
          nama_kelompok: current.groupNameInput,
          anggotaIds: current.selectedMemberIds,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Gagal menambahkan kelompok');
      }

      await fetchPblData(guruData.id_guru, elemenId);
      showNotification('Kelompok berhasil ditambahkan.', 'success');
    } catch (error) {
      console.error('Error creating kelompok:', error);
      showNotification(error instanceof Error ? error.message : 'Gagal menambahkan kelompok', 'error');
    }
  };

  const handleDeleteKelompok = async (kelompokId: number) => {
    if (!guruData || !elemenId) {
      return;
    }

    try {
      const response = await fetch(`/api/pbl/group/${kelompokId}`, { method: 'DELETE' });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menghapus kelompok');
      }

      await fetchPblData(guruData.id_guru, elemenId);
      showNotification('Kelompok berhasil dihapus.', 'success');
    } catch (error) {
      console.error('Error deleting kelompok:', error);
      showNotification(error instanceof Error ? error.message : 'Gagal menghapus kelompok', 'error');
    }
  };

  const handleAddLampiran = (order: number) => {
    const current = sintakState.find((item) => item.order === order);
    if (!current) {
      return;
    }

    if (current.draftType === 'dokumen' && !current.draftFile) {
      showNotification('Pilih dokumen terlebih dahulu.', 'error');
      return;
    }

    if ((current.draftType === 'video' || current.draftType === 'tautan') && !current.draftUrl.trim()) {
      showNotification('Isi URL lampiran terlebih dahulu.', 'error');
      return;
    }

    updateSintak(order, (item) => ({
      ...item,
      lampiran: [
        ...item.lampiran,
        {
          type: current.draftType,
          label: current.draftType === 'dokumen' ? current.draftFile?.name || 'Dokumen Lampiran' : current.draftUrl.trim() || `Lampiran ${item.title}`,
          url: current.draftType === 'dokumen' ? '' : current.draftUrl.trim(),
          file: current.draftType === 'dokumen' ? current.draftFile : null,
        },
      ],
      draftUrl: '',
      draftFile: null,
    }));
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

  const handleSave = async () => {
    if (!guruData || !elemenId) {
      return;
    }

    const current = sintakState.find((item) => item.order === activeSintak);
    if (!current) {
      return;
    }

    if (!current.descriptionHtml.replace(/<[^>]+>/g, '').trim()) {
      showNotification('Deskripsi penugasan pada sintak aktif masih kosong.', 'error');
      return;
    }

    if (!current.waktu_mulai || !current.waktu_selesai) {
      showNotification('Waktu mulai dan waktu terakhir wajib diisi.', 'error');
      return;
    }

    if (new Date(current.waktu_mulai) > new Date(current.waktu_selesai)) {
      showNotification('Waktu terakhir harus setelah waktu mulai.', 'error');
      return;
    }

    setSaving(true);
    try {
      const preparedSintaks = await Promise.all(
        sintakState.map(async (item) => ({
          order: item.order,
          descriptionHtml: item.descriptionHtml,
          waktu_mulai: item.waktu_mulai ? new Date(item.waktu_mulai).toISOString() : null,
          waktu_selesai: item.waktu_selesai ? new Date(item.waktu_selesai).toISOString() : null,
          allowedSubmissionTypes: item.allowedSubmissionTypes,
          lampiran: await Promise.all(
            item.lampiran.map(async (attachment) => ({
              type: attachment.type,
              label: attachment.label,
              url: attachment.type === 'dokumen' && attachment.file && !attachment.url ? await uploadFile(attachment.file) : attachment.url,
            })),
          ),
        })),
      );

      const response = await fetch('/api/pbl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_elemen: elemenId,
          id_guru: guruData.id_guru,
          sintaks: preparedSintaks,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menyimpan sintak PBL');
      }

      await fetchPblData(guruData.id_guru, elemenId);
      showNotification(`Sintak ${activeSintak} berhasil disimpan.`, 'success');
    } catch (error) {
      console.error('Error saving PBL:', error);
      showNotification(error instanceof Error ? error.message : 'Gagal menyimpan sintak PBL', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!guruData || !elemenId || !activeSintakState) {
      return;
    }

    if (!activeSintakState.id_sintak) {
      showNotification('Simpan sintak terlebih dahulu sebelum menambahkan komentar.', 'error');
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
          id_guru: guruData.id_guru,
          isi_komentar: activeSintakState.commentInput,
          parent_id: activeSintakState.replyingTo?.id_komentar || null,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menambahkan komentar');
      }

      await fetchPblData(guruData.id_guru, elemenId);
      showNotification('Komentar berhasil ditambahkan.', 'success');
    } catch (error) {
      console.error('Error creating comment:', error);
      showNotification(error instanceof Error ? error.message : 'Gagal menambahkan komentar', 'error');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!guruData || !elemenId) {
      return;
    }

    try {
      const response = await fetch(`/api/pbl/comment/${commentId}`, { method: 'DELETE' });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menghapus komentar');
      }

      await fetchPblData(guruData.id_guru, elemenId);
      showNotification('Komentar berhasil dihapus.', 'success');
    } catch (error) {
      console.error('Error deleting comment:', error);
      showNotification(error instanceof Error ? error.message : 'Gagal menghapus komentar', 'error');
    }
  };

  const handleReply = (comment: ApiKomentar) => {
    if (!activeSintakState) {
      return;
    }

    const targetName = comment.siswa?.nama_siswa || comment.guru?.nama_guru || 'Pengguna';
    updateSintak(activeSintakState.order, (current) => ({
      ...current,
      replyingTo: comment,
      commentInput: `@${targetName} `,
    }));
  };

  const openSubmissionPreview = (item: ApiPengumpulan) => {
    const parsed = parseSubmissionFile(item.file_pengumpulan);
    const query = new URLSearchParams({
      url: parsed.url,
      type: parsed.type,
      name: parsed.label || item.siswa?.nama_siswa || 'File Pengumpulan',
      back: router.asPath,
    });
    router.push(`/guru/pbl/preview?${query.toString()}`);
  };

  const openDeleteSubmissionModal = (submission: ApiPengumpulan, nama: string) => {
    setDeleteSubmissionTarget({
      id_pengumpulan: submission.id_pengumpulan,
      nama,
      waktu: submission.waktu_pengumpulan,
    });
  };

  const getGradingDraft = (submission: ApiPengumpulan) => {
    const existing = gradingDrafts[submission.id_pengumpulan];
    if (existing) {
      return existing;
    }

    return {
      nilai: submission.nilai_pbl !== null && submission.nilai_pbl !== undefined ? String(submission.nilai_pbl) : '',
      komentar: submission.komentar_pbl || '',
    };
  };

  const handleGradingDraftChange = (submission: ApiPengumpulan, field: 'nilai' | 'komentar', value: string) => {
    setGradingDrafts((current) => {
      const base = current[submission.id_pengumpulan] || {
        nilai: submission.nilai_pbl !== null && submission.nilai_pbl !== undefined ? String(submission.nilai_pbl) : '',
        komentar: submission.komentar_pbl || '',
      };

      return {
        ...current,
        [submission.id_pengumpulan]: {
          ...base,
          [field]: value,
        },
      };
    });
  };

  const handleSaveSubmissionGrading = async (submission: ApiPengumpulan) => {
    if (!guruData || !elemenId) {
      return;
    }

    const draft = getGradingDraft(submission);
    let parsedNilai: number | null = null;

    if (draft.nilai.trim() !== '') {
      const numericNilai = Number(draft.nilai);
      if (!Number.isFinite(numericNilai)) {
        showNotification('Nilai harus berupa angka yang valid.', 'error');
        return;
      }

      if (numericNilai < 0 || numericNilai > 100) {
        showNotification('Nilai harus berada pada rentang 0 - 100.', 'error');
        return;
      }

      parsedNilai = numericNilai;
    }

    const parsedKomentar = draft.komentar.trim();

    setSavingGradingMap((current) => ({
      ...current,
      [submission.id_pengumpulan]: true,
    }));

    try {
      const response = await fetch(`/api/pbl/submission/${submission.id_pengumpulan}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nilai_pbl: parsedNilai,
          komentar_pbl: parsedKomentar || null,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menyimpan nilai/komentar PBL');
      }

      await fetchPblData(guruData.id_guru, elemenId);
      showNotification('Nilai dan komentar PBL berhasil disimpan.', 'success');
    } catch (error) {
      console.error('Error saving submission grading:', error);
      showNotification(error instanceof Error ? error.message : 'Gagal menyimpan nilai/komentar PBL', 'error');
    } finally {
      setSavingGradingMap((current) => ({
        ...current,
        [submission.id_pengumpulan]: false,
      }));
    }
  };

  const closeDeleteSubmissionModal = () => {
    if (deletingSubmission) {
      return;
    }
    setDeleteSubmissionTarget(null);
  };

  const handleDeleteSubmission = async () => {
    if (!guruData || !elemenId || !deleteSubmissionTarget) {
      return;
    }

    setDeletingSubmission(true);
    try {
      const response = await fetch(`/api/pbl/submission/${deleteSubmissionTarget.id_pengumpulan}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menghapus file pengumpulan siswa');
      }

      setDeleteSubmissionTarget(null);
      await fetchPblData(guruData.id_guru, elemenId);
      showNotification('File pengumpulan siswa berhasil dihapus.', 'success');
    } catch (error) {
      console.error('Error deleting pengumpulan pbl:', error);
      showNotification(error instanceof Error ? error.message : 'Gagal menghapus file pengumpulan siswa', 'error');
    } finally {
      setDeletingSubmission(false);
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
      {guruData && <GuruNavbar guruName={guruData.nama_guru} />}

      <div className="relative z-10 px-6 pb-12 pt-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold">
                Selamat Datang, <span className="text-[#FFFFFF]">{guruData?.nama_guru.split(' ')[0]}!</span>
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
              <div className="mb-6 flex items-center gap-3">
                <FaProjectDiagram className="text-2xl text-[#FFFFFF]" />
                <h2 className="text-2xl font-bold">Pilih Elemen untuk Mengelola PBL</h2>
              </div>
              {elemenOptions.length === 0 ? (
                <p className="text-gray-400">Belum ada elemen yang Anda ampu.</p>
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
                          role="button"
                          tabIndex={0}
                        >
                          <div className="relative h-48 w-full bg-gray-900 pointer-events-none">
                            <Image
                              src={option.sampul_elemen || '/default-cover.jpg'}
                              alt={option.nama_elemen}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                          </div>
                          <div className="p-4 pointer-events-none">
                            <h3 className="text-xl font-bold text-white">{option.nama_elemen}</h3>
                            <p className="mt-1 text-sm text-gray-400">{option.kelas?.nama_kelas || 'Kelas belum terhubung'}</p>
                            <p className="mt-1 text-xs text-gray-300">Pengampu: {guruData?.nama_guru || 'Guru'}</p>
                          </div>
                        </div>

                        <div
                          className="card-back bg-gradient-to-br from-[#0080FF] to-[#0050AA] border border-white/20 rounded-xl p-6 shadow-lg overflow-hidden"
                          role="button"
                          tabIndex={0}
                        >
                          <h3 className="text-lg font-bold mb-3 text-white">Sintak Problem Based Learning:</h3>
                          <div className="space-y-2 overflow-y-auto max-h-44 pr-1">
                            <ol className="list-decimal list-inside text-white/95 text-sm space-y-2">
                              <li
                                onClick={() => router.push(`/guru/pbl?elemen=${option.id_elemen}&sintak=1`)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    router.push(`/guru/pbl?elemen=${option.id_elemen}&sintak=1`);
                                  }
                                }}
                                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 transition-colors hover:bg-white/20 cursor-pointer"
                                role="button"
                                tabIndex={0}
                              >
                                Sintak 1: Orientasi pada Masalah
                              </li>
                              <li
                                onClick={() => router.push(`/guru/pbl?elemen=${option.id_elemen}&sintak=2`)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    router.push(`/guru/pbl?elemen=${option.id_elemen}&sintak=2`);
                                  }
                                }}
                                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 transition-colors hover:bg-white/20 cursor-pointer"
                                role="button"
                                tabIndex={0}
                              >
                                Sintak 2: Mengatur Peserta Didik untuk Belajar
                              </li>
                              <li
                                onClick={() => router.push(`/guru/pbl?elemen=${option.id_elemen}&sintak=3`)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    router.push(`/guru/pbl?elemen=${option.id_elemen}&sintak=3`);
                                  }
                                }}
                                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 transition-colors hover:bg-white/20 cursor-pointer"
                                role="button"
                                tabIndex={0}
                              >
                                Sintak 3: Membimbing Pengalaman Individu Maupun Kelompok
                              </li>
                              <li
                                onClick={() => router.push(`/guru/pbl?elemen=${option.id_elemen}&sintak=4`)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    router.push(`/guru/pbl?elemen=${option.id_elemen}&sintak=4`);
                                  }
                                }}
                                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 transition-colors hover:bg-white/20 cursor-pointer"
                                role="button"
                                tabIndex={0}
                              >
                                Sintak 4: Mengembangkan dan Menyajikan Hasil Karya
                              </li>
                              <li
                                onClick={() => router.push(`/guru/pbl?elemen=${option.id_elemen}&sintak=5`)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    router.push(`/guru/pbl?elemen=${option.id_elemen}&sintak=5`);
                                  }
                                }}
                                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 transition-colors hover:bg-white/20 cursor-pointer"
                                role="button"
                                tabIndex={0}
                              >
                                Sintak 5: Menganalisis dan Mengevaluasi Proses Pemecahan Masalah
                              </li>
                            </ol>
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

                  <div className="mb-5 grid grid-cols-3 gap-3 rounded-2xl bg-white p-2 text-sm font-semibold text-black">
                    {(
                      [
                        { key: 'dokumen', label: 'Dokumen', icon: <FaFileAlt /> },
                        { key: 'video', label: 'Video', icon: <FaVideo /> },
                        { key: 'tautan', label: 'Tautan', icon: <FaLink /> },
                      ] as Array<{ key: LampiranType; label: string; icon: ReactNode }>
                    ).map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => handleDraftTypeChange(activeSintakState.order, option.key)}
                        className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 transition-all ${activeSintakState.draftType === option.key ? 'bg-[#0E5BFF] text-white' : 'text-black/70 hover:bg-black/5'}`}
                      >
                        {option.icon}
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
                    {activeSintakState.draftType === 'dokumen' ? (
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/20 bg-black/20 px-4 py-3 text-gray-300 transition hover:border-[#0080FF]/50">
                        <input
                          type="file"
                          className="hidden"
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
                      <div className="relative">
                        <div className="pointer-events-none absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-[#4DA3FF]">
                          {activeSintakState.draftType === 'video' ? <FaVideo /> : <FaLink />}
                        </div>
                        <input
                          type="url"
                          value={activeSintakState.draftUrl}
                          onChange={(event) => updateSintak(activeSintakState.order, (current) => ({ ...current, draftUrl: event.target.value }))}
                          placeholder={activeSintakState.draftType === 'video' ? 'https://youtube.com/...' : 'https://contoh-link.com'}
                          className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-16 pr-4 text-white outline-none transition focus:border-[#0080FF]"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleAddLampiran(activeSintakState.order)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0E5BFF] px-5 py-3 font-semibold text-white transition hover:bg-[#0B49CB]"
                    >
                      <FaPlus />
                      Tambah
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {activeSintakState.lampiran.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-6 text-center text-gray-400">Belum ada lampiran tugas pada sintak ini.</div>
                    ) : (
                      activeSintakState.lampiran.map((attachment, index) => (
                        <div
                          key={`${attachment.label}-${index}`}
                          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                        >
                          <div>
                            <p className="font-semibold text-white">{attachment.label || 'Lampiran tanpa judul'}</p>
                            <p className="mt-1 text-sm capitalize text-gray-400">
                              {attachment.type}
                              {attachment.file ? ` • ${attachment.file.name}` : attachment.url ? ` • ${attachment.url}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {attachment.url && (
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg bg-[#0E5BFF] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0B49CB]"
                              >
                                <FaLink />
                                Lihat Lampiran PBL
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => updateSintak(activeSintakState.order, (current) => ({ ...current, lampiran: current.lampiran.filter((_, itemIndex) => itemIndex !== index) }))}
                              className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
                            >
                              <FaTrash />
                              Hapus
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                  <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
                    <FaFileAlt className="text-white" />
                    Deskripsi Tugas
                  </h3>
                  <RichTextEditor
                    value={activeSintakState.descriptionHtml}
                    onChange={(value) => updateSintak(activeSintakState.order, (current) => ({ ...current, descriptionHtml: value }))}
                  />
                </section>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                    <h3 className="mb-5 flex items-center gap-2 text-xl font-bold">
                      <FaClock className="text-white" />
                      Waktu
                    </h3>
                    <div className="space-y-5">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-300">Waktu Mulai</label>
                        <div className="relative">
                          <input
                            ref={startDateTimeRef}
                            type="datetime-local"
                            value={activeSintakState.waktu_mulai}
                            onChange={(event) => updateSintak(activeSintakState.order, (current) => ({ ...current, waktu_mulai: event.target.value }))}
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-[#0080FF]"
                          />
                          <button
                            type="button"
                            onClick={() => openDateTimePicker(startDateTimeRef.current)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition hover:text-white"
                            aria-label="Buka picker waktu mulai"
                          >
                            <FaClock />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-300">Waktu Terakhir</label>
                        <div className="relative">
                          <input
                            ref={endDateTimeRef}
                            type="datetime-local"
                            value={activeSintakState.waktu_selesai}
                            onChange={(event) => updateSintak(activeSintakState.order, (current) => ({ ...current, waktu_selesai: event.target.value }))}
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-[#0080FF]"
                          />
                          <button
                            type="button"
                            onClick={() => openDateTimePicker(endDateTimeRef.current)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition hover:text-white"
                            aria-label="Buka picker waktu terakhir"
                          >
                            <FaClock />
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                    <h3 className="mb-5 flex items-center gap-2 text-xl font-bold">
                      <FaFileAlt className="text-white" />
                      File Pengumpulan
                    </h3>
                    <div className="grid grid-cols-3 gap-3 rounded-2xl bg-white p-2 text-sm font-semibold text-black">
                      {(
                        [
                          { key: 'dokumen', label: 'Dokumen', icon: <FaFileAlt /> },
                          { key: 'video', label: 'Video', icon: <FaVideo /> },
                          { key: 'tautan', label: 'Tautan', icon: <FaLink /> },
                        ] as Array<{ key: LampiranType; label: string; icon: ReactNode }>
                      ).map((option) => {
                        const active = activeSintakState.allowedSubmissionTypes.includes(option.key);
                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() =>
                              updateSintak(activeSintakState.order, (current) => {
                                const exists = current.allowedSubmissionTypes.includes(option.key);
                                const nextTypes = exists ? current.allowedSubmissionTypes.filter((item) => item !== option.key) : [...current.allowedSubmissionTypes, option.key];
                                return { ...current, allowedSubmissionTypes: nextTypes.length > 0 ? nextTypes : ['dokumen'] };
                              })
                            }
                            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 transition-all ${active ? 'bg-[#0E5BFF] text-white' : 'text-black/70 hover:bg-black/5'}`}
                          >
                            {option.icon}
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-4 text-sm text-gray-400">Pilih jenis file yang boleh dikumpulkan siswa pada sintak ini.</p>
                  </section>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0E5BFF] px-6 py-3 font-semibold text-white transition hover:bg-[#0B49CB] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FaSave />
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                  <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <h3 className="flex items-center gap-2 text-xl font-bold">
                      <FaProjectDiagram className="text-white" />
                      Progres Pengerjaan
                    </h3>
                    <div className="flex flex-col gap-3 md:flex-row">
                      <button
                        type="button"
                        onClick={() => setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'))}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-200 transition hover:border-[#0080FF]/50"
                      >
                        {sortOrder === 'asc' ? <FaSortAlphaDown /> : <FaSortAlphaUp />}
                        {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                      </button>

                      <div className="relative min-w-[280px]">
                        <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(event) => setSearchTerm(event.target.value)}
                          placeholder="Cari berdasarkan nama"
                          className="w-full rounded-lg border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-white outline-none transition focus:border-[#0080FF]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <h4 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                      <FaUsers className="text-[#4DA3FF]" />
                      Kelompok PBL
                    </h4>

                    {!activeSintakState.id_sintak ? (
                      <p className="text-sm text-gray-400">Simpan sintak terlebih dahulu agar bisa mengatur kelompok.</p>
                    ) : (
                      <>
                        <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
                          <input
                            type="text"
                            value={activeSintakState.groupNameInput}
                            onChange={(event) => updateSintak(activeSintakState.order, (current) => ({ ...current, groupNameInput: event.target.value }))}
                            placeholder="Nama kelompok"
                            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-[#0080FF]"
                          />
                          <button
                            type="button"
                            onClick={() => handleCreateKelompok(activeSintakState.order)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0E5BFF] px-5 py-3 font-semibold text-white transition hover:bg-[#0B49CB]"
                          >
                            <FaPlus />
                            Tambah Kelompok
                          </button>
                        </div>

                        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {siswaOptions.length === 0 ? (
                            <p className="text-sm text-gray-400">Belum ada data siswa pada kelas elemen ini.</p>
                          ) : (
                            siswaOptions.map((siswa) => {
                              const checked = activeSintakState.selectedMemberIds.includes(siswa.id_siswa);

                              return (
                                <label
                                  key={siswa.id_siswa}
                                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${checked ? 'border-[#0E5BFF]/70 bg-[#0E5BFF]/15 text-white' : 'border-white/10 bg-black/20 text-gray-200 hover:border-[#0080FF]/40'}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleMemberSelection(activeSintakState.order, siswa.id_siswa)}
                                    className="h-4 w-4 rounded border-white/20 bg-black/20"
                                  />
                                  <span>{siswa.nama_siswa}</span>
                                </label>
                              );
                            })
                          )}
                        </div>

                        <div className="space-y-3">
                          {activeSintakState.kelompok.length === 0 ? (
                            <p className="text-sm text-gray-400">Belum ada kelompok untuk sintak ini.</p>
                          ) : (
                            activeSintakState.kelompok.map((group) => (
                              <div
                                key={group.id_kelompok}
                                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-3 lg:flex-row lg:items-start lg:justify-between"
                              >
                                <div>
                                  <p className="font-semibold text-white">{group.nama_kelompok}</p>
                                  <p className="mt-1 text-sm text-gray-300">{(group.anggota || []).map((member) => member.siswa?.nama_siswa || '-').join(', ') || 'Belum ada anggota'}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteKelompok(group.id_kelompok)}
                                  className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
                                >
                                  <FaTrash />
                                  Hapus
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-white/10 text-gray-300">
                        <tr>
                          <th className="px-4 py-3">No</th>
                          <th className="px-4 py-3">Nama Kelompok / Siswa</th>
                          <th className="px-4 py-3">Anggota</th>
                          <th className="px-4 py-3">Kelas</th>
                          <th className="px-4 py-3">Lembaga</th>
                          <th className="px-4 py-3">Pengumpul</th>
                          <th className="px-4 py-3">Waktu Pengumpulan</th>
                          <th className="px-4 py-3">File Pengumpulan</th>
                          <th className="px-4 py-3">Penilaian Guru</th>
                          <th className="px-4 py-3">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPengumpulan.length === 0 ? (
                          <tr>
                            <td
                              colSpan={10}
                              className="px-4 py-10 text-center text-gray-400"
                            >
                              Belum ada siswa yang mengumpulkan file pada sintak ini.
                            </td>
                          </tr>
                        ) : (
                          filteredPengumpulan.map((item, index) => (
                            <tr
                              key={item.key}
                              className="border-b border-white/5 last:border-b-0 hover:bg-white/5"
                            >
                              <td className="px-4 py-4">{index + 1}</td>
                              <td className="px-4 py-4">{item.nama}</td>
                              <td className="px-4 py-4">{item.anggotaLabel}</td>
                              <td className="px-4 py-4">{item.kelas}</td>
                              <td className="px-4 py-4">{item.lembaga}</td>
                              <td className="px-4 py-4">{item.pengumpul}</td>
                              <td className="px-4 py-4">
                                <p>{formatDisplayDateTime(item.waktu)}</p>
                                {(() => {
                                  const timing = getSubmissionTimingStatus(item.waktu, activeSintakState.waktu_selesai);
                                  if (!timing) {
                                    return null;
                                  }

                                  return <p className={`mt-1 text-xs font-semibold ${timing.className}`}>{timing.text}</p>;
                                })()}
                              </td>
                              <td className="px-4 py-4">
                                {item.submission ? (
                                  <button
                                    type="button"
                                    onClick={() => openSubmissionPreview(item.submission!)}
                                    className="inline-flex items-center gap-2 rounded-lg bg-[#0E5BFF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0B49CB]"
                                  >
                                    <FaFileAlt />
                                    Lihat File
                                  </button>
                                ) : (
                                  <span className="text-gray-400">Belum mengumpulkan</span>
                                )}
                              </td>
                              <td className="px-4 py-4 min-w-[280px]">
                                {item.submission ? (
                                  <div className="space-y-2">
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      step={1}
                                      value={getGradingDraft(item.submission).nilai}
                                      onChange={(event) => handleGradingDraftChange(item.submission!, 'nilai', event.target.value)}
                                      placeholder="Beri nilai untuk siswa"
                                      className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none transition focus:border-[#0080FF]"
                                    />
                                    <textarea
                                      value={getGradingDraft(item.submission).komentar}
                                      onChange={(event) => handleGradingDraftChange(item.submission!, 'komentar', event.target.value)}
                                      placeholder="Beri komentar untuk siswa (opsional)"
                                      rows={2}
                                      className="w-full resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none transition focus:border-[#0080FF]"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveSubmissionGrading(item.submission!)}
                                      disabled={!!savingGradingMap[item.submission.id_pengumpulan]}
                                      className="inline-flex items-center gap-2 rounded-lg bg-[#0E5BFF] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0B49CB] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      <FaSave />
                                      {savingGradingMap[item.submission.id_pengumpulan] ? 'Menyimpan...' : 'Simpan'}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                {item.submission ? (
                                  <button
                                    type="button"
                                    onClick={() => openDeleteSubmissionModal(item.submission!, item.nama)}
                                    className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
                                  >
                                    <FaTrash />
                                    Hapus File
                                  </button>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
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
                                <p className="text-xs text-gray-400">{formatDisplayDateTime(comment.created_at)}</p>
                                <p className="mt-2 text-sm leading-6 text-gray-200">{comment.isi_komentar}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleReply(comment)}
                                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 transition hover:border-[#0080FF]/50 hover:text-white"
                              >
                                <FaCommentAlt />
                                Balas
                              </button>
                              {canGuruDeleteComment(comment) && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(comment.id_komentar)}
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

      {deleteSubmissionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-[#0F1117] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
            <div className="mb-4 flex items-start gap-3">
              <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/20 text-red-300">
                <FaExclamationCircle className="text-xl" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white">Hapus File Pengumpulan?</h4>
                <p className="mt-1 text-sm text-gray-300">Tindakan ini permanen dan tidak bisa dibatalkan.</p>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-gray-200">
              <p>
                <span className="text-gray-400">Nama:</span> {deleteSubmissionTarget.nama}
              </p>
              <p className="mt-1">
                <span className="text-gray-400">Waktu Pengumpulan:</span> {formatDisplayDateTime(deleteSubmissionTarget.waktu)}
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteSubmissionModal}
                disabled={deletingSubmission}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmission}
                disabled={deletingSubmission}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaTrash />
                {deletingSubmission ? 'Menghapus...' : 'Ya, Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .card-container {
          perspective: 1000px;
          height: 320px;
        }

        .card {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1);
          will-change: transform;
          transform-style: preserve-3d;
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
