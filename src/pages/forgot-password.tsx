import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import StarBackground from '@/components/StarBackground';
import AuthBb8Mascot from '@/components/AuthBb8Mascot';
import { FaArrowLeft, FaCheckCircle, FaEnvelope, FaEye, FaEyeSlash, FaKey, FaLock, FaTimesCircle } from 'react-icons/fa';

type StepType = 'email' | 'otp' | 'password' | 'done';
type NoticeType = 'success' | 'error';

export default function ForgotPasswordPage() {
  const router = useRouter();
  // step dipakai buat nentuin user lagi di tahap mana: email -> otp -> password -> selesai.
  const [step, setStep] = useState<StepType>('email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [notice, setNotice] = useState<{ show: boolean; type: NoticeType; message: string }>({
    show: false,
    type: 'success',
    message: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Helper kecil biar notifikasi sukses/error bisa dipanggil dari mana aja.
  const showNotice = (message: string, type: NoticeType) => {
    setNotice({ show: true, message, type });
    window.setTimeout(() => {
      setNotice((current) => ({ ...current, show: false }));
    }, 3500);
  };

  const handleRequestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      // Tahap 1: kirim email, backend bakal kirim OTP + challenge token.
      const response = await fetch('/api/auth/forgot-password/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Gagal mengirim OTP');
      }

      // Simpan challenge token untuk dipakai di tahap verifikasi OTP.
      setChallengeToken(result.challengeToken);
      setStep('otp');
      showNotice('Kode OTP berhasil dikirim ke email Anda.', 'success');
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Gagal mengirim OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      // Tahap 2: cek OTP, kalau valid backend balikin reset token.
      const response = await fetch('/api/auth/forgot-password/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeToken, otp }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'OTP tidak valid');
      }

      // Reset token dipakai buat otorisasi ganti password di tahap akhir.
      setResetToken(result.resetToken);
      setStep('password');
      showNotice('OTP benar. Silakan buat password baru.', 'success');
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'OTP tidak valid', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      // Tahap 3: submit password baru + reset token.
      const response = await fetch('/api/auth/forgot-password/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken,
          password,
          confirmPassword,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Gagal menyimpan password baru');
      }

      // Kalau berhasil, kasih info lalu arahkan lagi ke login.
      setStep('done');
      showNotice('Password berhasil diperbarui.', 'success');
      window.setTimeout(() => {
        router.push('/login');
      }, 1800);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Gagal menyimpan password baru', 'error');
    } finally {
      setLoading(false);
    }
  };

  const maskedEmail = email.replace(/(.{2}).+(@.+)/, '$1***$2');

  const handleBack = () => {
    // Kalau bisa balik history, pakai itu. Kalau enggak, fallback ke halaman login.
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/login');
  };

  return (
    <div className="auth-page relative min-h-screen flex flex-col overflow-hidden">
      <StarBackground />

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

      <div className="auth-layout flex-1 flex items-center justify-center px-6 pb-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="auth-card w-full max-w-5xl overflow-hidden flex flex-col md:flex-row min-h-[auto] md:min-h-[500px]"
        >
          <div className="auth-info-pane w-full md:w-1/2 flex flex-col justify-center items-center text-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <AuthBb8Mascot />
            </motion.div>
          </div>

          <div className="auth-form-pane w-full md:w-1/2 p-6 md:p-12 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <h2 className="auth-info-title text-2xl font-bold mb-2">Lupa Password</h2>
              <p className="auth-inline-note text-sm mb-6">Ikuti langkah reset password melalui OTP email.</p>

              {notice.show && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`px-4 py-3 rounded-lg mb-5 flex items-center gap-2 ${notice.type === 'success' ? 'auth-alert-success' : 'auth-alert-error'}`}
                >
                  {notice.type === 'success' ? <FaCheckCircle /> : <FaTimesCircle />}
                  <span>{notice.message}</span>
                </motion.div>
              )}

              {step === 'email' && (
                <form
                  onSubmit={handleRequestOtp}
                  className="auth-form space-y-5"
                >
                  <div>
                    <label className="auth-field-label text-lg font-semibold mb-3 block">Email Terdaftar</label>
                    <div className="relative">
                      <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        className="auth-field-input w-full rounded-xl pl-11 pr-4 py-4 focus:outline-none transition-all"
                        placeholder="Contoh: namakamu@email.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mana-btn mana-btn--primary w-full font-semibold py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    <FaEnvelope />
                    {loading ? 'Mengirim OTP...' : 'Kirim Kode OTP'}
                  </button>
                </form>
              )}

              {step === 'otp' && (
                <form
                  onSubmit={handleVerifyOtp}
                  className="auth-form space-y-5"
                >
                  <div className="auth-step-badge rounded-xl px-4 py-3 text-sm">Kode OTP sudah dikirim ke {maskedEmail}</div>

                  <div>
                    <label className="auth-field-label text-lg font-semibold mb-3 block">Masukkan OTP</label>
                    <div className="relative">
                      <FaKey className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={otp}
                        onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        className="auth-field-input w-full rounded-xl pl-11 pr-4 py-4 tracking-[0.24em] sm:tracking-[0.4em] text-center text-lg focus:outline-none transition-all"
                        placeholder="______"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mana-btn mana-btn--primary w-full font-semibold py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    <FaCheckCircle />
                    {loading ? 'Memvalidasi OTP...' : 'Verifikasi OTP'}
                  </button>
                </form>
              )}

              {step === 'password' && (
                <form
                  onSubmit={handleSavePassword}
                  className="auth-form space-y-5"
                >
                  <div>
                    <label className="auth-field-label text-lg font-semibold mb-3 block">Password Baru</label>
                    <div className="relative">
                      <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        minLength={6}
                        className="auth-field-input w-full rounded-xl pl-11 pr-12 py-4 focus:outline-none transition-all"
                        placeholder="Minimal 6 karakter"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="auth-password-toggle absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                      >
                        {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="auth-field-label text-lg font-semibold mb-3 block">Konfirmasi Password Baru</label>
                    <div className="relative">
                      <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        required
                        minLength={6}
                        className="auth-field-input w-full rounded-xl pl-11 pr-12 py-4 focus:outline-none transition-all"
                        placeholder="Ulangi password baru"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((current) => !current)}
                        className="auth-password-toggle absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                      >
                        {showConfirmPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mana-btn mana-btn--primary w-full font-semibold py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    <FaLock />
                    {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
                  </button>
                </form>
              )}

              {step === 'done' && (
                <div className="auth-step-done rounded-xl px-4 py-5">
                  <p className="font-semibold">Password berhasil diperbarui.</p>
                  <p className="text-sm mt-2">Anda akan diarahkan kembali ke halaman login.</p>
                </div>
              )}

              <div className="pt-5">
                <button
                  type="button"
                  onClick={handleBack}
                  className="mana-btn mana-btn--neutral w-full font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <FaArrowLeft size={18} />
                  Kembali
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
