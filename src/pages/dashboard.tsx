import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import SiswaNavbar from '@/components/SiswaNavbar';
import { FaBook, FaChevronLeft, FaChevronRight, FaClipboardList, FaProjectDiagram, FaTimes, FaCalendar } from 'react-icons/fa';

interface SiswaData {
  id_siswa: number;
  nama_siswa: string;
  email_siswa: string;
  kelas_siswa: number;
  lembaga_siswa: number;
}

interface Elemen {
  id_elemen: number;
  nama_elemen: string;
  sampul_elemen?: string;
  guru?: {
    nama_guru: string;
  } | null;
  tujuan_pembelajaran?: Array<{
    id_tp: number;
    nama_tp: string;
    elemen_tp: number;
  }>;
  kelas?: {
    id_kelas: number;
    nama_kelas: string;
  } | null;
}

interface DeadlineItem {
  jenis: 'pbl' | 'asesmen';
  id_deadline?: string;
  id_sintak?: number;
  id_asesmen?: number;
  tanggal: string;
  judul: string;
  id_elemen: number | null;
}

function getCurrentDate() {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const now = new Date();
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function buildCalendarDays(baseDate: Date) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{ date: Date | null }> = [];

  for (let i = 0; i < firstDayIndex; i += 1) {
    cells.push({ date: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(year, month, day) });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: null });
  }

  return cells;
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export default function DashboardSiswa() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [siswaData, setSiswaData] = useState<SiswaData | null>(null);
  const [elemenList, setElemenList] = useState<Elemen[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [selectedElemen, setSelectedElemen] = useState<Elemen | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(toDateKey(new Date()));

  useEffect(() => {
    const loadData = async () => {
      try {
        const siswaSession = localStorage.getItem('siswa_session');
        if (!siswaSession) {
          router.push('/login');
          return;
        }

        const sessionData = JSON.parse(siswaSession) as SiswaData;

        const response = await fetch(`/api/siswa/beranda?id_siswa=${sessionData.id_siswa}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Gagal memuat beranda siswa');
        }

        setSiswaData(result.siswa);
        setElemenList(result.elemen || []);
        setDeadlines(result.deadlines || []);
      } catch (error) {
        console.error('Error loading siswa dashboard:', error);
        localStorage.removeItem('siswa_session');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    if (router.isReady) {
      loadData();
    }
  }, [router]);

  const deadlineMap = useMemo(() => {
    const map = new Map<string, DeadlineItem[]>();

    deadlines.forEach((item) => {
      const date = new Date(item.tanggal);
      if (Number.isNaN(date.getTime())) {
        return;
      }
      const key = toDateKey(date);
      const current = map.get(key) || [];
      current.push(item);
      map.set(key, current);
    });

    return map;
  }, [deadlines]);

  const calendarCells = useMemo(() => buildCalendarDays(calendarDate), [calendarDate]);

  const selectedDateNotes = useMemo(() => {
    return deadlineMap.get(selectedDateKey) || [];
  }, [deadlineMap, selectedDateKey]);

  const selectedDateLabel = useMemo(() => {
    const [year, month, day] = selectedDateKey.split('-').map(Number);
    const date = new Date(year, (month || 1) - 1, day || 1);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [selectedDateKey]);

  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    return [...deadlines]
      .filter((item) => {
        const date = new Date(item.tanggal);
        return !Number.isNaN(date.getTime()) && date.getTime() >= now.getTime();
      })
      .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())
      .slice(0, 8);
  }, [deadlines]);

  const openElemenModal = (elemen: Elemen) => {
    setSelectedElemen(elemen);
    setShowModal(true);
  };

  const goToPreviousMonth = () => {
    setCalendarDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCalendarDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  };

  const navigateTo = (path: string) => {
    if (!selectedElemen) {
      return;
    }

    if (path === '/siswa/asesmen') {
      router.push(`/siswa/asesmen/${selectedElemen.id_elemen}`);
      return;
    }

    router.push(`${path}?elemen=${selectedElemen.id_elemen}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!siswaData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <StarBackground />
      <SiswaNavbar siswaName={siswaData.nama_siswa} />

      <div className="relative z-10 pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Selamat Datang, <span className="text-[#FFFFFF]">{siswaData.nama_siswa.split(' ')[0]}!</span>
              </h1>
              <p className="text-gray-400">{getCurrentDate()}</p>
            </div>
            <CountdownTimer />
          </div>

          <div className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <FaCalendar className="text-[#FFFFFF]" />
              Kalender Siswa
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={goToPreviousMonth}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:border-[#0080FF]/60 hover:bg-[#0080FF]/20"
                    aria-label="Bulan sebelumnya"
                  >
                    <FaChevronLeft />
                  </button>
                  <div className="text-lg font-semibold">{calendarDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</div>
                  <button
                    type="button"
                    onClick={goToNextMonth}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:border-[#0080FF]/60 hover:bg-[#0080FF]/20"
                    aria-label="Bulan berikutnya"
                  >
                    <FaChevronRight />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-2 text-xs text-gray-400 mb-2">
                  {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
                    <div
                      key={day}
                      className="text-center"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {calendarCells.map((cell, index) => {
                    if (!cell.date) {
                      return (
                        <div
                          key={`empty-${index}`}
                          className="h-10 rounded-lg bg-transparent"
                        />
                      );
                    }

                    const key = toDateKey(cell.date);
                    const dayDeadlines = deadlineMap.get(key) || [];
                    const hasPblDeadline = dayDeadlines.some((item) => item.jenis === 'pbl');
                    const hasAsesmenDeadline = dayDeadlines.some((item) => item.jenis === 'asesmen');
                    const isToday = new Date().toDateString() === cell.date.toDateString();
                    const isSelected = key === selectedDateKey;

                    const deadlineClass =
                      hasPblDeadline && hasAsesmenDeadline
                        ? 'border-orange-400 bg-orange-500/20 text-orange-200'
                        : hasAsesmenDeadline
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                          : hasPblDeadline
                            ? 'border-yellow-400 bg-yellow-500/20 text-yellow-200'
                            : 'border-white/10 bg-black/20 text-white';

                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => setSelectedDateKey(key)}
                        className={`relative h-10 rounded-lg border flex items-center justify-center text-sm font-semibold transition ${deadlineClass} ${isToday ? 'ring-2 ring-[#0080FF]' : ''} ${isSelected ? 'ring-2 ring-white' : ''}`}
                        title={dayDeadlines.map((item) => `[${item.jenis === 'pbl' ? 'PBL' : 'Asesmen'}] ${item.judul}`).join('\n')}
                      >
                        {cell.date.getDate()}
                        {dayDeadlines.length > 0 && (
                          <span className="absolute bottom-1 right-1 inline-flex items-center gap-1">
                            {hasPblDeadline && <span className="h-1.5 w-1.5 rounded-full bg-yellow-300" />}
                            {hasAsesmenDeadline && <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-300">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-yellow-300" />
                    PBL
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-300" />
                    Asesmen
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-300" />
                    PBL + Asesmen
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <h3 className="text-lg font-semibold mb-1">Catatan Tanggal Dipilih</h3>
                <p className="text-sm text-gray-400 mb-3">{selectedDateLabel}</p>
                {selectedDateNotes.length === 0 ? (
                  <p className="text-sm text-gray-400">Tidak ada deadline pada tanggal ini.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDateNotes.map((item, index) => (
                      <div
                        key={`${item.id_deadline || `${item.jenis}-${item.id_sintak || item.id_asesmen || index}`}-${index}`}
                        className="rounded-xl border border-white/10 bg-black/20 p-3"
                      >
                        <p className="font-semibold text-white">{item.judul}</p>
                        <p className="text-xs text-gray-400 mt-1">{item.jenis === 'pbl' ? 'PBL' : 'Asesmen'}</p>
                        <p className="text-sm text-gray-300 mt-1">
                          {new Date(item.tanggal).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 border-t border-white/10 pt-4">
                  <h4 className="text-sm font-semibold text-white mb-2">Deadline Terdekat</h4>
                  {upcomingDeadlines.length === 0 ? (
                    <p className="text-sm text-gray-400">Belum ada deadline terdekat.</p>
                  ) : (
                    <div className="space-y-2">
                      {upcomingDeadlines.slice(0, 4).map((item, index) => (
                        <p
                          key={`upcoming-${item.id_deadline || `${item.jenis}-${item.id_sintak || item.id_asesmen || index}`}-${index}`}
                          className="text-sm text-gray-300"
                        >
                          [{item.jenis === 'pbl' ? 'PBL' : 'Asesmen'}] {item.judul} - {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <FaBook className="text-[#FFFFFF]" />
              Elemen yang Anda Pelajari
            </h2>

            {elemenList.length === 0 ? (
              <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center">
                <p className="text-gray-400 text-lg">Belum ada elemen untuk kelas Anda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {elemenList.map((elemen) => (
                  <div
                    key={elemen.id_elemen}
                    className="card-container cursor-pointer"
                    onClick={() => openElemenModal(elemen)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openElemenModal(elemen);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="card">
                      <div className="card-front bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 rounded-xl overflow-hidden shadow-lg hover:shadow-[0_0_30px_rgba(0,128,255,0.3)] transition-all duration-300">
                        <div className="relative h-48 w-full">
                          <Image
                            src={elemen.sampul_elemen || '/default-cover.jpg'}
                            alt={elemen.nama_elemen}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                        </div>
                        <div className="p-4">
                          <h3 className="text-xl font-bold text-white">{elemen.nama_elemen}</h3>
                          <p className="text-gray-400 text-sm mt-1">{elemen.kelas?.nama_kelas || 'Kelas tidak ditemukan'}</p>
                          <p className="text-gray-300 text-xs mt-1">Pengampu: {elemen.guru?.nama_guru || 'Guru'}</p>
                        </div>
                      </div>

                      <div className="card-back bg-gradient-to-br from-[#0080FF] to-[#0050AA] border border-white/20 rounded-xl p-6 shadow-lg">
                        <h3 className="text-xl font-bold mb-4 text-white">Tujuan Pembelajaran</h3>
                        <h4 className="text-lg font-semibold mb-3 text-white/90">
                          {elemen.nama_elemen} - {elemen.kelas?.nama_kelas || 'Kelas tidak ditemukan'}
                        </h4>
                        <div className="space-y-2 overflow-y-auto max-h-32">
                          {elemen.tujuan_pembelajaran && elemen.tujuan_pembelajaran.length > 0 ? (
                            <ol className="list-decimal list-inside text-white/90 text-sm space-y-1">
                              {elemen.tujuan_pembelajaran.map((tp) => (
                                <li key={tp.id_tp}>{tp.nama_tp}</li>
                              ))}
                            </ol>
                          ) : (
                            <p className="text-white/70 text-sm">Belum ada tujuan pembelajaran.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && selectedElemen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4 relative shadow-2xl">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors"
            >
              <FaTimes size={24} />
            </button>

            <h2 className="text-2xl font-bold mb-2 text-white">{selectedElemen.nama_elemen}</h2>
            <p className="text-gray-400 text-sm mb-4">{selectedElemen.kelas?.nama_kelas || 'Kelas tidak ditemukan'}</p>
            <p className="text-gray-400 mb-6">Pilih menu yang ingin Anda akses</p>

            <div className="space-y-4">
              <button
                onClick={() => navigateTo('/siswa/materi')}
                className="w-full flex items-center gap-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <FaBook size={24} />
                <span className="text-lg">Materi</span>
              </button>

              <button
                onClick={() => navigateTo('/siswa/pbl')}
                className="w-full flex items-center gap-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <FaProjectDiagram size={24} />
                <span className="text-lg">PBL</span>
              </button>

              <button
                onClick={() => navigateTo('/siswa/asesmen')}
                className="w-full flex items-center gap-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <FaClipboardList size={24} />
                <span className="text-lg">Asesmen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="relative py-8 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400 text-sm">
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
        }

        .card {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s;
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
          backface-visibility: hidden;
        }

        .card-back {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
