import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import SiswaNavbar from '@/components/SiswaNavbar';
import supabase from '@/lib/db';
import { FaArrowLeft, FaBook, FaCheck, FaChevronDown, FaChevronUp, FaDownload, FaExternalLinkAlt, FaFileAlt, FaLink, FaProjectDiagram, FaVideo } from 'react-icons/fa';

interface SiswaSession {
  id_siswa: number;
  nama_siswa: string;
  email_siswa: string;
  kelas_siswa: number;
  lembaga_siswa: number;
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

interface SubBab {
  id_sub_bab: number;
  judul_sub_bab: string;
  tautan_konten: string;
}

interface Bab {
  id_bab: number;
  judul_bab: string;
  deskripsi_bab: string;
  sub_bab: SubBab[];
}

interface MateriItem {
  id_materi: number;
  judul_materi?: string;
  nama_materi?: string;
  deskripsi_materi: string;
  elemen?: {
    nama_elemen: string;
    sampul_elemen?: string;
  } | null;
  kelas?: {
    nama_kelas: string;
  } | null;
  guru?: {
    nama_guru: string;
  } | null;
  bab: Bab[];
}

function getCurrentDate() {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const now = new Date();
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function parseKontenValue(rawValue: string) {
  const parts = rawValue.split('|');
  if (parts.length >= 3) {
    return {
      type: parts[0] as 'dokumen' | 'video' | 'tautan',
      description: parts[1] || '',
      url: parts.slice(2).join('|'),
    };
  }

  const lowered = rawValue.toLowerCase();
  if (lowered.includes('youtube.com') || lowered.includes('youtu.be') || lowered.match(/\.(mp4|mov|avi|webm)$/)) {
    return { type: 'video' as const, description: '', url: rawValue };
  }

  if (lowered.match(/\.(pdf|doc|docx|ppt|pptx|xls|xlsx)$/)) {
    return { type: 'dokumen' as const, description: '', url: rawValue };
  }

  return { type: 'tautan' as const, description: '', url: rawValue };
}

function convertYouTubeUrl(url: string): string {
  if (url.includes('youtube.com/watch')) {
    const videoId = url.split('v=')[1]?.split('&')[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  return url;
}

function getFileNameFromUrl(url: string, fallback: string) {
  try {
    const parsed = new URL(url);
    const fileName = parsed.pathname.split('/').pop();
    return fileName ? decodeURIComponent(fileName) : fallback;
  } catch {
    return fallback;
  }
}

const OFFICE_VIEWER_EXTENSIONS = new Set(['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']);

function extractGoogleDriveFileId(url: string): string | null {
  // Pattern 1: /file/d/FILE_ID/view
  const pattern1 = /\/file\/d\/([a-zA-Z0-9-_]+)/;
  const match1 = url.match(pattern1);
  if (match1) return match1[1];

  // Pattern 2: ?id=FILE_ID
  const pattern2 = /[?&]id=([a-zA-Z0-9-_]+)/;
  const match2 = url.match(pattern2);
  if (match2) return match2[1];

  // Pattern 3: /open?id=FILE_ID in sharing URLs
  const pattern3 = /\/open\?id=([a-zA-Z0-9-_]+)/;
  const match3 = url.match(pattern3);
  if (match3) return match3[1];

  return null;
}

function isGoogleDriveUrl(url: string): boolean {
  return url.includes('drive.google.com') || url.includes('docs.google.com');
}

function getDocumentPreviewUrl(url: string): string {
  // Check if it's a Google Drive URL
  if (isGoogleDriveUrl(url)) {
    const fileId = extractGoogleDriveFileId(url);
    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
  }

  const match = url.toLowerCase().match(/\.([^.?#]+)(?:[?#].*)?$/);
  const extension = match ? match[1] : '';

  if (extension === 'pdf') {
    // Wrap PDF URLs with Google Docs Viewer for better compatibility
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  }

  if (OFFICE_VIEWER_EXTENSIONS.has(extension)) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  }

  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
}

export default function MateriSiswa() {
  const router = useRouter();
  const elemenQuery = router.query.elemen;
  const elemenId = typeof elemenQuery === 'string' ? Number(elemenQuery) : null;

  const [loading, setLoading] = useState(true);
  const [siswaSession, setSiswaSession] = useState<SiswaSession | null>(null);
  const [elemenOptions, setElemenOptions] = useState<ElemenOption[]>([]);
  const [elemenBabPreviewMap, setElemenBabPreviewMap] = useState<Record<number, string[]>>({});
  const [materiList, setMateriList] = useState<MateriItem[]>([]);
  const [elemenName, setElemenName] = useState('');
  const [expandedBabIds, setExpandedBabIds] = useState<number[]>([]);
  const [collapsedSubBabIds, setCollapsedSubBabIds] = useState<number[]>([]);
  const [completedMap, setCompletedMap] = useState<Record<number, boolean>>({});
  const [activeCelebrationSubBab, setActiveCelebrationSubBab] = useState<number | null>(null);
  const [iframeErrors, setIframeErrors] = useState<Record<string, boolean>>({});

  const progressStorageKey = useMemo(() => {
    if (!siswaSession || !elemenId) {
      return '';
    }
    return `materi_selesai_${siswaSession.id_siswa}_${elemenId}`;
  }, [siswaSession, elemenId]);

  const allSubBab = useMemo(() => {
    return materiList.flatMap((materi) => materi.bab.flatMap((bab) => bab.sub_bab));
  }, [materiList]);

  const completedCount = useMemo(() => {
    return allSubBab.filter((item) => completedMap[item.id_sub_bab]).length;
  }, [allSubBab, completedMap]);

  const progressPercent = useMemo(() => {
    if (allSubBab.length === 0) {
      return 0;
    }
    return Math.round((completedCount / allSubBab.length) * 100);
  }, [allSubBab.length, completedCount]);

  useEffect(() => {
    if (!progressStorageKey) {
      return;
    }

    const raw = localStorage.getItem(progressStorageKey);
    if (!raw) {
      setCompletedMap({});
      return;
    }

    try {
      setCompletedMap(JSON.parse(raw));
    } catch {
      setCompletedMap({});
    }
  }, [progressStorageKey]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const rawSession = localStorage.getItem('siswa_session');
        if (!rawSession) {
          router.push('/login');
          return;
        }

        const session = JSON.parse(rawSession) as SiswaSession;
        setSiswaSession(session);

        const { data: elemenData, error: elemenError } = await supabase
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

        if (!elemenError) {
          const elemenRows = (elemenData as Array<any>) || [];
          const elemenIds = elemenRows.map((item) => item.id_elemen);
          const guruIds = Array.from(new Set(elemenRows.map((item) => item.guru_pengampu).filter((id): id is number => typeof id === 'number')));

          let guruNameMap: Record<number, string> = {};
          if (guruIds.length > 0) {
            const { data: guruRows } = await supabase.from('guru').select('id_guru,nama_guru').in('id_guru', guruIds);

            guruNameMap = Object.fromEntries(((guruRows as Array<any>) || []).map((guru) => [guru.id_guru, guru.nama_guru]));
          }

          let guruNameByElemenMap: Record<number, string> = {};
          if (elemenIds.length > 0) {
            const { data: materiGuruRows } = await supabase
              .from('materi')
              .select(
                `
                id_elemen,
                guru:guru_materi (
                  nama_guru
                )
              `,
              )
              .eq('kelas_materi', session.kelas_siswa)
              .in('id_elemen', elemenIds)
              .order('id_materi', { ascending: true });

            guruNameByElemenMap = ((materiGuruRows as Array<any>) || []).reduce((acc: Record<number, string>, row: any) => {
              const elemenKey = row.id_elemen;
              const guruRel = Array.isArray(row.guru) ? row.guru[0] || null : row.guru || null;
              const guruName = guruRel?.nama_guru;
              if (typeof elemenKey === 'number' && guruName && !acc[elemenKey]) {
                acc[elemenKey] = guruName;
              }
              return acc;
            }, {});
          }

          setElemenOptions(
            elemenRows.map((item) => ({
              id_elemen: item.id_elemen,
              nama_elemen: item.nama_elemen,
              sampul_elemen: item.sampul_elemen,
              guru_pengampu: item.guru_pengampu,
              guru: (() => {
                const relGuru = Array.isArray(item.guru) ? item.guru[0] || null : item.guru || null;
                if (relGuru?.nama_guru) {
                  return relGuru;
                }

                if (typeof item.guru_pengampu === 'number' && guruNameMap[item.guru_pengampu]) {
                  return { nama_guru: guruNameMap[item.guru_pengampu] };
                }

                if (guruNameByElemenMap[item.id_elemen]) {
                  return { nama_guru: guruNameByElemenMap[item.id_elemen] };
                }

                return null;
              })(),
              kelas: Array.isArray(item.kelas) ? item.kelas[0] || null : item.kelas || null,
            })),
          );

          const previewEntries = await Promise.all(
            elemenRows.map(async (item) => {
              try {
                const { data: materiRows, error: materiError } = await supabase.from('materi').select('id_materi').eq('kelas_materi', session.kelas_siswa).eq('id_elemen', item.id_elemen).order('id_materi', { ascending: true }).limit(1);

                if (materiError || !materiRows || materiRows.length === 0) {
                  return [item.id_elemen, [] as string[]] as const;
                }

                const response = await fetch(`/api/materi/${materiRows[0].id_materi}`);
                if (!response.ok) {
                  return [item.id_elemen, [] as string[]] as const;
                }

                const detail = await response.json();
                const babTitles = (detail?.bab || []).map((bab: Bab) => bab.judul_bab).filter((title: string) => title && title.trim().length > 0);
                return [item.id_elemen, babTitles] as const;
              } catch {
                return [item.id_elemen, [] as string[]] as const;
              }
            }),
          );

          setElemenBabPreviewMap(Object.fromEntries(previewEntries));
        }

        if (elemenId) {
          const selectedElemen = ((elemenData as Array<any>) || []).find((item) => item.id_elemen === elemenId);

          // Primary filter: id_elemen + kelas. Fallback: materi kelas yang dibuat guru pengampu elemen.
          const baseQuery = supabase
            .from('materi')
            .select(
              `
              *,
              elemen:id_elemen (
                nama_elemen,
                sampul_elemen
              ),
              kelas:kelas_materi (
                nama_kelas
              ),
              guru:guru_materi (
                nama_guru
              )
            `,
            )
            .eq('kelas_materi', session.kelas_siswa)
            .order('id_materi', { ascending: true });

          const materiQuery = selectedElemen?.guru_pengampu ? baseQuery.or(`id_elemen.eq.${elemenId},and(id_elemen.is.null,guru_materi.eq.${selectedElemen.guru_pengampu})`) : baseQuery.eq('id_elemen', elemenId);

          const { data: materiRows, error: materiError } = await materiQuery;

          if (materiError) {
            throw new Error(materiError.message);
          }

          let resolvedMateriRows = (materiRows as Array<any>) || [];

          if (resolvedMateriRows.length === 0 && selectedElemen?.guru_pengampu) {
            const { data: fallbackRows, error: fallbackError } = await supabase
              .from('materi')
              .select(
                `
                *,
                elemen:id_elemen (
                  nama_elemen,
                  sampul_elemen
                ),
                kelas:kelas_materi (
                  nama_kelas
                ),
                guru:guru_materi (
                  nama_guru
                )
              `,
              )
              .eq('guru_materi', selectedElemen.guru_pengampu)
              .order('id_materi', { ascending: true });

            if (fallbackError) {
              throw new Error(fallbackError.message);
            }

            resolvedMateriRows = (fallbackRows as Array<any>) || [];
          }

          const details = await Promise.all(
            resolvedMateriRows.map(async (item) => {
              const response = await fetch(`/api/materi/${item.id_materi}`);
              const detail = await response.json();
              const judulMateri = typeof item.judul_materi === 'string' ? item.judul_materi : '';
              const namaMateri = typeof item.nama_materi === 'string' ? item.nama_materi : '';
              return {
                id_materi: item.id_materi,
                judul_materi: judulMateri,
                nama_materi: namaMateri,
                deskripsi_materi: item.deskripsi_materi || '',
                elemen: item.elemen,
                kelas: Array.isArray(item.kelas) ? item.kelas[0] || null : item.kelas || null,
                guru: Array.isArray(item.guru) ? item.guru[0] || null : item.guru || null,
                bab: detail.bab || [],
              } as MateriItem;
            }),
          );

          setMateriList(details);
          setCollapsedSubBabIds(details.flatMap((materi) => materi.bab.flatMap((bab) => bab.sub_bab.map((subBab) => subBab.id_sub_bab))));
          setElemenName(details[0]?.elemen?.nama_elemen || selectedElemen?.nama_elemen || 'Materi');
        }
      } catch (error) {
        console.error('Error loading materi siswa:', error);
      } finally {
        setLoading(false);
      }
    };

    if (router.isReady) {
      loadData();
    }
  }, [router.isReady, elemenId]);

  useEffect(() => {
    if (!progressStorageKey || !siswaSession || !elemenId) {
      return;
    }

    localStorage.setItem(progressStorageKey, JSON.stringify(completedMap));

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
  }, [progressStorageKey, completedMap, siswaSession, elemenId, completedCount, allSubBab.length]);

  const toggleSelesai = (subBabId: number) => {
    const nextValue = !completedMap[subBabId];
    setCompletedMap((current) => ({
      ...current,
      [subBabId]: !current[subBabId],
    }));

    if (nextValue) {
      setActiveCelebrationSubBab(null);
      window.setTimeout(() => {
        setActiveCelebrationSubBab(subBabId);
      }, 0);
      window.setTimeout(() => {
        setActiveCelebrationSubBab((current) => (current === subBabId ? null : current));
      }, 900);
    }
  };

  const toggleSubBabCard = (subBabId: number) => {
    setCollapsedSubBabIds((current) => (current.includes(subBabId) ? current.filter((id) => id !== subBabId) : [...current, subBabId]));
  };

  const handleDownloadFile = async (url: string, fallbackName: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Gagal mengunduh file');
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = getFileNameFromUrl(url, fallbackName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      window.open(url, '_blank', 'noopener,noreferrer');
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

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <StarBackground />
      <SiswaNavbar siswaName={siswaSession.nama_siswa} />

      <div className="relative z-10 pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Selamat Datang, <span className="text-[#FFFFFF]">{siswaSession.nama_siswa.split(' ')[0]}!</span>
              </h1>
              <p className="text-gray-400">{getCurrentDate()}</p>
            </div>
            <CountdownTimer showDate={false} />
          </div>

          {!elemenId ? (
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <FaBook className="text-white" />
                Pilih Elemen Materi
              </h2>

              {elemenOptions.length === 0 ? (
                <p className="text-gray-400">Belum ada elemen materi pada kelas Anda.</p>
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
                          onClick={() => router.push(`/siswa/materi?elemen=${option.id_elemen}`)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              router.push(`/siswa/materi?elemen=${option.id_elemen}`);
                            }
                          }}
                        >
                          <div className="relative h-48 w-full bg-gray-900 pointer-events-none">
                            {option.sampul_elemen ? (
                              <Image
                                src={option.sampul_elemen}
                                alt={option.nama_elemen}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                                <div className="text-6xl">📚</div>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                          </div>
                          <div className="p-4 pointer-events-none">
                            <h3 className="text-xl font-bold text-white">{option.nama_elemen}</h3>
                            <p className="text-gray-400 text-sm mt-1">{option.kelas?.nama_kelas || 'Kelas tidak ditemukan'}</p>
                            <p className="text-gray-300 text-xs mt-1">Pengampu: {option.guru?.nama_guru || 'Guru'}</p>
                          </div>
                        </div>

                        <div
                          className="card-back bg-gradient-to-br from-[#0080FF] to-[#0050AA] border border-white/20 rounded-xl p-6 shadow-lg overflow-hidden cursor-pointer"
                          onClick={() => router.push(`/siswa/materi?elemen=${option.id_elemen}`)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              router.push(`/siswa/materi?elemen=${option.id_elemen}`);
                            }
                          }}
                        >
                          <h3 className="text-lg font-bold mb-3 text-white">BAB Materi</h3>
                          <h4 className="text-base font-semibold mb-3 text-white/90">
                            {option.nama_elemen} - {option.kelas?.nama_kelas || 'Kelas tidak ditemukan'}
                          </h4>
                          <div className="space-y-2 overflow-y-auto max-h-44 pr-1">
                            {(elemenBabPreviewMap[option.id_elemen] || []).length > 0 ? (
                              <ol className="list-decimal list-inside text-white/95 text-sm space-y-2">
                                {(elemenBabPreviewMap[option.id_elemen] || []).map((judulBab, index) => (
                                  <li
                                    key={`${option.id_elemen}-${index}`}
                                    className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 transition-colors hover:bg-white/20 pointer-events-none"
                                  >
                                    {judulBab}
                                  </li>
                                ))}
                              </ol>
                            ) : (
                              <p className="text-white/85 text-sm">Belum ada bab.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => router.back()}
                className="mana-btn mana-btn--neutral mb-6 flex items-center gap-2 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 transition-all"
              >
                <FaArrowLeft />
                Kembali
              </button>

              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="flex items-center gap-3 text-3xl font-bold">
                  <FaProjectDiagram className="text-[#FFFFFF]" />
                  Materi {elemenName}
                </h2>
              </div>

              <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-300">Progres Baca Materi</span>
                  <span className="text-sm font-semibold text-white">{progressPercent}%</span>
                </div>
                <div className="mt-3 h-3 w-full rounded-full bg-black/30">
                  <div
                    className="h-full rounded-full bg-green-600 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-400">
                  {completedCount} dari {allSubBab.length} sub-bab selesai
                </p>
              </div>

              {materiList.length === 0 ? (
                <p className="text-gray-400">Belum ada materi dari guru untuk elemen ini.</p>
              ) : (
                <div className="space-y-6">
                  {materiList.map((materi) => (
                    <section
                      key={materi.id_materi}
                      className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
                    >
                      <div className="space-y-3">
                        {materi.bab.length === 0 ? (
                          <p className="text-sm text-gray-400">Belum ada bab pada materi ini.</p>
                        ) : (
                          materi.bab.map((bab, babIndex) => {
                            const expanded = expandedBabIds.includes(bab.id_bab);
                            return (
                              <div
                                key={bab.id_bab}
                                className="rounded-xl border border-white/10 bg-black/20"
                              >
                                <button
                                  type="button"
                                  onClick={() => setExpandedBabIds((current) => (current.includes(bab.id_bab) ? current.filter((id) => id !== bab.id_bab) : [...current, bab.id_bab]))}
                                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                                >
                                  <div>
                                    <p className="text-xl font-bold text-white">
                                      BAB {babIndex + 1}: {bab.judul_bab}
                                    </p>
                                    <p className="mt-1 text-gray-400">{bab.deskripsi_bab || 'Tidak ada deskripsi bab.'}</p>
                                  </div>
                                  {expanded ? <FaChevronUp /> : <FaChevronDown />}
                                </button>

                                {expanded && (
                                  <div className="px-4 pb-4 space-y-3">
                                    {bab.sub_bab.length === 0 ? (
                                      <p className="text-sm text-gray-400">Belum ada sub-bab.</p>
                                    ) : (
                                      bab.sub_bab.map((subBab) => {
                                        const selesai = !!completedMap[subBab.id_sub_bab];
                                        const konten = parseKontenValue(subBab.tautan_konten || '');
                                        const isCollapsed = collapsedSubBabIds.includes(subBab.id_sub_bab);
                                        return (
                                          <div
                                            key={subBab.id_sub_bab}
                                            className="rounded-xl border border-white/10 bg-white/5 p-3"
                                          >
                                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                              <div className="flex items-center gap-3">
                                                {konten.type === 'dokumen' && <FaFileAlt className="text-blue-400" />}
                                                {konten.type === 'video' && <FaVideo className="text-red-400" />}
                                                {konten.type === 'tautan' && <FaLink className="text-green-400" />}
                                                <p className="text-xl font-bold text-white">{subBab.judul_sub_bab}</p>
                                              </div>

                                              <div className="flex items-center gap-2">
                                                <div className="relative">
                                                  <button
                                                    type="button"
                                                    onClick={() => toggleSelesai(subBab.id_sub_bab)}
                                                    className={`mana-btn inline-flex items-center gap-2 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition ${selesai ? 'mana-btn--success' : 'mana-btn--primary'}`}
                                                  >
                                                    <FaCheck />
                                                    {selesai ? 'Sudah Selesai' : 'Tandai Selesai'}
                                                  </button>

                                                  {activeCelebrationSubBab === subBab.id_sub_bab && (
                                                    <div className="pointer-events-none absolute inset-0">
                                                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((index) => (
                                                        <span
                                                          key={`${subBab.id_sub_bab}-pop-${index}`}
                                                          className={`confetti confetti-${index}`}
                                                        />
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>

                                                <button
                                                  type="button"
                                                  onClick={() => toggleSubBabCard(subBab.id_sub_bab)}
                                                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-gray-200 transition hover:border-[#0080FF]/60 hover:text-white"
                                                  aria-label={isCollapsed ? 'Buka card sub-bab' : 'Tutup card sub-bab'}
                                                >
                                                  {isCollapsed ? <FaChevronDown /> : <FaChevronUp />}
                                                </button>
                                              </div>
                                            </div>

                                            {!isCollapsed && (
                                              <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3">
                                                {konten.description && <p className="mb-3 text-gray-400">{konten.description}</p>}

                                                {konten.type === 'dokumen' && (
                                                  <div className="overflow-hidden rounded-lg border border-white/10 bg-black/50">
                                                    <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-sm text-gray-300">
                                                      <FaFileAlt className="text-blue-400" />
                                                      Preview Dokumen
                                                    </div>
                                                    <div
                                                      className="relative h-[350px] sm:h-[420px] md:h-[500px] lg:h-[600px] w-full bg-black/70"
                                                      suppressHydrationWarning
                                                    >
                                                      {iframeErrors[`doc-${subBab.id_sub_bab}`] ? (
                                                        <div className="flex h-full items-center justify-center">
                                                          <div className="text-center">
                                                            <p className="mb-4 text-gray-400">Preview tidak tersedia</p>
                                                            <a
                                                              href={konten.url}
                                                              target="_blank"
                                                              rel="noopener noreferrer"
                                                              className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg bg-[#0080FF]/20 text-[#0080FF] hover:bg-[#0080FF]/30 transition-colors"
                                                            >
                                                              <FaExternalLinkAlt size={14} />
                                                              Buka di halaman baru
                                                            </a>
                                                          </div>
                                                        </div>
                                                      ) : (
                                                        <iframe
                                                          src={getDocumentPreviewUrl(konten.url)}
                                                          className="h-full w-full"
                                                          title={subBab.judul_sub_bab}
                                                          onError={() => {
                                                            setIframeErrors((prev) => ({
                                                              ...prev,
                                                              [`doc-${subBab.id_sub_bab}`]: true,
                                                            }));
                                                          }}
                                                          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation allow-top-navigation-by-user-activation"
                                                        />
                                                      )}
                                                    </div>
                                                  </div>
                                                )}

                                                {konten.type === 'video' && (
                                                  <div className="overflow-hidden rounded-lg border border-white/10 bg-black/50">
                                                    <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-sm text-gray-300">
                                                      <FaVideo className="text-red-400" />
                                                      Preview Video
                                                    </div>
                                                    <div
                                                      className="relative h-[350px] sm:h-[420px] md:h-[500px] lg:h-[600px] w-full bg-black/70"
                                                      suppressHydrationWarning
                                                    >
                                                      {iframeErrors[`video-${subBab.id_sub_bab}`] ? (
                                                        <div className="flex h-full items-center justify-center">
                                                          <div className="text-center">
                                                            <p className="mb-4 text-gray-400">Video tidak dapat dimainkan</p>
                                                            <a
                                                              href={konten.url}
                                                              target="_blank"
                                                              rel="noopener noreferrer"
                                                              className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg bg-[#0080FF]/20 text-[#0080FF] hover:bg-[#0080FF]/30 transition-colors"
                                                            >
                                                              <FaExternalLinkAlt size={14} />
                                                              Buka di halaman baru
                                                            </a>
                                                          </div>
                                                        </div>
                                                      ) : (
                                                        <>
                                                          {konten.url.includes('youtube.com') || konten.url.includes('youtu.be') ? (
                                                            <iframe
                                                              src={convertYouTubeUrl(konten.url)}
                                                              className="h-full w-full"
                                                              title={subBab.judul_sub_bab}
                                                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                              allowFullScreen
                                                              onError={() => {
                                                                setIframeErrors((prev) => ({
                                                                  ...prev,
                                                                  [`video-${subBab.id_sub_bab}`]: true,
                                                                }));
                                                              }}
                                                              sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"
                                                            />
                                                          ) : (
                                                            <video
                                                              src={konten.url}
                                                              controls
                                                              className="h-full w-full"
                                                              onError={() => {
                                                                setIframeErrors((prev) => ({
                                                                  ...prev,
                                                                  [`video-${subBab.id_sub_bab}`]: true,
                                                                }));
                                                              }}
                                                            >
                                                              Browser Anda tidak mendukung video.
                                                            </video>
                                                          )}
                                                        </>
                                                      )}
                                                    </div>
                                                  </div>
                                                )}

                                                {konten.type === 'tautan' && (
                                                  <div className="rounded-lg border border-white/10 bg-black/40 p-4 text-center">
                                                    <FaLink className="mx-auto mb-2 text-xl text-green-400" />
                                                    <p className="mb-1 text-sm text-gray-300">Konten eksternal</p>
                                                    <a
                                                      href={konten.url}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="break-all text-sm text-[#7fb7ff] hover:underline"
                                                    >
                                                      {konten.url}
                                                    </a>
                                                  </div>
                                                )}

                                                <div className="mt-3 flex flex-wrap gap-2 sm:gap-3">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDownloadFile(konten.url, `${subBab.judul_sub_bab}.file`)}
                                                    className="mana-btn mana-btn--success inline-flex items-center gap-2 rounded-lg px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base font-semibold"
                                                  >
                                                    <FaDownload /> Download
                                                  </button>
                                                  <a
                                                    href={konten.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mana-btn mana-btn--primary inline-flex items-center gap-2 rounded-lg px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base font-semibold"
                                                  >
                                                    <FaExternalLinkAlt /> Buka di Tab Baru
                                                  </a>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

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

      <style jsx>{`
        .card-container {
          perspective: 1000px;
          height: 320px;
          background: transparent;
          border: 0;
          outline: none;
          appearance: none;
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

        .confetti {
          position: absolute;
          width: 7px;
          height: 7px;
          border-radius: 9999px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: confetti-burst 0.9s ease-out forwards;
        }

        .confetti-0 {
          background: #ffe066;
          --tx: -52px;
          --ty: -30px;
        }

        .confetti-1 {
          background: #74c0fc;
          --tx: 50px;
          --ty: -28px;
        }

        .confetti-2 {
          background: #ff8787;
          --tx: -60px;
          --ty: 8px;
        }

        .confetti-3 {
          background: #69db7c;
          --tx: 62px;
          --ty: 10px;
        }

        .confetti-4 {
          background: #fcc419;
          --tx: -35px;
          --ty: 38px;
        }

        .confetti-5 {
          background: #9775fa;
          --tx: 34px;
          --ty: 40px;
        }

        .confetti-6 {
          background: #3bc9db;
          --tx: -5px;
          --ty: -48px;
        }

        .confetti-7 {
          background: #ff6b6b;
          --tx: 4px;
          --ty: 48px;
        }

        .confetti-8 {
          background: #ffd43b;
          --tx: -75px;
          --ty: -8px;
        }

        .confetti-9 {
          background: #4dabf7;
          --tx: 76px;
          --ty: -6px;
        }

        .confetti-10 {
          background: #63e6be;
          --tx: -48px;
          --ty: -56px;
        }

        .confetti-11 {
          background: #f783ac;
          --tx: 45px;
          --ty: -56px;
        }

        .confetti-12 {
          background: #b197fc;
          --tx: -28px;
          --ty: 56px;
        }

        .confetti-13 {
          background: #ffa94d;
          --tx: 26px;
          --ty: 58px;
        }

        @keyframes confetti-burst {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }

          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.6);
          }
        }
      `}</style>
    </div>
  );
}
