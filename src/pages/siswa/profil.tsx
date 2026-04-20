import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SiswaNavbar from '@/components/SiswaNavbar';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import { FaUser, FaEnvelope, FaLock, FaSave, FaEye, FaEyeSlash, FaIdCard, FaArrowLeft } from 'react-icons/fa';
import supabase from '@/lib/db';

interface SiswaData {
  id_siswa: number;
  nama_siswa: string;
  email_siswa: string;
  password_siswa: string;
  nisn_siswa: string;
  lembaga_siswa: number;
  kelas_siswa: number;
}

interface Lembaga {
  id_lembaga: number;
  nama_lembaga: string;
}

interface Kelas {
  id_kelas: number;
  nama_kelas: string;
}

type NotificationType = 'success' | 'error';

interface Notification {
  show: boolean;
  message: string;
  type: NotificationType;
}
export default function ProfilSiswa() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [siswaData, setSiswaData] = useState<SiswaData | null>(null);
  const [lembaga, setLembaga] = useState<Lembaga | null>(null);
  const [kelas, setKelas] = useState<Kelas | null>(null);
  const [notification, setNotification] = useState<Notification>({ show: false, message: '', type: 'success' });
  const [formData, setFormData] = useState({
    nama_siswa: '',
    email_siswa: '',
    password_siswa: '',
    nisn_siswa: '',
  });

  const showNotification = (message: string, type: NotificationType) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

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
    if (!router.isReady) return;

    // Ambil profil siswa dari session aktif supaya form selalu sinkron.
    const loadProfile = async () => {
      try {
        const rawSession = localStorage.getItem('siswa_session');
        if (!rawSession) {
          window.location.replace('/');
          return;
        }

        const session = JSON.parse(rawSession);

        const { data: siswa, error: siswaError } = await supabase.from('siswa').select('*').eq('id_siswa', session.id_siswa).single();

        if (siswaError || !siswa) {
          localStorage.removeItem('siswa_session');
          window.location.replace('/');
          return;
        }

        const { data: lembagaData } = await supabase.from('lembaga').select('*').eq('id_lembaga', siswa.lembaga_siswa).single();
        const { data: kelasData } = await supabase.from('kelas').select('*').eq('id_kelas', siswa.kelas_siswa).single();

        setSiswaData(siswa);
        setLembaga(lembagaData || null);
        setKelas(kelasData || null);
        setFormData({
          nama_siswa: siswa.nama_siswa,
          email_siswa: siswa.email_siswa,
          password_siswa: siswa.password_siswa,
          nisn_siswa: siswa.nisn_siswa,
        });
      } catch (error) {
        console.error('Error loading siswa profile:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!siswaData) {
      return;
    }

    // Simpan perubahan profile ke API, lalu update session lokal biar navbar ikut berubah.
    setSubmitting(true);

    try {
      const response = await fetch(`/api/siswa/${siswaData.id_siswa}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_siswa: formData.nama_siswa,
          email_siswa: formData.email_siswa,
          password_siswa: formData.password_siswa,
          nisn_siswa: formData.nisn_siswa,
          kelas_siswa: siswaData.kelas_siswa,
          lembaga_siswa: siswaData.lembaga_siswa,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Gagal memperbarui profil siswa');
      }

      const rawSession = localStorage.getItem('siswa_session');
      if (rawSession) {
        const session = JSON.parse(rawSession);
        session.nama_siswa = result.data[0]?.nama_siswa || formData.nama_siswa;
        session.email_siswa = result.data[0]?.email_siswa || formData.email_siswa;
        localStorage.setItem('siswa_session', JSON.stringify(session));
      }

      showNotification('Profil berhasil diperbarui!', 'success');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Gagal memperbarui profil', 'error');
    } finally {
      setSubmitting(false);
    }
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
    <div className="min-h-screen bg-black text-white">
      <StarBackground />
      <SiswaNavbar siswaName={siswaData.nama_siswa} />

      <div className="relative z-10 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">Selamat Datang, {siswaData.nama_siswa.split(' ')[0]}!</h1>
              <p className="text-gray-400">{getCurrentDate()}</p>
            </div>
            <CountdownTimer showDate={false} />
          </div>

          <div className="mb-6 flex items-center gap-2 text-gray-400">
            <Link
              href="/dashboard"
              className="hover:text-[#0080FF] transition-colors"
            >
              dashboard
            </Link>
            <span>/</span>
            <span className="text-white">profil</span>
          </div>

          {notification.show && (
            <div className={`mb-6 p-4 rounded-lg ${notification.type === 'success' ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
              <p className={notification.type === 'success' ? 'text-black' : 'text-red-300'}>{notification.message}</p>
            </div>
          )}

          <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <FaUser className="text-2xl text-[#FFFFFF]" />
              <h2 className="text-2xl font-bold">Detail Personal</h2>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium mb-2">Nama Lengkap</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUser className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.nama_siswa}
                    onChange={(event) => setFormData((current) => ({ ...current, nama_siswa: event.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#0080FF]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={formData.email_siswa}
                    onChange={(event) => setFormData((current) => ({ ...current, email_siswa: event.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#0080FF]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">NISN</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaIdCard className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.nisn_siswa}
                    onChange={(event) => setFormData((current) => ({ ...current, nisn_siswa: event.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#0080FF]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Lembaga</label>
                <div className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400">{lembaga?.nama_lembaga || '-'}</div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Kelas</label>
                <div className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400">{kelas?.nama_kelas || '-'}</div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <div className="password-input-wrapper relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password_siswa}
                    onChange={(event) => setFormData((current) => ({ ...current, password_siswa: event.target.value }))}
                    className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#0080FF]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="password-input-toggle text-gray-500"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                    style={{
                      position: 'absolute',
                      right: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '20px',
                      height: '20px',
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                      boxShadow: 'none',
                    }}
                  >
                    {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="mana-btn mana-btn--neutral px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <FaArrowLeft />
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="mana-btn mana-btn--primary px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <FaSave />
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
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
    </div>
  );
}
