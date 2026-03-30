import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import supabase from '@/lib/db';
import GuruNavbar from '@/components/GuruNavbar';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import { FaBook, FaProjectDiagram, FaClipboardList, FaTimes } from 'react-icons/fa';

interface GuruData {
  id_guru: number;
  nama_guru: string;
  email_guru: string;
  nip_guru: string;
}

interface TujuanPembelajaran {
  id_tp: number;
  nama_tp: string;
  elemen_tp: number;
}

interface Kelas {
  id_kelas: number;
  nama_kelas: string;
}

interface Elemen {
  id_elemen: number;
  nama_elemen: string;
  sampul_elemen: string;
  deskripsi_elemen: string;
  kelas_elemen: number;
  guru_pengampu: number | null;
  tujuan_pembelajaran?: TujuanPembelajaran[];
  kelas?: Kelas;
}

export default function DashboardGuru() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [guruData, setGuruData] = useState<GuruData | null>(null);
  const [elemenList, setElemenList] = useState<Elemen[]>([]);
  const [selectedElemen, setSelectedElemen] = useState<Elemen | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Get current date in Indonesian format
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

  useEffect(() => {
    const checkGuruAuth = async () => {
      try {
        // Check if guru is logged in
        const guruSession = localStorage.getItem('guru_session');

        if (!guruSession) {
          router.push('/login');
          return;
        }

        const sessionData = JSON.parse(guruSession);

        // Fetch guru data from database
        const { data: guru, error: guruError } = await supabase.from('guru').select('*').eq('id_guru', sessionData.id_guru).single();

        if (guruError || !guru) {
          console.error('Error fetching guru data:', guruError);
          localStorage.removeItem('guru_session');
          router.push('/login');
          return;
        }

        setGuruData(guru);

        // Fetch elemen yang diampu guru
        await fetchElemenData(guru.id_guru);

        setLoading(false);
      } catch (error) {
        console.error('Error checking guru auth:', error);
        router.push('/login');
      }
    };

    checkGuruAuth();
  }, [router]);

  const fetchElemenData = async (guruId: number) => {
    try {
      // Fetch elemen yang diampu oleh guru ini dengan data kelas
      const { data: elemenData, error: elemenError } = await supabase
        .from('elemen')
        .select(
          `
          *,
          kelas:kelas_elemen (
            id_kelas,
            nama_kelas
          )
        `,
        )
        .eq('guru_pengampu', guruId);

      if (elemenError) {
        console.error('Error fetching elemen:', elemenError);
        return;
      }

      console.log('Elemen Data:', elemenData);

      // Fetch tujuan pembelajaran untuk setiap elemen
      if (elemenData && elemenData.length > 0) {
        const elemenWithTP = await Promise.all(
          elemenData.map(async (elemen: any) => {
            const { data: tpData } = await supabase.from('tujuan_pembelajaran').select('*').eq('elemen_tp', elemen.id_elemen);

            console.log('Elemen:', elemen.nama_elemen, 'Kelas:', elemen.kelas);

            return {
              ...elemen,
              tujuan_pembelajaran: tpData || [],
            };
          }),
        );

        setElemenList(elemenWithTP);
      } else {
        setElemenList([]);
      }
    } catch (error) {
      console.error('Error fetching elemen data:', error);
      setElemenList([]);
    }
  };

  const handleCardClick = (elemen: Elemen) => {
    setSelectedElemen(elemen);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedElemen(null);
  };

  const navigateTo = (path: string) => {
    if (selectedElemen) {
      router.push(`${path}?elemen=${selectedElemen.id_elemen}`);
    }
  };

  const navigateToMateriByElemen = async () => {
    if (!selectedElemen || !guruData) return;

    try {
      const response = await fetch(`/api/materi?id_guru=${guruData.id_guru}`);

      if (!response.ok) {
        router.push(`/guru/materi?elemen=${selectedElemen.id_elemen}`);
        return;
      }

      const materiData = await response.json();
      const materiTarget = (materiData || []).find((item: any) => item.id_elemen === selectedElemen.id_elemen || item.elemen?.id_elemen === selectedElemen.id_elemen || item.kelas_materi === selectedElemen.id_elemen);

      if (materiTarget?.id_materi) {
        router.push(`/guru/materi?id_materi=${materiTarget.id_materi}`);
        return;
      }

      router.push(`/guru/materi?elemen=${selectedElemen.id_elemen}`);
    } catch (error) {
      console.error('Error navigating to materi by elemen:', error);
      router.push(`/guru/materi?elemen=${selectedElemen.id_elemen}`);
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
            <CountdownTimer showDate={false} />
          </div>

          {/* Elemen Cards Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <FaBook className="text-[#FFFFFF]" />
              Elemen yang Anda Ajarkan
            </h2>

            {elemenList.length === 0 ? (
              <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center">
                <p className="text-gray-400 text-lg">Anda belum memiliki elemen yang diampu.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {elemenList.map((elemen) => (
                  <div
                    key={elemen.id_elemen}
                    className="card-container cursor-pointer"
                    onClick={() => handleCardClick(elemen)}
                  >
                    <div className="card">
                      {/* Front Side */}
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
                        </div>
                      </div>

                      {/* Back Side */}
                      <div className="card-back bg-gradient-to-br from-[#0080FF] to-[#0050AA] border border-white/20 rounded-xl p-6 shadow-lg">
                        <h3 className="text-xl font-bold mb-4 text-white">Tujuan Pembelajaran</h3>
                        <h4 className="text-lg font-semibold mb-3 text-white/90">
                          {elemen.nama_elemen} - {elemen.kelas?.nama_kelas || 'Kelas tidak ditemukan'}
                        </h4>
                        <div className="space-y-2 overflow-y-auto max-h-32">
                          {elemen.tujuan_pembelajaran && elemen.tujuan_pembelajaran.length > 0 ? (
                            <ol className="list-decimal list-inside text-white/90 text-sm space-y-1">
                              {elemen.tujuan_pembelajaran.map((tp, index) => (
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

      {/* Modal Popup */}
      {showModal && selectedElemen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4 relative shadow-2xl">
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors"
            >
              <FaTimes size={24} />
            </button>

            {/* Modal Header */}
            <h2 className="text-2xl font-bold mb-2 text-white">{selectedElemen.nama_elemen}</h2>
            <p className="text-gray-400 text-sm mb-4">{selectedElemen.kelas?.nama_kelas || 'Kelas tidak ditemukan'}</p>
            <p className="text-gray-400 mb-6">Pilih menu yang ingin Anda akses</p>

            {/* Menu Buttons */}
            <div className="space-y-4">
              <button
                onClick={navigateToMateriByElemen}
                className="w-full flex items-center gap-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <FaBook size={24} />
                <span className="text-lg">Materi</span>
              </button>

              <button
                onClick={() => navigateTo('/guru/pbl')}
                className="w-full flex items-center gap-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <FaProjectDiagram size={24} />
                <span className="text-lg">PBL</span>
              </button>

              <button
                onClick={() => {
                  if (selectedElemen) {
                    router.push(`/guru/asesmen/${selectedElemen.id_elemen}`);
                  }
                }}
                className="w-full flex items-center gap-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <FaClipboardList size={24} />
                <span className="text-lg">Asesmen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative py-6 sm:py-8 px-3 sm:px-6 border-t border-white/10">
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

      {/* CSS for Card Flip Animation */}
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

        .card-container:hover .card {
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
