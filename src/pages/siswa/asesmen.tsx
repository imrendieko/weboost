import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import SiswaNavbar from '@/components/SiswaNavbar';
import supabase from '@/lib/db';
import { FaClipboardList } from 'react-icons/fa';

interface SiswaSession {
  id_siswa: number;
  nama_siswa: string;
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

function getCurrentDate() {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const now = new Date();
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

export default function AsesmenSiswa() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [siswaSession, setSiswaSession] = useState<SiswaSession | null>(null);
  const [elemenOptions, setElemenOptions] = useState<ElemenOption[]>([]);
  const [elemenAsesmenPreviewMap, setElemenAsesmenPreviewMap] = useState<Record<number, string[]>>({});

  useEffect(() => {
    const loadData = async () => {
      const rawSession = localStorage.getItem('siswa_session');
      if (!rawSession) {
        router.push('/login');
        return;
      }

      const session = JSON.parse(rawSession) as SiswaSession;
      setSiswaSession(session);

      const { data, error } = await supabase
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

      if (!error) {
        setElemenOptions(
          ((data as Array<any>) || []).map((item) => ({
            id_elemen: item.id_elemen,
            nama_elemen: item.nama_elemen,
            sampul_elemen: item.sampul_elemen,
            guru_pengampu: item.guru_pengampu,
            guru: Array.isArray(item.guru) ? item.guru[0] || null : item.guru || null,
            kelas: Array.isArray(item.kelas) ? item.kelas[0] || null : item.kelas || null,
          })),
        );

        const previewEntries = await Promise.all(
          ((data as Array<any>) || []).map(async (item) => {
            const { data: asesmenRows, error: asesmenError } = await supabase.from('asesmen').select('judul_asesmen').eq('id_elemen', item.id_elemen).order('created_at', { ascending: false });

            if (asesmenError || !asesmenRows) {
              return [item.id_elemen, [] as string[]] as const;
            }

            const judulAsesmen = (asesmenRows as Array<any>).map((row) => row.judul_asesmen).filter((judul: string) => typeof judul === 'string' && judul.trim().length > 0);

            return [item.id_elemen, judulAsesmen] as const;
          }) || [],
        );

        setElemenAsesmenPreviewMap(Object.fromEntries(previewEntries));
      }

      setLoading(false);
    };

    if (router.isReady) {
      loadData();
    }
  }, [router]);

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

          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <FaClipboardList className="text-white" />
              Pilih Elemen Asesmen
            </h2>

            {elemenOptions.length === 0 ? (
              <p className="text-gray-400">Belum ada elemen asesmen untuk kelas Anda.</p>
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
                        onClick={() => router.push(`/siswa/asesmen/${option.id_elemen}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            router.push(`/siswa/asesmen/${option.id_elemen}`);
                          }
                        }}
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
                          <p className="mt-1 text-xs text-gray-300">Pengampu: {option.guru?.nama_guru || 'Belum ditentukan'}</p>
                        </div>
                      </div>

                      <div
                        className="card-back bg-gradient-to-br from-[#0080FF] to-[#0050AA] border border-white/20 rounded-xl p-6 shadow-lg overflow-hidden cursor-pointer"
                        onClick={() => router.push(`/siswa/asesmen/${option.id_elemen}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            router.push(`/siswa/asesmen/${option.id_elemen}`);
                          }
                        }}
                      >
                        <h3 className="text-lg font-bold mb-3 text-white">Daftar Asesmen {option.nama_elemen}</h3>
                        <div className="space-y-2 overflow-y-auto max-h-44 pr-1">
                          {(elemenAsesmenPreviewMap[option.id_elemen] || []).length > 0 ? (
                            <ol className="list-decimal list-inside text-white/95 text-sm space-y-2">
                              {(elemenAsesmenPreviewMap[option.id_elemen] || []).map((judulAsesmen, index) => (
                                <li
                                  key={`${option.id_elemen}-${index}`}
                                  className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 transition-colors hover:bg-white/20 pointer-events-none"
                                >
                                  {judulAsesmen}
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <p className="text-white/85 text-sm">Belum ada asesmen pada elemen ini.</p>
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
      `}</style>
    </div>
  );
}
