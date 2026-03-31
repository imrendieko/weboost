import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import supabase from '@/lib/db';
import AdminNavbar from '@/components/AdminNavbar';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import { FaSearch, FaArrowLeft, FaEllipsisV, FaClock, FaCalendar, FaImage, FaChartBar, FaChartLine } from 'react-icons/fa';
import { Asesmen, Elemen } from '@/types/asesmen.d';

interface AdminData {
  id_admin: number;
  nama_admin: string;
  email_admin: string;
}

export default function AdminHasilAsesmen() {
  const router = useRouter();
  const { id_elemen: idElemenStr } = router.query;
  const idElemen = idElemenStr ? parseInt(idElemenStr as string, 10) : null;

  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [elemenData, setElemenData] = useState<Elemen | null>(null);
  const [asesmenList, setAsesmenList] = useState<Asesmen[]>([]);
  const [filteredAsesmen, setFilteredAsesmen] = useState<Asesmen[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

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
    const checkAdminAuth = async () => {
      try {
        const adminSession = localStorage.getItem('admin_session');

        if (!adminSession) {
          router.push('/');
          return;
        }

        const sessionData = JSON.parse(adminSession);

        const { data: admin, error: adminError } = await supabase.from('admin').select('*').eq('id_admin', sessionData.id_admin).single();

        if (adminError || !admin) {
          console.error('Error fetching admin data:', adminError);
          localStorage.removeItem('admin_session');
          router.push('/');
          return;
        }

        setAdminData(admin);

        if (idElemen && !Number.isNaN(idElemen)) {
          await fetchElemenData(idElemen);
          await fetchAsesmenByElemen(idElemen);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error checking admin auth:', error);
        router.push('/');
      }
    };

    if (router.isReady) {
      checkAdminAuth();
    }
  }, [router.isReady, idElemen]);

  useEffect(() => {
    const handleClickOutsideMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-asesmen-menu]')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutsideMenu);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideMenu);
    };
  }, []);

  const fetchElemenData = async (currentIdElemen: number) => {
    try {
      const { data, error } = await supabase
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
        .eq('id_elemen', currentIdElemen)
        .single();

      if (error) {
        console.error('Error fetching elemen:', error);
        return;
      }

      setElemenData(data);
    } catch (error) {
      console.error('Error fetching elemen:', error);
    }
  };

  const fetchAsesmenByElemen = async (currentIdElemen: number) => {
    try {
      const res = await fetch(`/api/asesmen?id_elemen=${currentIdElemen}`);
      if (!res.ok) {
        console.error('Error fetching asesmen:', res.status);
        return;
      }

      const data = await res.json();
      setAsesmenList(data || []);
      setFilteredAsesmen(data || []);
    } catch (error) {
      console.error('Error fetching asesmen:', error);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = asesmenList.filter((item) => item.judul_asesmen.toLowerCase().includes(term.toLowerCase()));
    setFilteredAsesmen(filtered);
  };

  const handleGoToProgres = (idAsesmen: number) => {
    router.push(`/admin/asesmen/progres/${idAsesmen}`);
  };

  const handleGoToAnalisis = (idAsesmen: number) => {
    router.push(`/admin/asesmen/analisis/${idAsesmen}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B1F] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!adminData) {
    return null;
  }

  const firstName = adminData.nama_admin.split(' ')[0];

  return (
    <div className="relative min-h-screen bg-[#0B0B1F] overflow-hidden">
      <StarBackground />
      <AdminNavbar adminName={adminData.nama_admin} />

      <div className="relative pt-24 sm:pt-28 md:pt-32 pb-12 px-3 sm:px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-white text-3xl md:text-4xl font-bold mb-2">Selamat Datang, {firstName}!</h1>
            <p className="text-gray-400 text-sm md:text-base">{getCurrentDate()}</p>
          </div>

          <div className="flex justify-start md:justify-end">
            <CountdownTimer showDate={false} />
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="mana-btn mana-btn--neutral flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
            >
              <FaArrowLeft size={16} />
              Kembali
            </button>

            <div>
              <h2 className="text-2xl font-bold text-white">{elemenData?.nama_elemen || 'Elemen'}</h2>
              <p className="text-sm text-gray-400">Daftar Asesmen</p>
            </div>
          </div>
        </div>

        {!idElemen || Number.isNaN(idElemen) ? (
          <div className="bg-gray-800/30 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center">
            <p className="text-gray-300 mb-3">Elemen belum dipilih.</p>
            <Link
              href="/admin/kelola-elemen"
              className="mana-btn mana-btn--primary inline-flex items-center px-4 py-2 rounded-lg transition-all"
            >
              Pilih Elemen
            </Link>
          </div>
        ) : (
          <>
            <div className="relative mb-6">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Cari nama asesmen..."
                className="w-full bg-gray-800 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {filteredAsesmen.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <p className="text-lg">Belum ada asesmen untuk elemen ini</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 mb-8">
                {filteredAsesmen.map((asesmen) => (
                  <div
                    key={asesmen.id_asesmen}
                    className="group bg-gray-800/30 border border-white/10 hover:border-blue-500/50 rounded-lg transition-all hover:shadow-lg hover:shadow-blue-500/10"
                  >
                    <div className="flex gap-4 p-4">
                      <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800">
                        {asesmen.sampul_asesmen ? (
                          <img
                            src={asesmen.sampul_asesmen}
                            alt={asesmen.judul_asesmen}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
                            <FaImage className="text-2xl text-white/50" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2 text-white group-hover:text-blue-400 transition-colors">{asesmen.judul_asesmen}</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-400 mb-3">
                          <div className="flex items-center gap-2">
                            <FaCalendar size={14} />
                            <span>
                              Mulai: {new Date(asesmen.waktu_mulai).toLocaleDateString('id-ID')} {new Date(asesmen.waktu_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaClock size={14} />
                            <span>
                              Akhir: {new Date(asesmen.waktu_terakhir).toLocaleDateString('id-ID')} {new Date(asesmen.waktu_terakhir).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        <div className="text-sm text-gray-400">
                          <p>Guru: {asesmen.guru?.nama_guru || '-'}</p>
                          <p>Kelas: {elemenData?.kelas?.nama_kelas || '-'}</p>
                          {(asesmen.durasi_asesmen || asesmen.durasi_kuis) && <p>Durasi Kuis: {asesmen.durasi_asesmen || asesmen.durasi_kuis} menit</p>}
                        </div>
                      </div>

                      <div
                        className="relative flex-shrink-0"
                        data-asesmen-menu="true"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === asesmen.id_asesmen ? null : asesmen.id_asesmen);
                          }}
                          className="p-2 hover:bg-gray-700/50 rounded-lg transition-all text-white"
                        >
                          <FaEllipsisV />
                        </button>

                        {openMenuId === asesmen.id_asesmen && (
                          <div className="absolute right-0 bottom-10 bg-gray-800 border border-white/10 rounded-lg shadow-lg z-50 min-w-[220px] overflow-hidden">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                handleGoToProgres(asesmen.id_asesmen);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-gray-700/50 border-b border-white/10 transition-all flex items-center gap-2 text-white"
                            >
                              <FaChartBar className="text-emerald-300" />
                              Progres Pengerjaan
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                handleGoToAnalisis(asesmen.id_asesmen);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-gray-700/50 transition-all flex items-center gap-2 text-white"
                            >
                              <FaChartLine className="text-violet-300" />
                              Hasil Analisis
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

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
    </div>
  );
}
