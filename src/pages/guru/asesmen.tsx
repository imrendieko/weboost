import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import GuruNavbar from '@/components/GuruNavbar';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import supabase from '@/lib/db';
import { FaBook, FaClipboardList } from 'react-icons/fa';
import { Elemen, GuruData } from '@/types/asesmen.d';

export default function KelolAsesmen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [guruData, setGuruData] = useState<GuruData | null>(null);
  const [elemenList, setElemenList] = useState<Elemen[]>([]);
  const [asesmenByElemen, setAsesmenByElemen] = useState<Record<number, string[]>>({});

  const getCurrentDate = () => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const now = new Date();
    const dayName = days[now.getDay()];
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();

    return `${dayName}, ${day} ${month} ${year}`;
  };

  // Check authentication & fetch data
  useEffect(() => {
    const checkGuruAuth = async () => {
      try {
        const guruSession = localStorage.getItem('guru_session');

        if (!guruSession) {
          router.push('/login');
          return;
        }

        const sessionData = JSON.parse(guruSession);
        setGuruData(sessionData);

        // Fetch elemen yang diampu guru
        await fetchElemenByGuru(sessionData.id_guru);
        setLoading(false);
      } catch (error) {
        console.error('Error checking guru auth:', error);
        router.push('/login');
      }
    };

    checkGuruAuth();
  }, [router]);

  // Fetch elemen yang diampu guru ini
  const fetchElemenByGuru = async (idGuru: number) => {
    try {
      const { data, error } = await supabase
        .from('elemen')
        .select(
          `
          id_elemen,
          nama_elemen,
          sampul_elemen,
          deskripsi_elemen,
          kelas_elemen,
          guru_pengampu,
          created_at,
          kelas:kelas_elemen (
            id_kelas,
            nama_kelas
          )
        `,
        )
        .eq('guru_pengampu', idGuru)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching elemen:', error);
        return;
      }

      const elemenData = (data || []) as unknown as Elemen[];
      setElemenList(elemenData);
      await fetchAsesmenByElemenIds(elemenData.map((item) => item.id_elemen));
    } catch (error) {
      console.error('Error fetching elemen:', error);
    }
  };

  const fetchAsesmenByElemenIds = async (elemenIds: number[]) => {
    if (elemenIds.length === 0) {
      setAsesmenByElemen({});
      return;
    }

    try {
      const { data, error } = await supabase.from('asesmen').select('id_elemen, judul_asesmen, created_at').in('id_elemen', elemenIds).order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching asesmen per elemen:', error);
        return;
      }

      const grouped: Record<number, string[]> = {};
      for (const item of data || []) {
        if (!grouped[item.id_elemen]) {
          grouped[item.id_elemen] = [];
        }
        grouped[item.id_elemen].push(item.judul_asesmen);
      }

      setAsesmenByElemen(grouped);
    } catch (error) {
      console.error('Error fetching asesmen per elemen:', error);
    }
  };

  // Navigate to assessment list for selected element
  const handleCardClick = (idElemen: number) => {
    router.push(`/guru/asesmen/${idElemen}`);
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

      <div className="relative z-10 pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Selamat Datang, <span className="text-[#FFFFFF]">{guruData?.nama_guru.split(' ')[0]}!</span>
              </h1>
              <p className="text-gray-400">{getCurrentDate()}</p>
            </div>

            {/* Clock Timer */}
            <CountdownTimer />
          </div>

          <div className="mb-8">
            <div className="mb-6 flex items-center gap-3">
              <FaClipboardList className="text-2xl text-[#FFFFFF]" />
              <h2 className="text-2xl font-bold">Pilih Elemen untuk Kelola Asesmen</h2>
            </div>

            {elemenList.length === 0 ? (
              <p className="text-gray-400">Belum ada elemen yang Anda ampu.</p>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {elemenList.map((elemen) => (
                  <div
                    key={elemen.id_elemen}
                    className="card-container cursor-pointer"
                    onClick={() => handleCardClick(elemen.id_elemen)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCardClick(elemen.id_elemen);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Buka daftar asesmen ${elemen.nama_elemen}`}
                  >
                    <div className="card">
                      <div className="card-front bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 rounded-xl overflow-hidden shadow-lg hover:shadow-[0_0_30px_rgba(0,128,255,0.3)] transition-all duration-300">
                        <div className="relative h-48 w-full bg-gray-900">
                          {elemen.sampul_elemen ? (
                            <Image
                              src={elemen.sampul_elemen}
                              alt={elemen.nama_elemen}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                              <FaBook className="text-5xl text-white/50" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        </div>
                        <div className="p-4">
                          <h3 className="text-xl font-bold text-white">{elemen.nama_elemen}</h3>
                          <p className="text-gray-400 text-sm mt-1">{elemen.kelas?.nama_kelas || 'Kelas belum terhubung'}</p>
                          <p className="text-gray-300 text-xs mt-1">Pengampu: {guruData?.nama_guru || 'Guru'}</p>
                        </div>
                      </div>

                      <div className="card-back bg-gradient-to-br from-[#0080FF] to-[#0050AA] border border-white/20 rounded-xl p-6 shadow-lg overflow-hidden">
                        <h3 className="text-lg font-bold mb-3 text-white">Daftar Asesmen</h3>
                        <h4 className="text-base font-semibold mb-3 text-white/90">{elemen.nama_elemen}</h4>

                        <div className="space-y-2 overflow-y-auto max-h-44 pr-1">
                          {asesmenByElemen[elemen.id_elemen] && asesmenByElemen[elemen.id_elemen].length > 0 ? (
                            <ol className="list-decimal list-inside text-white/95 text-sm space-y-2">
                              {asesmenByElemen[elemen.id_elemen].map((judul, index) => (
                                <li
                                  key={`${elemen.id_elemen}-${index}`}
                                  className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 transition-colors hover:bg-white/20"
                                >
                                  {judul}
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <p className="text-white/85 text-sm">Belum ada asesmen.</p>
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

      {/* Footer */}
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
    </div>
  );
}
