import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import StarBackground from '@/components/StarBackground';
import AuthBb8Mascot from '@/components/AuthBb8Mascot';
import { isValidEmailFormat } from '@/lib/utils';
import { FaUserGraduate, FaChalkboardTeacher, FaEye, FaEyeSlash, FaHome, FaUserPlus, FaCheckCircle } from 'react-icons/fa';

type UserType = 'siswa' | 'guru';

interface Lembaga {
  id_lembaga: number;
  nama_lembaga: string;
}

interface Kelas {
  id_kelas: number;
  nama_kelas: string;
}

export default function Register() {
  const router = useRouter();
  // userType nentuin form ini lagi mode daftar siswa atau guru.
  const [userType, setUserType] = useState<UserType>('siswa');
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    password: '',
    nisn: '',
    nuptk: '',
    sekolah: '',
    kelas: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lembagaList, setLembagaList] = useState<Lembaga[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);

  // Fetch lembaga and kelas data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Isi dropdown sekolah/lembaga dari API.
        // Fetch lembaga
        const lembagaResponse = await fetch('/api/lembaga');
        const lembagaData = await lembagaResponse.json();
        if (Array.isArray(lembagaData)) {
          setLembagaList(lembagaData);
        }

        // Isi dropdown kelas dari API.
        // Fetch kelas
        const kelasResponse = await fetch('/api/kelas');
        const kelasData = await kelasResponse.json();
        if (Array.isArray(kelasData)) {
          setKelasList(kelasData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Khusus NISN/NUPTK kita paksa angka biar user gak bisa ketik huruf.
    if (name === 'nisn' || name === 'nuptk') {
      const numericOnly = value.replace(/\D/g, '');
      setFormData({
        ...formData,
        [name]: numericOnly,
      });
      return;
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validasi dasar dulu biar request yang dikirim sudah rapi.
    if (!formData.nama.trim()) {
      setError('Nama lengkap wajib diisi!');
      return;
    }

    if (!formData.email.trim()) {
      setError('Email wajib diisi!');
      return;
    }

    if (!isValidEmailFormat(formData.email)) {
      setError('Format email tidak valid!');
      return;
    }

    if (!formData.sekolah) {
      setError('Sekolah/Lembaga wajib dipilih!');
      return;
    }

    if (userType === 'siswa' && !formData.kelas) {
      setError('Kelas wajib dipilih!');
      return;
    }

    if (userType === 'siswa' && !formData.nisn) {
      setError('NISN wajib diisi!');
      return;
    }

    if (userType === 'guru' && !formData.nuptk) {
      setError('NUPTK wajib diisi!');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter!');
      return;
    }

    if (userType === 'siswa' && !/^\d+$/.test(formData.nisn)) {
      setError('NISN hanya boleh berisi angka!');
      return;
    }

    if (userType === 'siswa' && formData.nisn.length < 10) {
      setError('NISN tidak boleh kurang dari 10 digit!');
      return;
    }

    if (userType === 'guru' && !/^\d+$/.test(formData.nuptk)) {
      setError('NUPTK hanya boleh berisi angka!');
      return;
    }

    if (userType === 'guru' && formData.nuptk.length !== 16) {
      setError('NUPTK harus terdiri dari tepat 16 digit!');
      return;
    }

    const normalizedEmail = formData.email.trim().toLowerCase();

    setLoading(true);

    try {
      // Endpoint beda tergantung role pendaftar.
      // Determine API endpoint based on user type
      const endpoint = userType === 'siswa' ? '/api/auth/register-siswa' : '/api/auth/register-guru';

      // Bentuk payload disesuaikan sama kebutuhan endpoint.
      // Prepare request data
      const requestData =
        userType === 'siswa'
          ? {
              nama: formData.nama,
              email: normalizedEmail,
              password: formData.password,
              nisn: formData.nisn,
              lembaga: formData.sekolah,
              kelas: formData.kelas,
            }
          : {
              nama: formData.nama,
              email: normalizedEmail,
              password: formData.password,
              nuptk: formData.nuptk,
              lembaga: formData.sekolah,
            };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Terjadi kesalahan saat registrasi');
      }

      // Kalau sukses, tampilkan notifikasi lalu otomatis arahkan ke login.
      // Registration successful - show success message and redirect after 3 seconds
      setSuccess(true);
      setSuccessMessage(data.message || 'Registrasi berhasil! Akun Anda menunggu validasi admin sebelum bisa login.');
      setError('');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat registrasi');
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

      <div className="auth-layout flex-1 flex items-center justify-center p-6 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="auth-card w-full max-w-5xl overflow-hidden"
        >
          <div className="grid md:grid-cols-2 min-h-[auto] md:min-h-[700px]">
            {/* Left Side - Info */}
            <div className="auth-info-pane p-6 md:p-12 flex flex-col justify-center items-center text-center">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <AuthBb8Mascot />
              </motion.div>
            </div>

            {/* Right Side - Form */}
            <div className="auth-form-pane p-4 sm:p-6 md:p-10">
              {/* Tab Switch */}
              <div className="auth-role-switch flex gap-0 mb-6 rounded-lg p-1">
                <button
                  onClick={() => setUserType('siswa')}
                  className={`auth-role-option flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-all duration-300 ${userType === 'siswa' ? 'is-active' : ''}`}
                >
                  <FaUserGraduate />
                  Siswa
                </button>
                <button
                  onClick={() => setUserType('guru')}
                  className={`auth-role-option flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-all duration-300 ${userType === 'guru' ? 'is-active' : ''}`}
                >
                  <FaChalkboardTeacher />
                  Guru
                </button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="auth-alert-error px-4 py-3 rounded-lg mb-4 text-sm"
                >
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="auth-alert-success px-5 py-4 rounded-xl mb-4 flex items-center gap-3"
                >
                  <FaCheckCircle className="auth-alert-success-icon text-2xl flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-base mb-1">Registrasi Berhasil!</p>
                    <p className="text-sm">{successMessage}</p>
                    <p className="text-sm mt-1 opacity-95">Mengarahkan ke halaman login...</p>
                  </div>
                </motion.div>
              )}

              <form
                onSubmit={handleSubmit}
                noValidate
                className="auth-form space-y-4"
              >
                {/* Nama */}
                <div>
                  <label className="auth-field-label font-semibold mb-2 block">Nama Lengkap</label>
                  <input
                    type="text"
                    name="nama"
                    value={formData.nama}
                    onChange={handleChange}
                    required
                    className="auth-field-input w-full rounded-xl px-4 py-3 focus:outline-none"
                    placeholder="Isi dengan nama lengkap Anda"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="auth-field-label font-semibold mb-2 block">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="auth-field-input w-full rounded-xl px-4 py-3 focus:outline-none"
                    placeholder="Contoh: namakamu@email.com"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="auth-field-label font-semibold mb-2 block">Password</label>
                  <div className="password-input-wrapper relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="auth-field-input w-full rounded-xl px-4 py-3 pr-12 focus:outline-none"
                      placeholder="Minimal 6 karakter"
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
                        transform: 'translateY(calc(-50% + 1px))',
                        width: '22px',
                        height: '22px',
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

                {/* NISN (Siswa) or NUPTK (Guru) */}
                {userType === 'siswa' ? (
                  <div>
                    <label className="auth-field-label font-semibold mb-2 block">NISN</label>
                    <input
                      type="text"
                      name="nisn"
                      value={formData.nisn}
                      onChange={handleChange}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      required
                      className="auth-field-input w-full rounded-xl px-4 py-3 focus:outline-none"
                      placeholder="10 digit Nomor Induk Siswa Nasional"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="auth-field-label font-semibold mb-2 block">NUPTK</label>
                    <input
                      type="text"
                      name="nuptk"
                      value={formData.nuptk}
                      onChange={handleChange}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={16}
                      required
                      className="auth-field-input w-full rounded-xl px-4 py-3 focus:outline-none"
                      placeholder="16 digit NUPTK"
                    />
                  </div>
                )}

                {/* Sekolah/Lembaga */}
                <div>
                  <label className="auth-field-label font-semibold mb-2 block">Sekolah/Lembaga</label>
                  <div className="relative">
                    <select
                      name="sekolah"
                      value={formData.sekolah}
                      onChange={handleChange}
                      required
                      className="auth-field-input w-full rounded-xl px-4 py-3 focus:outline-none appearance-none cursor-pointer"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23000000'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 1rem center',
                        backgroundSize: '1.5rem',
                      }}
                    >
                      <option value="">Pilih Sekolah/Lembaga</option>
                      {lembagaList.map((lembaga) => (
                        <option
                          key={lembaga.id_lembaga}
                          value={lembaga.id_lembaga}
                        >
                          {lembaga.nama_lembaga}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Kelas (Siswa only) */}
                {userType === 'siswa' && (
                  <div>
                    <label className="auth-field-label font-semibold mb-2 block">Kelas</label>
                    <div className="relative">
                      <select
                        name="kelas"
                        value={formData.kelas}
                        onChange={handleChange}
                        required
                        className="auth-field-input w-full rounded-xl px-4 py-3 focus:outline-none appearance-none cursor-pointer"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23000000'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 1rem center',
                          backgroundSize: '1.5rem',
                        }}
                      >
                        <option value="">Pilih Kelas</option>
                        {kelasList.map((kelas) => (
                          <option
                            key={kelas.id_kelas}
                            value={kelas.id_kelas}
                          >
                            {kelas.nama_kelas}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="text-center pt-2">
                  <p className="auth-inline-note text-sm mb-4">
                    Sudah punya akun?{' '}
                    <Link
                      href="/login"
                      className="auth-inline-link font-semibold"
                    >
                      Masuk
                    </Link>
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-2">
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
                    {loading ? (
                      'Mendaftar...'
                    ) : (
                      <>
                        <FaUserPlus size={18} />
                        Daftar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
