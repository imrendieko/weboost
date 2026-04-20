import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import SiswaNavbar from '@/components/SiswaNavbar';
import DataTablePagination from '@/components/DataTablePagination';
import supabase from '@/lib/db';
import { LampiranType, parseLampiran, serializeLampiran } from '@/lib/pbl';
import {
  FaArrowLeft,
  FaBook,
  FaCheck,
  FaChevronDown,
  FaChevronUp,
  FaClock,
  FaCommentAlt,
  FaDownload,
  FaEllipsisV,
  FaExclamationCircle,
  FaExternalLinkAlt,
  FaFileAlt,
  FaLink,
  FaLock,
  FaPaperPlane,
  FaProjectDiagram,
  FaSave,
  FaTrash,
  FaUser,
  FaVideo,
} from 'react-icons/fa';

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
  guru_pengampu?: number | null;
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

interface MateriSubBab {
  id_sub_bab: number;
  judul_sub_bab: string;
  tautan_konten: string;
}

interface MateriBab {
  id_bab: number;
  judul_bab: string;
  deskripsi_bab?: string;
  sub_bab?: MateriSubBab[];
}

interface MateriOverview {
  id_materi: number;
  judul_materi?: string;
  bab?: MateriBab[];
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

function buildSintakMateriTag(order: number) {
  return `[SINTAK-${order}]`;
}

function hasSintakMateriTag(judulMateri: unknown, order: number) {
  if (typeof judulMateri !== 'string') {
    return false;
  }

  return judulMateri.toUpperCase().includes(buildSintakMateriTag(order));
}

function stripSintakMateriTag(judulMateri: unknown) {
  if (typeof judulMateri !== 'string') {
    return '';
  }

  return judulMateri
    .replace(/\s*\[SINTAK-\d+\]\s*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

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

function stripUnsafeHtml(html: string) {
  const withWhitelistedDecodedTags = html.replace(/&lt;(\/?)(b|strong|i|em|u|ul|ol|li|p|br)&gt;/gi, '<$1$2>').replace(/&lt;(\/?)(span|div)&gt;/gi, '<$1$2>');

  return withWhitelistedDecodedTags.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').replace(/on\w+=['"][^'"]*['"]/gi, '');
}

export default function PBLSiswa() {
  const router = useRouter();
  const elemenQuery = router.query.elemen;
  const sintakQuery = router.query.sintak;
  const elemenId = typeof elemenQuery === 'string' ? Number(elemenQuery) : null;
  const sintakOrder = typeof sintakQuery === 'string' ? Number(sintakQuery) : null;
  const preferredSintakOrder = sintakOrder && sintakOrder >= 1 && sintakOrder <= 5 ? sintakOrder : null;

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    if (router.pathname !== '/siswa/pbl') {
      return;
    }

    router.replace({
      pathname: '/siswa/pembelajaran',
      query: router.query,
    });
  }, [router]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [siswaSession, setSiswaSession] = useState<SiswaSession | null>(null);
  const [elemenOptions, setElemenOptions] = useState<ElemenOption[]>([]);
  const [elemenName, setElemenName] = useState('');
  const [activeSintak, setActiveSintak] = useState(1);
  const [sintakState, setSintakState] = useState<ApiSintak[]>([]);
  const [notification, setNotification] = useState<NotificationState>({ show: false, type: 'success', message: '' });
  const [openCommentMenu, setOpenCommentMenu] = useState<number | null>(null);
  const [materiBySintak, setMateriBySintak] = useState<Record<number, MateriOverview | null>>({});
  const [expandedMateriBabs, setExpandedMateriBabs] = useState<number[]>([]);
  const [expandedMateriPreviews, setExpandedMateriPreviews] = useState<number[]>([]);
  const [completedBySintak, setCompletedBySintak] = useState<Record<number, Record<number, boolean>>>({});
  const [confirmCompleteSubBabId, setConfirmCompleteSubBabId] = useState<number | null>(null);
  const [currentPageSubmissionInfo, setCurrentPageSubmissionInfo] = useState(1);
  const [rowsPerPageSubmissionInfo, setRowsPerPageSubmissionInfo] = useState(10);
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
      const requestedOrder = initialOrder ?? activeSintak ?? preferredSintakOrder;
      if (requestedOrder && availableOrders.has(requestedOrder)) {
        setActiveSintak(requestedOrder);
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

  const fetchMateriOverviewBySintak = async (kelasId: number, currentElemenId: number, sintakOrder: number, guruPengampuId?: number | null): Promise<MateriOverview | null> => {
    try {
      let resolvedMateriRows: Array<any> = [];

      if (guruPengampuId) {
        const materiListResponse = await fetch(`/api/materi?id_guru=${guruPengampuId}`);
        if (materiListResponse.ok) {
          const materiList = await materiListResponse.json();
          const materiByElemen = ((materiList as Array<any>) || []).filter((item) => item.kelas_materi === currentElemenId || item.id_elemen === currentElemenId || item.elemen?.id_elemen === currentElemenId);
          resolvedMateriRows = materiByElemen.filter((item) => hasSintakMateriTag(item.judul_materi, sintakOrder));

          // Backward compatibility: old untagged materi belongs to Sintak 1.
          if (resolvedMateriRows.length === 0 && sintakOrder === 1) {
            resolvedMateriRows = materiByElemen.filter((item) => !/\[SINTAK-\d+\]/i.test(String(item.judul_materi || '')));
          }
        }
      }

      if (resolvedMateriRows.length === 0) {
        const baseQuery = supabase.from('materi').select('id_materi, judul_materi, nama_materi, guru_materi, id_elemen').eq('kelas_materi', kelasId).order('id_materi', { ascending: true });

        const materiQuery = guruPengampuId ? baseQuery.or(`id_elemen.eq.${currentElemenId},and(id_elemen.is.null,guru_materi.eq.${guruPengampuId})`) : baseQuery.eq('id_elemen', currentElemenId);

        const { data: materiRows, error: materiError } = await materiQuery;
        if (materiError) {
          return null;
        }

        const materiByElemen = (materiRows as Array<any>) || [];
        resolvedMateriRows = materiByElemen.filter((item) => hasSintakMateriTag(item.judul_materi, sintakOrder));

        if (resolvedMateriRows.length === 0 && sintakOrder === 1) {
          resolvedMateriRows = materiByElemen.filter((item) => !/\[SINTAK-\d+\]/i.test(String(item.judul_materi || '')));
        }
      }

      if (resolvedMateriRows.length === 0 && guruPengampuId) {
        const { data: fallbackRows, error: fallbackError } = await supabase.from('materi').select('id_materi, judul_materi, nama_materi').eq('guru_materi', guruPengampuId).order('id_materi', { ascending: true });

        if (fallbackError) {
          return null;
        }

        const fallbackMateriRows = (fallbackRows as Array<any>) || [];
        resolvedMateriRows = fallbackMateriRows.filter((item) => hasSintakMateriTag(item.judul_materi, sintakOrder));

        if (resolvedMateriRows.length === 0 && sintakOrder === 1) {
          resolvedMateriRows = fallbackMateriRows.filter((item) => !/\[SINTAK-\d+\]/i.test(String(item.judul_materi || '')));
        }
      }

      if (resolvedMateriRows.length === 0) {
        return null;
      }

      const materiDetails = await Promise.all(
        resolvedMateriRows.map(async (item) => {
          const response = await fetch(`/api/materi/${item.id_materi}`);
          if (!response.ok) {
            return {
              id_materi: item.id_materi,
              judul_materi: item.judul_materi || item.nama_materi || 'Materi Pembelajaran',
              bab: [] as MateriBab[],
            };
          }

          const detail = await response.json();
          return {
            id_materi: detail.id_materi,
            judul_materi: detail.judul_materi || item.judul_materi || item.nama_materi || 'Materi Pembelajaran',
            bab: Array.isArray(detail.bab) ? detail.bab : [],
          };
        }),
      );

      const selectedMateri = materiDetails.find((item) => item.bab.length > 0) || materiDetails[0];

      return {
        id_materi: selectedMateri.id_materi,
        judul_materi: stripSintakMateriTag(selectedMateri.judul_materi),
        bab: selectedMateri.bab,
      };
    } catch (error) {
      console.error('Error fetching materi overview siswa:', error);
      return null;
    }
  };

  const fetchAllMateriBySintak = async (kelasId: number, currentElemenId: number, guruPengampuId?: number | null) => {
    const entries = await Promise.all(
      [1, 2, 3, 4, 5].map(async (order) => {
        const materi = await fetchMateriOverviewBySintak(kelasId, currentElemenId, order, guruPengampuId);
        return [order, materi] as const;
      }),
    );

    setMateriBySintak(Object.fromEntries(entries));
  };

  useEffect(() => {
    // Bootstrapping siswa: cek sesi, load elemen sesuai kelas, lalu ambil data PBL elemen terpilih.
    const loadInitialData = async () => {
      try {
        const rawSession = localStorage.getItem('siswa_session');
        if (!rawSession) {
          window.location.replace('/');
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
            guru_pengampu,
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
            guru_pengampu: item.guru_pengampu,
            guru: Array.isArray(item.guru) ? item.guru[0] || null : item.guru || null,
            kelas: Array.isArray(item.kelas) ? item.kelas[0] || null : item.kelas || null,
          })),
        );

        if (elemenId) {
          // Materi diambil per sintak supaya panel belajar bisa dibuka cepat per tahap.
          const selectedElemen = ((elemenData as Array<any>) || []).find((item) => item.id_elemen === elemenId);
          await fetchPblData(session.id_siswa, elemenId, preferredSintakOrder);
          await fetchAllMateriBySintak(session.kelas_siswa, elemenId, selectedElemen?.guru_pengampu ?? null);
        } else {
          setLoading(false);
          setMateriBySintak({});
        }
      } catch (error) {
        console.error('Error loading pbl siswa:', error);
        window.location.replace('/');
      }
    };

    if (router.isReady) {
      loadInitialData();
    }
  }, [router.isReady, elemenId, preferredSintakOrder]);

  const getProgressStorageKey = (order: number) => {
    if (!siswaSession || !elemenId) {
      return '';
    }

    return `materi_selesai_${siswaSession.id_siswa}_${elemenId}_sintak_${order}`;
  };

  const materiOverview = useMemo(() => materiBySintak[activeSintak] || null, [materiBySintak, activeSintak]);
  const completedMap = useMemo(() => completedBySintak[activeSintak] || {}, [completedBySintak, activeSintak]);

  const setCompletedMap = (updater: Record<number, boolean> | ((current: Record<number, boolean>) => Record<number, boolean>)) => {
    setCompletedBySintak((current) => {
      const currentSintakMap = current[activeSintak] || {};
      const nextSintakMap = typeof updater === 'function' ? updater(currentSintakMap) : updater;
      return {
        ...current,
        [activeSintak]: nextSintakMap,
      };
    });
  };

  const syncSintakQuery = useCallback(
    (order: number) => {
      if (!router.isReady || !elemenId) {
        return;
      }

      const currentQueryOrder = typeof router.query.sintak === 'string' ? Number(router.query.sintak) : Number(Array.isArray(router.query.sintak) ? router.query.sintak[0] : null);
      if (currentQueryOrder === order) {
        return;
      }

      router.replace(
        {
          pathname: '/siswa/pembelajaran',
          query: {
            ...router.query,
            elemen: elemenId,
            sintak: order,
          },
        },
        undefined,
        { shallow: true },
      );
    },
    [router, elemenId],
  );

  const handleSintakChange = useCallback(
    (order: number) => {
      setActiveSintak(order);
      syncSintakQuery(order);
    },
    [syncSintakQuery],
  );

  const allSubBab = useMemo(() => {
    return (materiOverview?.bab || []).flatMap((bab) => bab.sub_bab || []);
  }, [materiOverview]);

  const completedCount = useMemo(() => {
    return allSubBab.filter((item) => completedMap[item.id_sub_bab]).length;
  }, [allSubBab, completedMap]);

  const subBabUnlockMap = useMemo(() => {
    const unlockedMap: Record<number, boolean> = {};
    allSubBab.forEach((subBab, index) => {
      const previousSubBabId = index > 0 ? allSubBab[index - 1].id_sub_bab : null;
      const isAlreadyCompleted = !!completedMap[subBab.id_sub_bab];
      unlockedMap[subBab.id_sub_bab] = isAlreadyCompleted || previousSubBabId === null || !!completedMap[previousSubBabId];
    });
    return unlockedMap;
  }, [allSubBab, completedMap]);

  const subBabTitleMap = useMemo(() => {
    return allSubBab.reduce(
      (acc, subBab) => {
        acc[subBab.id_sub_bab] = subBab.judul_sub_bab;
        return acc;
      },
      {} as Record<number, string>,
    );
  }, [allSubBab]);

  const progressPercent = useMemo(() => {
    if (allSubBab.length === 0) {
      return 0;
    }
    return Math.round((completedCount / allSubBab.length) * 100);
  }, [allSubBab.length, completedCount]);

  useEffect(() => {
    if (!siswaSession || !elemenId) {
      return;
    }

    const initialMap: Record<number, Record<number, boolean>> = {};
    [1, 2, 3, 4, 5].forEach((order) => {
      const storageKey = getProgressStorageKey(order);
      if (!storageKey) {
        initialMap[order] = {};
        return;
      }

      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        initialMap[order] = {};
        return;
      }

      try {
        initialMap[order] = JSON.parse(raw) as Record<number, boolean>;
      } catch {
        initialMap[order] = {};
      }
    });

    setCompletedBySintak(initialMap);
  }, [siswaSession?.id_siswa, elemenId]);

  useEffect(() => {
    if (!siswaSession || !elemenId) {
      return;
    }

    const progressStorageKey = getProgressStorageKey(activeSintak);
    if (progressStorageKey) {
      localStorage.setItem(progressStorageKey, JSON.stringify(completedMap));
    }

    fetch('/api/siswa/progres-materi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_siswa: siswaSession.id_siswa,
        email_siswa: siswaSession.email_siswa,
        kelas_siswa: siswaSession.kelas_siswa,
        sub_bab_selesai: completedCount,
        total_sub_bab: allSubBab.length,
      }),
    }).catch((error) => console.error('Error syncing progres_materi:', error));
  }, [activeSintak, completedMap, siswaSession, elemenId, completedCount, allSubBab.length]);

  const openElemenPbl = (idElemen: number, order?: number) => {
    const query = new URLSearchParams({ elemen: String(idElemen) });
    if (order) {
      query.set('sintak', String(order));
    }
    router.push(`/siswa/pembelajaran?${query.toString()}`);
  };

  const updateSintak = (order: number, updater: (current: ApiSintak) => ApiSintak) => {
    setSintakState((current) => current.map((item) => (item.order === order ? updater(item) : item)));
  };

  const activeSintakState = sintakState.find((item) => item.order === activeSintak) || null;
  const sintakLockedMap = useMemo(() => {
    const lockedMap: Record<number, boolean> = {};

    [1, 2, 3, 4, 5].forEach((order) => {
      if (order === 1) {
        lockedMap[order] = false;
        return;
      }

      let canAccess = true;

      for (let previousOrder = 1; previousOrder < order; previousOrder += 1) {
        const previousSintak = sintakState.find((sintak) => sintak.order === previousOrder);
        const previousMateri = materiBySintak[previousOrder] || null;
        const previousSubBab = (previousMateri?.bab || []).flatMap((bab) => bab.sub_bab || []);
        const previousCompletedMap = completedBySintak[previousOrder] || {};

        const previousHasMateri = previousSubBab.length > 0;
        const previousMateriDone = previousHasMateri && previousSubBab.every((subBab) => !!previousCompletedMap[subBab.id_sub_bab]);
        const previousSubmissionDone = !!previousSintak?.mySubmission;

        if (!(previousMateriDone && previousSubmissionDone)) {
          canAccess = false;
          break;
        }
      }

      lockedMap[order] = !canAccess;
    });

    return lockedMap;
  }, [sintakState, materiBySintak, completedBySintak]);

  const isActiveSintakLocked = (sintakLockedMap[activeSintak] ?? activeSintak !== 1) === true;

  useEffect(() => {
    if (!sintakState.length) {
      return;
    }

    if (!isActiveSintakLocked) {
      return;
    }

    const firstUnlocked = sintakState.find((item) => !sintakLockedMap[item.order]);
    if (firstUnlocked) {
      setActiveSintak(firstUnlocked.order);
    }
  }, [sintakState, sintakLockedMap, activeSintak, isActiveSintakLocked]);

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
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenCommentMenu(openCommentMenu === reply.id_komentar ? null : reply.id_komentar)}
                    className="comment-menu-btn inline-flex items-center justify-center rounded-lg border border-white/10 p-2 text-gray-200 transition hover:border-[#0080FF]/50 hover:text-white"
                  >
                    <FaEllipsisV />
                  </button>
                  {openCommentMenu === reply.id_komentar && (
                    <div className="absolute right-0 top-full mt-1 w-36 overflow-hidden rounded-lg border border-white/10 bg-gray-900/95 backdrop-blur-md shadow-xl z-40">
                      <button
                        type="button"
                        onClick={() => {
                          updateSintak(activeSintakState.order, (current) => ({
                            ...current,
                            replyingTo: reply,
                            commentInput: `@${reply.siswa?.nama_siswa || reply.guru?.nama_guru || 'pengguna'} `,
                          }));
                          setOpenCommentMenu(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-xs sm:text-sm text-gray-200 transition hover:bg-white/10 hover:text-white"
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
                              await fetchPblData(currentSiswaId, elemenId, activeSintak);
                            }
                            showNotification('Komentar berhasil dihapus.', 'success');
                            setOpenCommentMenu(null);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-xs sm:text-sm text-red-300 transition hover:bg-red-500/20"
                        >
                          <FaTrash className="h-4 w-4 shrink-0" />
                          Hapus
                        </button>
                      )}
                    </div>
                  )}
                </div>
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

    if (isActiveSintakLocked) {
      showNotification('Sintak ini masih terkunci. Selesaikan semua materi dan tugas sintak sebelumnya.', 'error');
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

      await fetchPblData(siswaSession.id_siswa, elemenId, activeSintak);
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

      await fetchPblData(siswaSession.id_siswa, elemenId, activeSintak);
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

  const requestCompleteSubBab = (subBabId: number) => {
    if (isActiveSintakLocked) {
      return;
    }

    if (completedMap[subBabId] || !subBabUnlockMap[subBabId]) {
      return;
    }
    setConfirmCompleteSubBabId(subBabId);
  };

  const confirmCompleteSubBab = () => {
    if (!confirmCompleteSubBabId) {
      return;
    }

    const targetSubBabId = confirmCompleteSubBabId;
    setCompletedMap((current) => {
      if (current[targetSubBabId]) {
        return current;
      }
      return {
        ...current,
        [targetSubBabId]: true,
      };
    });

    setConfirmCompleteSubBabId(null);
  };

  const getFileTypeFromUrl = (tautanKonten: string): 'dokumen' | 'video' | 'tautan' => {
    const parts = tautanKonten.split('|');
    if (parts.length >= 3) {
      const explicitType = parts[0] as 'dokumen' | 'video' | 'tautan';
      if (explicitType === 'dokumen' || explicitType === 'video' || explicitType === 'tautan') {
        return explicitType;
      }
    }

    const lowered = tautanKonten.toLowerCase();
    if (lowered.includes('youtube.com') || lowered.includes('youtu.be') || lowered.match(/\.(mp4|mov|avi|webm)$/)) {
      return 'video';
    }

    if (lowered.match(/\.(pdf|doc|docx|ppt|pptx|xls|xlsx)$/)) {
      return 'dokumen';
    }

    return 'tautan';
  };

  const getFileUrlFromContent = (tautanKonten: string): string => {
    const parts = tautanKonten.split('|');
    if (parts.length >= 3) {
      return parts.slice(2).join('|') || '';
    }
    return tautanKonten;
  };

  const getDescriptionFromContent = (tautanKonten: string): string => {
    const parts = tautanKonten.split('|');
    if (parts.length >= 3) {
      return parts[1] || '';
    }
    return '';
  };

  const convertYouTubeUrl = (url: string): string => {
    if (url.includes('youtube.com/watch')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('Gagal mengunduh file');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const InlineFilePreview = ({ subBab }: { subBab: MateriSubBab }) => {
    const [previewHeight, setPreviewHeight] = useState('400px');

    useEffect(() => {
      const handleResize = () => {
        if (window.innerWidth < 640) {
          setPreviewHeight('350px');
        } else if (window.innerWidth < 1024) {
          setPreviewHeight('450px');
        } else {
          setPreviewHeight('600px');
        }
      };

      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fileType = getFileTypeFromUrl(subBab.tautan_konten);
    const fileUrl = getFileUrlFromContent(subBab.tautan_konten);
    const description = getDescriptionFromContent(subBab.tautan_konten);

    const getFileExtension = (url: string): string => {
      const match = url.match(/\.([^.]+)$/);
      return match ? match[1].toLowerCase() : '';
    };

    const getFileName = (url: string): string => {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const fileName = pathname.split('/').pop() || 'file';
        return decodeURIComponent(fileName);
      } catch {
        return `${subBab.judul_sub_bab}.${getFileExtension(url)}`;
      }
    };

    const extension = getFileExtension(fileUrl);
    const isOfficeDocument = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension);

    let previewUrl: string;
    if (fileUrl.includes('drive.google.com') || fileUrl.includes('docs.google.com')) {
      const fileIdMatch = fileUrl.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
      if (fileIdMatch) {
        previewUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
      } else {
        previewUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
      }
    } else if (extension === 'pdf') {
      previewUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
    } else if (isOfficeDocument) {
      previewUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
    } else {
      previewUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
    }

    return (
      <div className="mt-3 border-t border-white/10 pt-3">
        {description && (
          <div
            className="materi-richtext mb-3 text-sm leading-6 text-gray-300"
            dangerouslySetInnerHTML={{ __html: stripUnsafeHtml(description) }}
          />
        )}
        <div className="overflow-hidden rounded-lg bg-gray-800">
          {fileType === 'dokumen' && (
            <div
              className="w-full bg-black/70"
              style={{ height: previewHeight }}
            >
              <iframe
                src={previewUrl}
                className="h-full w-full"
                title={subBab.judul_sub_bab}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation allow-top-navigation-by-user-activation"
              />
            </div>
          )}
          {fileType === 'video' && (
            <div
              className="w-full bg-black/70"
              style={{ height: previewHeight }}
            >
              {fileUrl.includes('youtube.com') || fileUrl.includes('youtu.be') ? (
                <iframe
                  src={convertYouTubeUrl(fileUrl)}
                  className="h-full w-full"
                  title={subBab.judul_sub_bab}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"
                />
              ) : (
                <video
                  src={fileUrl}
                  controls
                  className="h-full w-full"
                />
              )}
            </div>
          )}
          {fileType === 'tautan' && (
            <div className="p-6 text-center">
              <FaLink className="mx-auto mb-4 text-5xl text-blue-400" />
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-5 block break-all text-sm text-blue-400 hover:underline"
              >
                {fileUrl}
              </a>
              <div className="flex flex-col justify-center gap-2 sm:flex-row">
                <button
                  onClick={() => handleDownloadFile(fileUrl, getFileName(fileUrl))}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-green-700"
                >
                  <FaDownload /> Download
                </button>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  <FaExternalLinkAlt /> Buka di Tab Baru
                </a>
              </div>
            </div>
          )}
        </div>

        {fileType !== 'tautan' && (
          <div className="mt-3 flex flex-col flex-wrap gap-2 sm:flex-row">
            <button
              onClick={() => handleDownloadFile(fileUrl, getFileName(fileUrl))}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
            >
              <FaDownload /> Download
            </button>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <FaExternalLinkAlt /> Buka di Tab Baru
            </a>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="pbl-theme-scope siswa-materi-page min-h-screen bg-black text-white relative overflow-hidden">
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
            <CountdownTimer showDate={false} />
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
                Pilih Elemen Pembelajaran
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
                className="mb-6 flex items-center gap-2 rounded-lg border border-white/10 bg-gray-800/50 px-3 sm:px-4 py-1.5 sm:py-2 text-gray-300 transition-all hover:bg-gray-700/50 hover:text-white"
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
                {sintakState.map((item) => {
                  const isLocked = (sintakLockedMap[item.order] ?? item.order !== 1) === true;

                  return (
                    <button
                      key={item.order}
                      type="button"
                      onClick={() => {
                        if (isLocked) {
                          showNotification(`Sintak ${item.order} terkunci. Selesaikan semua materi dan tugas pada sintak sebelumnya terlebih dahulu.`, 'error');
                          return;
                        }
                        handleSintakChange(item.order);
                      }}
                      disabled={isLocked}
                      className={`rounded-xl px-4 py-4 text-center text-sm font-semibold transition-all ${
                        isLocked
                          ? 'cursor-not-allowed border border-amber-300/60 bg-amber-100/90 text-amber-900'
                          : item.order === activeSintak
                            ? 'bg-[#0E5BFF] text-white shadow-[0_12px_30px_rgba(14,91,255,0.35)]'
                            : 'bg-white text-black hover:bg-white/90'
                      }`}
                    >
                      {isLocked ? `Sintak ${item.order} (Terkunci)` : `Sintak ${item.order}`}
                    </button>
                  );
                })}
              </div>

              {isActiveSintakLocked && (
                <div className="mb-6 rounded-xl border border-amber-400 bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900 shadow-sm">
                  Sintak ini terkunci. Pastikan seluruh materi dan seluruh tugas pada sintak sebelumnya sudah benar-benar selesai.
                </div>
              )}

              <h3 className="mb-6 text-2xl font-bold">{activeSintakState.title}</h3>

              <div className="space-y-6">
                <section className="materi-sintak-panel materi-lms-panel materi-modern-panel rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur-xl">
                  <div className="materi-panel-head mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="flex items-center gap-2 text-xl font-bold">
                      <FaBook className="text-white" />
                      {materiOverview?.judul_materi || `Materi ${elemenName}`}
                    </h3>
                  </div>

                  <div className="materi-progress-card materi-progress-card--clean mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="materi-progress-label text-sm text-gray-300">Progres Baca Materi</span>
                      <span
                        className={`materi-progress-value inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold ${
                          progressPercent === 0 ? 'is-zero border-amber-400/70 bg-amber-100 text-amber-800' : 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                        }`}
                      >
                        {progressPercent}%
                      </span>
                    </div>
                    <div className="materi-progress-track mt-3 h-3 w-full rounded-full bg-black/30">
                      <div
                        className="materi-progress-fill h-full rounded-full bg-green-600 transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="materi-progress-meta mt-2 text-sm text-gray-400">
                      {completedCount} dari {allSubBab.length} sub-bab selesai
                    </p>
                  </div>

                  {!materiOverview?.bab || materiOverview.bab.length === 0 ? (
                    <div className="materi-empty-state rounded-2xl border border-white/10 bg-black/25 px-4 py-6 text-center text-gray-300">Belum ada BAB untuk materi ini.</div>
                  ) : (
                    <div className="materi-list-stack space-y-4">
                      {materiOverview.bab.map((bab, index) => {
                        const isExpanded = expandedMateriBabs.includes(bab.id_bab);
                        const firstSubBabId = bab.sub_bab?.[0]?.id_sub_bab;
                        const isBabUnlocked = !firstSubBabId || !!subBabUnlockMap[firstSubBabId] || (bab.sub_bab || []).some((subBab) => !!completedMap[subBab.id_sub_bab]);
                        return (
                          <div
                            key={bab.id_bab}
                            className={`materi-bab-card overflow-hidden rounded-lg border border-white/10 bg-gray-900/50 backdrop-blur-sm ${!isBabUnlocked ? 'opacity-70' : ''}`}
                          >
                            <div className="overflow-visible p-3 sm:p-6">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isBabUnlocked) {
                                    return;
                                  }
                                  setExpandedMateriBabs((current) => (current.includes(bab.id_bab) ? current.filter((id) => id !== bab.id_bab) : [...current, bab.id_bab]));
                                }}
                                disabled={!isBabUnlocked}
                                className="materi-bab-toggle flex w-full items-start gap-2 sm:gap-3 pl-2 sm:pl-3 pr-1 text-left"
                              >
                                <span className="mt-0.5 shrink-0 text-white">{!isBabUnlocked ? <FaLock className="text-amber-300" /> : isExpanded ? <FaChevronUp className="text-white" /> : <FaChevronDown className="text-white" />}</span>
                                <div className="min-w-0">
                                  <h4 className="text-base font-bold text-white break-words sm:text-xl sm:truncate">
                                    Bab {index + 1}: {bab.judul_bab}
                                  </h4>
                                  {bab.deskripsi_bab ? (
                                    <div
                                      className="materi-richtext mt-1 text-sm sm:ml-0 leading-7 text-gray-300"
                                      dangerouslySetInnerHTML={{ __html: stripUnsafeHtml(bab.deskripsi_bab) }}
                                    />
                                  ) : (
                                    <p className="mt-1 text-sm text-gray-400">Belum ada deskripsi bab.</p>
                                  )}
                                  {!isBabUnlocked && <p className="materi-lock-note mt-2 text-xs text-amber-300">Bab ini terkunci. Selesaikan sub-bab sebelumnya untuk membuka.</p>}
                                </div>
                              </button>

                              {isExpanded && (
                                <div className="mt-4 space-y-2 sm:ml-9">
                                  {bab.sub_bab && bab.sub_bab.length > 0 ? (
                                    bab.sub_bab.map((subBab) => {
                                      const selesai = !!completedMap[subBab.id_sub_bab];
                                      const isUnlocked = !!subBabUnlockMap[subBab.id_sub_bab];
                                      const canOpen = selesai || isUnlocked;

                                      return (
                                        <div
                                          key={subBab.id_sub_bab}
                                          className={`materi-subbab-card materi-subbab-row overflow-hidden rounded-lg border border-white/10 bg-gray-800/50 ${!isUnlocked && !selesai ? 'opacity-70' : ''}`}
                                        >
                                          <div className="materi-subbab-head flex items-center justify-between gap-2 p-3 sm:p-4">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (!canOpen) {
                                                  return;
                                                }
                                                setExpandedMateriPreviews((current) => (current.includes(subBab.id_sub_bab) ? current.filter((id) => id !== subBab.id_sub_bab) : [...current, subBab.id_sub_bab]));
                                              }}
                                              className="materi-subbab-toggle flex min-w-0 flex-1 items-center gap-2 sm:gap-3 pl-2 sm:pl-3 pr-1 text-left"
                                            >
                                              <span className="shrink-0 text-white">
                                                {!canOpen ? <FaLock className="text-amber-300" /> : expandedMateriPreviews.includes(subBab.id_sub_bab) ? <FaChevronUp className="text-white" /> : <FaChevronDown className="text-white" />}
                                              </span>
                                              {getFileTypeFromUrl(subBab.tautan_konten) === 'dokumen' && <FaFileAlt className="text-blue-400" />}
                                              {getFileTypeFromUrl(subBab.tautan_konten) === 'video' && <FaVideo className="text-red-400" />}
                                              {getFileTypeFromUrl(subBab.tautan_konten) === 'tautan' && <FaLink className="text-green-400" />}
                                              <p className="text-base font-bold text-white break-words sm:text-xl sm:truncate">{subBab.judul_sub_bab}</p>
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => requestCompleteSubBab(subBab.id_sub_bab)}
                                              disabled={selesai || !isUnlocked}
                                              className={`inline-flex items-center gap-2 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition ${
                                                selesai
                                                  ? 'border border-emerald-600 bg-emerald-600 text-white shadow-[0_0_0_1px_rgba(16,185,129,0.35)]'
                                                  : !isUnlocked
                                                    ? 'cursor-not-allowed border border-gray-400/40 bg-gray-300/40 text-gray-500'
                                                    : 'mana-btn mana-btn--primary'
                                              }`}
                                            >
                                              <FaCheck />
                                              {selesai ? 'Sudah Selesai' : !isUnlocked ? 'Terkunci' : 'Tandai Selesai'}
                                            </button>
                                          </div>

                                          {!isUnlocked && !selesai && <p className="materi-lock-note px-3 pb-2 text-xs text-amber-300">Sub-bab ini terkunci. Selesaikan sub-bab sebelumnya untuk membuka.</p>}

                                          {expandedMateriPreviews.includes(subBab.id_sub_bab) && canOpen && (
                                            <div className="px-2 sm:px-3 md:px-4 pb-2 sm:pb-3 md:pb-4">
                                              <InlineFilePreview subBab={subBab} />
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <p className="text-sm text-gray-500">Belum ada sub-bab.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

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
                              className="inline-flex items-center gap-2 rounded-lg bg-[#0E5BFF] px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white transition hover:bg-[#0B49CB]"
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

                      <div className="overflow-x-auto rounded-xl border border-white/10">
                        <table className="w-full min-w-[560px] border-collapse table-fixed text-xs sm:text-sm">
                          <tbody>
                            <tr className="border-b border-white/10">
                              <th className="w-[42%] sm:w-1/3 bg-white/10 px-2 sm:px-4 py-3 text-left align-top font-semibold text-white">Status Pengumpulan</th>
                              <td className="bg-emerald-500/15 px-2 sm:px-4 py-3 break-words text-emerald-200 font-medium">Sudah dikumpulkan</td>
                            </tr>
                            <tr className="border-b border-white/10">
                              <th className="bg-white/10 px-2 sm:px-4 py-3 text-left align-top font-semibold text-white">Status Penilaian</th>
                              <td className="px-2 sm:px-4 py-3 break-words text-gray-100">
                                {activeSintakState.mySubmission.nilai_pbl !== null && activeSintakState.mySubmission.nilai_pbl !== undefined ? `Sudah dinilai (${activeSintakState.mySubmission.nilai_pbl})` : 'Belum dinilai'}
                              </td>
                            </tr>
                            <tr className="border-b border-white/10">
                              <th className="bg-white/10 px-2 sm:px-4 py-3 text-left align-top font-semibold text-white">Keterangan Waktu</th>
                              <td className={`px-2 sm:px-4 py-3 break-words ${submissionTimingStatus?.className || 'text-gray-100'}`}>{submissionTimingStatus?.text || '-'}</td>
                            </tr>
                            <tr className="border-b border-white/10">
                              <th className="bg-white/10 px-2 sm:px-4 py-3 text-left align-top font-semibold text-white">Terakhir Diubah</th>
                              <td className="px-2 sm:px-4 py-3 break-words text-gray-100">{formatDateTimeForDisplay(activeSintakState.mySubmission.waktu_pengumpulan)}</td>
                            </tr>
                            <tr className="border-b border-white/10">
                              <th className="bg-white/10 px-2 sm:px-4 py-3 text-left align-top font-semibold text-white">File Pengumpulan</th>
                              <td className="px-2 sm:px-4 py-3 text-gray-100">
                                <button
                                  type="button"
                                  onClick={() => openSubmissionPreview(activeSintakState.mySubmission!.file_pengumpulan)}
                                  className="inline-flex max-w-[180px] sm:max-w-full items-center gap-2 rounded-lg border border-[#1D4ED8] bg-[#2563EB] px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] transition hover:bg-[#1D4ED8]"
                                >
                                  <FaFileAlt />
                                  <span className="truncate">{parsedSubmissionFile?.label || 'Lihat File Pengumpulan'}</span>
                                </button>
                              </td>
                            </tr>
                            <tr>
                              <th className="bg-white/10 px-2 sm:px-4 py-3 text-left align-top font-semibold text-white">Komentar Guru</th>
                              <td className="px-2 sm:px-4 py-3 break-words text-gray-100">{activeSintakState.mySubmission.komentar_pbl?.trim() ? activeSintakState.mySubmission.komentar_pbl : 'Tidak ada komentar'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <DataTablePagination
                        totalItems={1}
                        currentPage={currentPageSubmissionInfo}
                        rowsPerPage={rowsPerPageSubmissionInfo}
                        onPageChange={setCurrentPageSubmissionInfo}
                        onRowsPerPageChange={setRowsPerPageSubmissionInfo}
                      />
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
                              className={`flex items-center justify-center gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-3 transition-all ${activeSintakState.draftType === option.key ? 'bg-[#0E5BFF] text-white' : 'text-black/70 hover:bg-black/5'}`}
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
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setOpenCommentMenu(openCommentMenu === comment.id_komentar ? null : comment.id_komentar)}
                                  className="comment-menu-btn inline-flex items-center justify-center rounded-lg border border-white/10 p-2 text-gray-200 transition hover:border-[#0080FF]/50 hover:text-white"
                                >
                                  <FaEllipsisV />
                                </button>
                                {openCommentMenu === comment.id_komentar && (
                                  <div className="absolute right-0 top-full mt-1 w-36 overflow-hidden rounded-lg border border-white/10 bg-gray-900/95 backdrop-blur-md shadow-xl z-40">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateSintak(activeSintakState.order, (current) => ({
                                          ...current,
                                          replyingTo: comment,
                                          commentInput: `@${comment.siswa?.nama_siswa || comment.guru?.nama_guru || 'pengguna'} `,
                                        }));
                                        setOpenCommentMenu(null);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-gray-200 transition hover:bg-white/10 hover:text-white"
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
                                            await fetchPblData(currentSiswaId, elemenId, activeSintak);
                                          }
                                          showNotification('Komentar berhasil dihapus.', 'success');
                                          setOpenCommentMenu(null);
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-red-300 transition hover:bg-red-500/20"
                                      >
                                        <FaTrash className="h-4 w-4 shrink-0" />
                                        Hapus
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {renderReplyThread(comment.id_komentar)}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 p-3">
                    {activeSintakState.replyingTo && (
                      <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-[#0080FF]/30 bg-[#0080FF]/10 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-[#c9e0ff]">
                        <span className="break-words">Membalas komentar {activeSintakState.replyingTo.siswa?.nama_siswa || activeSintakState.replyingTo.guru?.nama_guru || 'pengguna'}</span>
                        <button
                          type="button"
                          onClick={() => updateSintak(activeSintakState.order, (current) => ({ ...current, replyingTo: null, commentInput: '' }))}
                          className="text-white/80 transition hover:text-white font-medium whitespace-nowrap"
                        >
                          Batal
                        </button>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                      <div className="hidden sm:flex h-10 sm:h-12 items-center justify-center flex-shrink-0 text-gray-400">
                        <FaCommentAlt className="text-base" />
                      </div>
                      <input
                        type="text"
                        value={activeSintakState.commentInput}
                        onChange={(event) => updateSintak(activeSintakState.order, (current) => ({ ...current, commentInput: event.target.value }))}
                        placeholder="Tambahkan komentar..."
                        className="flex-1 rounded-xl border border-transparent bg-transparent px-3 py-2 sm:py-3 text-sm text-white outline-none placeholder:text-gray-500"
                      />
                      <button
                        type="button"
                        onClick={handleSubmitComment}
                        disabled={commentSubmitting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#0E5BFF] px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-white transition hover:bg-[#0B49CB] disabled:cursor-not-allowed disabled:opacity-60 flex-shrink-0"
                      >
                        <FaPaperPlane className="text-xs sm:text-sm" />
                        <span>Kirim</span>
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

      {confirmCompleteSubBabId && (
        <div
          className="materi-complete-modal-overlay fixed inset-0 z-[120] flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="materi-confirm-title"
        >
          <div className="materi-complete-modal w-full max-w-md rounded-2xl border border-slate-300 bg-white p-6 shadow-2xl">
            <h3
              id="materi-confirm-title"
              className="materi-complete-modal-title text-xl font-bold text-slate-900"
            >
              Konfirmasi Tandai Selesai
            </h3>
            <p className="materi-complete-modal-text mt-3 text-sm text-slate-900">Setelah ditandai selesai, status sub-bab tidak bisa dibatalkan.</p>
            <p className="materi-complete-modal-subject mt-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900">{subBabTitleMap[confirmCompleteSubBabId] || 'Sub-bab ini'}</p>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmCompleteSubBabId(null)}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmCompleteSubBab}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
              >
                <FaCheck /> Ya, Tandai Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
