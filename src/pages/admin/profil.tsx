import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminNavbar from '@/components/AdminNavbar';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import { FaUser, FaEnvelope, FaLock, FaArrowLeft, FaSave, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAdminTheme } from '@/contexts/AdminThemeContext';

interface AdminData {
  id_admin: number;
  nama_admin: string;
  email_admin: string;
  password_admin: string;
}

type NotificationType = 'success' | 'error';

interface Notification {
  show: boolean;
  message: string;
  type: NotificationType;
}

export default function ProfilAdmin() {
  const router = useRouter();
  const { theme } = useAdminTheme();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [formData, setFormData] = useState({
    nama_admin: '',
    email_admin: '',
    password_admin: '',
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

    // Pastikan admin login dulu, baru isi form profile dari API.
    const checkAdminAuth = async () => {
      try {
        const adminSession = localStorage.getItem('admin_session');

        if (!adminSession) {
          window.location.replace('/');
          return;
        }

        const sessionData = JSON.parse(adminSession);

        // Fetch admin profile
        const response = await fetch(`/api/admin/profil?id=${sessionData.id_admin}`);
        const data = await response.json();

        if (!response.ok) {
          console.error('Error fetching admin profile:', data.error);
          localStorage.removeItem('admin_session');
          window.location.replace('/');
          return;
        }

        setAdminData(data);
        setFormData({
          nama_admin: data.nama_admin,
          email_admin: data.email_admin,
          password_admin: data.password_admin,
        });

        setLoading(false);
      } catch (error) {
        console.error('Error during authentication check:', error);
        window.location.replace('/');
      }
    };

    checkAdminAuth();
  }, [router]);

  const showNotification = (message: string, type: NotificationType) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adminData) return;

    if (!formData.nama_admin.trim() || !formData.email_admin.trim() || !formData.password_admin.trim()) {
      showNotification('Semua field harus diisi', 'error');
      return;
    }

    // Submit perubahan profile dan sinkronkan juga data sesi di localStorage.
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/profil', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: adminData.id_admin,
          nama_admin: formData.nama_admin,
          email_admin: formData.email_admin,
          password_admin: formData.password_admin,
        }),
      });

      const result = await response.json();

      console.log('API Response:', response.status, result);

      if (!response.ok) {
        throw new Error(result.error || 'Gagal memperbarui profil admin');
      }

      // Update local storage with new data
      const adminSession = localStorage.getItem('admin_session');
      if (adminSession) {
        const sessionData = JSON.parse(adminSession);
        sessionData.email_admin = result.data.email_admin;
        sessionData.nama_admin = result.data.nama_admin;
        localStorage.setItem('admin_session', JSON.stringify(sessionData));
      }

      setAdminData(result.data);
      setFormData({
        nama_admin: result.data.nama_admin,
        email_admin: result.data.email_admin,
        password_admin: result.data.password_admin,
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

  if (!adminData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <StarBackground />

      {/* Navbar */}
      <AdminNavbar adminName={adminData.nama_admin} />

      {/* Main Content */}
      <div className="relative z-10 pt-32 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">Selamat Datang, {adminData.nama_admin.split(' ')[0]}!</h1>
              <p className="text-gray-400">{getCurrentDate()}</p>
            </div>
            <CountdownTimer showDate={false} />
          </div>

          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-gray-400">
            <Link
              href="/admin"
              className="hover:text-[#0080FF] transition-colors"
            >
              admin
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
                  htmlFor="nama_admin"
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
                    id="nama_admin"
                    name="nama_admin"
                    value={formData.nama_admin}
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
                  htmlFor="email_admin"
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
                    id="email_admin"
                    name="email_admin"
                    value={formData.email_admin}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0080FF] focus:border-transparent transition-all"
                    placeholder="Masukkan email"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              {/* Password */}
              <div>
                <label
                  htmlFor="password_admin"
                  className="block text-sm font-medium mb-2"
                >
                  Password
                </label>
                <div className="password-input-wrapper relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password_admin"
                    name="password_admin"
                    value={formData.password_admin}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0080FF] focus:border-transparent transition-all"
                    placeholder="Masukkan password"
                    required
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
