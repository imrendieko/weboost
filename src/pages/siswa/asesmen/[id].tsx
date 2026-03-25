import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import SiswaNavbar from '@/components/SiswaNavbar';
import { FaArrowLeft, FaClock, FaPlay, FaClipboardList, FaSearch, FaCheckCircle } from 'react-icons/fa';

interface SiswaSession {
  id_siswa: number;
  nama_siswa: string;
}

interface AsesmenItem {
  id_asesmen: number;
  judul_asesmen: string;
  sampul_asesmen?: string;
  waktu_mulai: string;
  waktu_terakhir: string;
  durasi_asesmen?: number | null;
  durasi_kuis?: number | null;
}

function getCurrentDate() {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const now = new Date();
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SiswaDaftarAsesmenByElemen() {
  const router = useRouter();
  const { id } = router.query;
  const elemenId = typeof id === 'string' ? Number(id) : null;

  const [loading, setLoading] = useState(true);
  const [siswaSession, setSiswaSession] = useState<SiswaSession | null>(null);
  const [asesmenList, setAsesmenList] = useState<AsesmenItem[]>([]);
  const [search, setSearch] = useState('');
  const [completedAsesmenIds, setCompletedAsesmenIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      const rawSession = localStorage.getItem('siswa_session');
      if (!rawSession) {
        router.push('/login');
        return;
      }

      const session = JSON.parse(rawSession) as SiswaSession;
      setSiswaSession(session);

      if (!elemenId || Number.isNaN(elemenId)) {
        setLoading(false);
        return;
      }

      // Fetch daftar asesmen untuk elemen ini
      const response = await fetch(`/api/asesmen?id_elemen=${elemenId}`);
      const data = await response.json();
      if (response.ok) {
        setAsesmenList(data || []);
      }

      // Fetch daftar asesmen yang sudah dikerjakan oleh siswa
      const attemptResponse = await fetch(`/api/asesmen/attempt?id_siswa=${session.id_siswa}`);
      const attemptData = await attemptResponse.json();
      if (attemptResponse.ok && attemptData) {
        const completedIds = new Set<number>();
        (attemptData || []).forEach((attempt: any) => {
          completedIds.add(attempt.id_asesmen);
        });
        setCompletedAsesmenIds(completedIds);
      }

      setLoading(false);
    };

    if (router.isReady) {
      loadData();
    }
  }, [router, elemenId]);

  const asesmenCards = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return asesmenList
      .filter((item) => {
        if (!keyword) {
          return true;
        }

        return item.judul_asesmen.toLowerCase().includes(keyword);
      })
      .map((item) => {
        const now = new Date();
        const mulai = new Date(item.waktu_mulai);
        const akhir = new Date(item.waktu_terakhir);
        const isStarted = !Number.isNaN(mulai.getTime()) && now >= mulai;
        const isClosed = !Number.isNaN(akhir.getTime()) && now > akhir;
        const canStart = isStarted && !isClosed;

        return {
          ...item,
          isStarted,
          isClosed,
          canStart,
        };
      });
  }, [asesmenList, search]);

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
            <CountdownTimer />
          </div>

          <button
            type="button"
            onClick={() => router.back()}
            className="mana-btn mana-btn--neutral mb-6 inline-flex items-center gap-2 rounded-lg px-4 py-2 transition-all"
          >
            <FaArrowLeft />
            Kembali
          </button>

          <div className="mb-6 flex items-center gap-3">
            <FaClipboardList className="text-2xl text-[#FFFFFF]" />
            <h2 className="text-2xl font-bold">Daftar Asesmen Siswa</h2>
          </div>

          <div className="mb-6 max-w-md relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama asesmen..."
              className="w-full rounded-lg border border-white/10 bg-gray-800/60 pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {asesmenCards.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">{search.trim() ? 'Asesmen tidak ditemukan untuk kata kunci tersebut.' : 'Belum ada asesmen pada elemen ini.'}</div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {asesmenCards.map((item, index) => (
                <div
                  key={item.id_asesmen}
                  className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden"
                >
                  <div className="relative h-40 w-full bg-gray-900">
                    <Image
                      src={item.sampul_asesmen || '/default-cover.jpg'}
                      alt={item.judul_asesmen}
                      fill
                      priority={index === 0}
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                  </div>

                  <div className="p-5">
                    <h3 className="text-xl font-semibold text-white">{item.judul_asesmen}</h3>
                    <p className="mt-2 text-sm text-gray-300">Mulai: {formatDateTime(item.waktu_mulai)}</p>
                    <p className="text-sm text-gray-300">Berakhir: {formatDateTime(item.waktu_terakhir)}</p>
                    <p className="mt-2 inline-flex items-center gap-2 text-xs text-blue-200">
                      <FaClock />
                      Durasi: {item.durasi_asesmen || item.durasi_kuis || 0} menit
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        if (completedAsesmenIds.has(item.id_asesmen)) {
                          router.push(`/siswa/asesmen/hasil-analisis/${item.id_asesmen}`);
                        } else {
                          router.push(`/siswa/asesmen/kerjakan/${item.id_asesmen}`);
                        }
                      }}
                      disabled={completedAsesmenIds.has(item.id_asesmen) ? false : !item.canStart}
                      className={`mana-btn mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition ${
                        completedAsesmenIds.has(item.id_asesmen) ? 'mana-btn--primary' : item.canStart ? 'mana-btn--primary' : item.isClosed ? 'mana-btn--neutral cursor-not-allowed' : 'mana-btn--neutral cursor-not-allowed'
                      }`}
                    >
                      {completedAsesmenIds.has(item.id_asesmen) ? (
                        <>
                          <FaCheckCircle />
                          Lihat Hasil Analisis
                        </>
                      ) : (
                        <>
                          <FaPlay />
                          {item.canStart ? 'Mulai Kerjakan' : item.isClosed ? 'Sudah Ditutup' : 'Belum Dimulai'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
