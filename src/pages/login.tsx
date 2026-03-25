import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import StarBackground from '@/components/StarBackground';
import AuthBb8Mascot from '@/components/AuthBb8Mascot';
import { FaEye, FaEyeSlash, FaHome, FaSignInAlt } from 'react-icons/fa';

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login gagal');
      }

      // Login successful - store session and redirect based on user type
      if (data.userType === 'admin') {
        localStorage.setItem(
          'admin_session',
          JSON.stringify({
            id_admin: data.user.id,
            email_admin: data.user.email,
            nama_admin: data.user.nama,
          }),
        );
        router.push('/admin');
      } else if (data.userType === 'siswa') {
        localStorage.setItem(
          'siswa_session',
          JSON.stringify({
            id_siswa: data.user.id,
            email_siswa: data.user.email,
            nama_siswa: data.user.nama,
            nisn_siswa: data.user.nisn,
            kelas_siswa: data.user.kelas,
            lembaga_siswa: data.user.lembaga,
          }),
        );
        router.push('/dashboard');
      } else if (data.userType === 'guru') {
        localStorage.setItem(
          'guru_session',
          JSON.stringify({
            id_guru: data.user.id,
            email_guru: data.user.email,
            nama_guru: data.user.nama,
            nip_guru: data.user.nip,
            lembaga_guru: data.user.lembaga,
            status_guru: data.user.status,
          }),
        );
        router.push('/dashboard-guru');
      }
    } catch (err: any) {
      setError(err.message || 'Email atau password salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page relative min-h-screen flex flex-col overflow-hidden">
      {/* Star Background */}
      <StarBackground />

      {/* Header dengan Logo */}
      <header className="admin-navbar w-full px-6 py-2 border-b relative z-10">
        <div className="max-w-7xl mx-auto flex justify-center">
          <Link href="/">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative w-50 h-20"
            >
              <Image
                src="/logo_weboost.png"
                alt="WeBoost"
                fill
                className="object-contain"
              />
            </motion.div>
          </Link>
        </div>
      </header>

      {/* Main Content - Split Screen */}
      <div className="auth-layout flex-1 flex items-center justify-center px-6 pb-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="auth-card w-full max-w-5xl overflow-hidden flex flex-col md:flex-row"
          style={{ minHeight: '500px' }}
        >
          {/* Left Side - Welcome Message */}
          <div className="auth-info-pane w-full md:w-1/2 flex flex-col justify-center items-center text-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <AuthBb8Mascot />
            </motion.div>
          </div>

          {/* Right Side - Login Form */}
          <div className="auth-form-pane w-full md:w-1/2 p-12 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="auth-alert-error px-4 py-3 rounded-lg mb-6"
                >
                  {error}
                </motion.div>
              )}

              <form
                onSubmit={handleSubmit}
                className="auth-form space-y-6"
              >
                {/* Email */}
                <div>
                  <label className="auth-field-label text-lg font-semibold mb-3 block">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="auth-field-input w-full rounded-xl px-5 py-4 focus:outline-none transition-all"
                    placeholder="Contoh: namakamu@email.com"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="auth-field-label text-lg font-semibold mb-3 block">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="auth-field-input w-full rounded-xl px-5 py-4 pr-12 focus:outline-none transition-all"
                      placeholder="Masukkan password Anda"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="auth-password-toggle absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                    >
                      {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Register Link */}
                <div className="text-center">
                  <p className="auth-inline-note text-sm">
                    Belum punya akun?{' '}
                    <Link
                      href="/register"
                      className="auth-inline-link font-semibold"
                    >
                      Daftar
                    </Link>
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <Link
                    href="/"
                    className="flex-1"
                  >
                    <button
                      type="button"
                      className="mana-btn mana-btn--neutral w-full font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <FaHome size={18} />
                      Beranda
                    </button>
                  </Link>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mana-btn mana-btn--primary flex-1 font-semibold py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <FaSignInAlt size={18} />
                    {loading ? 'Masuk...' : 'Masuk'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
