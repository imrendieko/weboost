import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import GuruNavbar from '@/components/GuruNavbar';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import { FaUser, FaEnvelope, FaLock, FaArrowLeft, FaSave, FaEye, FaEyeSlash, FaIdCard } from 'react-icons/fa';
import { useRoleTheme } from '@/lib/useRoleTheme';
import supabase from '@/lib/db';

interface GuruData {
  id_guru: number;
  nama_guru: string;
  email_guru: string;
  password_guru?: string;
  nuptk_guru: string;
  lembaga_guru: number;
}

interface Lembaga {
  id_lembaga: number;
  nama_lembaga: string;
}

type NotificationType = 'success' | 'error';

interface Notification {
  show: boolean;
  message: string;
  type: NotificationType;
}

export default function ProfilGuru() {
  const router = useRouter();
  const { theme } = useRoleTheme();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [guruData, setGuruData] = useState<GuruData | null>(null);
  const [lembaga, setLembaga] = useState<Lembaga | null>(null);
  const [formData, setFormData] = useState({
    nama_guru: '',
    email_guru: '',
    password_guru: '',
    nuptk_guru: '',
  });
  const [notification, setNotification] = useState<Notification>({
    show: false,
    message: '',
    type: 'success',
  });

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

    // Cek login guru lalu isi form profile dengan data terbaru dari database.
    const checkGuruAuth = async () => {
      try {
        const guruSession = localStorage.getItem('guru_session');

        if (!guruSession) {
          window.location.replace('/');
          return;
        }

        const sessionData = JSON.parse(guruSession);

        // Fetch guru profile
        const { data: guru, error: guruError } = await supabase.from('guru').select('*').eq('id_guru', sessionData.id_guru).single();

        if (guruError || !guru) {
          console.error('Error fetching guru profile:', guruError);
          localStorage.removeItem('guru_session');
          window.location.replace('/');
          return;
        }

        // Fetch lembaga
        const { data: lembagaData } = await supabase.from('lembaga').select('*').eq('id_lembaga', guru.lembaga_guru).single();

        setGuruData(guru);
        setLembaga(lembagaData);
        setFormData({
          nama_guru: guru.nama_guru,
          email_guru: guru.email_guru,
          // Password tidak diisi otomatis demi keamanan; isi hanya saat ingin mengganti.
          password_guru: '',
          nuptk_guru: String(guru.nuptk_guru ?? '').replace(/\D/g, ''),
        });

        setLoading(false);
      } catch (error) {
        console.error('Error during authentication check:', error);
        window.location.replace('/');
      }
    };

    checkGuruAuth();
  }, [router]);

  const showNotification = (message: string, type: NotificationType) => {
    // Notif dibuat auto-hide biar feedback tetap ada tapi gak ganggu lama.
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'nuptk_guru') {
      const numericOnly = value.replace(/\D/g, '');
      setFormData((prev) => ({
        ...prev,
        [name]: numericOnly,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guruData) return;

    const normalizedNUPTK = String(formData.nuptk_guru ?? '').replace(/\D/g, '');

    if (!formData.nama_guru.trim() || !formData.email_guru.trim() || !normalizedNUPTK) {
      showNotification('Semua field harus diisi', 'error');
      return;
    }

    if (normalizedNUPTK.length !== 16) {
      showNotification('NUPTK harus terdiri dari tepat 16 digit', 'error');
      return;
    }

    // Saat submit, data dikirim ke API lalu session lokal ikut disinkronkan.
    setSubmitting(true);

    try {
      const response = await fetch(`/api/guru/${guruData.id_guru}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nama_guru: formData.nama_guru,
          email_guru: formData.email_guru,
          password_guru: formData.password_guru.trim(),
          nuptk_guru: normalizedNUPTK,
          lembaga_guru: guruData.lembaga_guru,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal memperbarui profil guru');
      }

      // Update local storage with new data
      const guruSession = localStorage.getItem('guru_session');
      if (guruSession) {
        const sessionData = JSON.parse(guruSession);
        sessionData.email_guru = result.data.email_guru;
        sessionData.nama_guru = result.data.nama_guru;
        localStorage.setItem('guru_session', JSON.stringify(sessionData));
      }

      setGuruData(result.data);
      setFormData({
        nama_guru: result.data.nama_guru,
        email_guru: result.data.email_guru,
        password_guru: '',
        nuptk_guru: String(result.data.nuptk_guru ?? '').replace(/\D/g, ''),
      });
      showNotification('Profil berhasil diperbarui!', 'success');
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Gagal memperbarui profil';
      showNotification(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <StarBackground />
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!guruData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <StarBackground />

      {/* Navbar */}
      <GuruNavbar guruName={guruData.nama_guru} />

      {/* Main Content */}
      <div className="relative z-10 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">Selamat Datang, {guruData.nama_guru.split(' ')[0]}!</h1>
              <p className="text-gray-400">{getCurrentDate()}</p>
            </div>
            <CountdownTimer showDate={false} />
          </div>

          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-gray-400">
            <Link
              href="/dashboard-guru"
              className="hover:text-[#0080FF] transition-colors"
            >
              dashboard-guru
            </Link>
            <span>/</span>
            <span className="text-white">profil</span>
          </div>

          {/* Notification */}
          {notification.show && (
            <div className={`mb-6 p-4 rounded-lg ${notification.type === 'success' ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
              <p className={notification.type === 'success' ? 'text-black' : 'text-red-300'}>{notification.message}</p>
            </div>
          )}

          {/* Profile Form */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <FaUser className={`text-2xl ${theme === 'light' ? 'text-gray-900' : 'text-[#FFFFFF]'}`} />
              <h2 className="text-2xl font-bold">Detail Personal</h2>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* Nama Lengkap */}
              <div>
                <label
                  htmlFor="nama_guru"
                  className="block text-sm font-medium mb-2"
                >
                  Nama Lengkap
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUser className={theme === 'light' ? 'text-gray-600' : 'text-gray-400'} />
                  </div>
                  <input
                    type="text"
                    id="nama_guru"
                    name="nama_guru"
                    value={formData.nama_guru}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0080FF] focus:border-transparent transition-all"
                    placeholder="Masukkan nama lengkap"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email_guru"
                  className="block text-sm font-medium mb-2"
                >
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className={theme === 'light' ? 'text-gray-600' : 'text-gray-400'} />
                  </div>
                  <input
                    type="email"
                    id="email_guru"
                    name="email_guru"
                    value={formData.email_guru}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0080FF] focus:border-transparent transition-all"
                    placeholder="Masukkan email"
                    required
                  />
                </div>
              </div>

              {/* NUPTK */}
              <div>
                <label
                  htmlFor="nuptk_guru"
                  className="block text-sm font-medium mb-2"
                >
                  NUPTK
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaIdCard className={theme === 'light' ? 'text-gray-600' : 'text-gray-400'} />
                  </div>
                  <input
                    type="text"
                    id="nuptk_guru"
                    name="nuptk_guru"
                    value={formData.nuptk_guru}
                    onChange={handleInputChange}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={16}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0080FF] focus:border-transparent transition-all"
                    placeholder="Masukkan NUPTK (16 digit)"
                    required
                  />
                </div>
              </div>

              {/* Lembaga (Read-only) */}
              <div>
                <label className="block text-sm font-medium mb-2">Lembaga</label>
                <div className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400">{lembaga?.nama_lembaga || 'Loading...'}</div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password_guru"
                  className="block text-sm font-medium mb-2"
                >
                  Password
                </label>
                <div className="password-input-wrapper relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password_guru"
                    name="password_guru"
                    value={formData.password_guru}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0080FF] focus:border-transparent transition-all"
                    placeholder="Isi jika ingin mengganti password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
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
                  onClick={handleBack}
                  className="mana-btn mana-btn--neutral px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <FaArrowLeft />
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="mana-btn mana-btn--primary px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaSave />
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

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
    </div>
  );
}
