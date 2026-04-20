import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import StarBackground from '@/components/StarBackground';
import Navbar from '@/components/Navbar';
import FeatureCards from '@/components/FeatureCards';
import AuthBb8Mascot from '@/components/AuthBb8Mascot';
import Image from 'next/image';
import { FaRocket, FaHandshake, FaUserPlus, FaSignInAlt } from 'react-icons/fa';

const HERO_TYPED_WORDS = ['Boost', 'Tingkatkan'];

const Home = () => {
  // Tiga state ini dipakai buat efek teks ketik-hapus otomatis di judul hero.
  const [wordIndex, setWordIndex] = useState(0);
  const [typedWord, setTypedWord] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Ambil kata aktif berdasarkan index, lalu ketik/hapus per karakter.
    const currentWord = HERO_TYPED_WORDS[wordIndex];
    const isWordComplete = typedWord === currentWord;
    const isWordEmpty = typedWord === '';

    let timeoutDelay = isDeleting ? 70 : 120;

    if (isWordComplete && !isDeleting) {
      timeoutDelay = 1200;
    }

    const timeout = setTimeout(() => {
      // Kalau sudah selesai ngetik, tunggu sebentar lalu mulai hapus.
      if (isWordComplete && !isDeleting) {
        setIsDeleting(true);
        return;
      }

      // Kalau sudah habis terhapus, pindah ke kata berikutnya.
      if (isWordEmpty && isDeleting) {
        setIsDeleting(false);
        setWordIndex((prevIndex) => (prevIndex + 1) % HERO_TYPED_WORDS.length);
        return;
      }

      // Tambah atau kurangin panjang teks satu-satu biar animasinya natural.
      const nextLength = typedWord.length + (isDeleting ? -1 : 1);
      setTypedWord(currentWord.slice(0, nextLength));
    }, timeoutDelay);

    return () => clearTimeout(timeout);
  }, [typedWord, isDeleting, wordIndex]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Star Background */}
      <StarBackground />

      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section
        id="beranda"
        className="relative min-h-screen flex items-center justify-center px-6 pt-24"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center"
        >
          <div className="text-left">
            <h1 className="text-white text-4xl md:text-5xl xl:text-6xl font-bold mb-6 leading-tight">
              <span className="text-[#0080FF] inline-flex items-center min-w-[220px] md:min-w-[300px]">
                {typedWord}
                <span className="ml-1 inline-block h-[1em] w-[2px] bg-[#0080FF] animate-pulse" />
              </span>{' '}
              Pengetahuan Kamu Setiap Hari!
            </h1>
            <p className="text-gray-300 text-lg md:text-xl mb-8 max-w-2xl">LMS WeBoost akan membantu proses belajar kamu menjadi 100% lebih mudah dan menyenangkan. Mulai dan terus belajar bersama kami!</p>

            <div className="flex flex-wrap items-center gap-4 mb-10">
              <Link href="/register">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="mana-btn mana-btn--primary px-6 py-3 font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(0,128,255,0.5)] flex items-center gap-2"
                >
                  <FaUserPlus size={18} />
                  Daftar
                </motion.button>
              </Link>
              <Link href="/login">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="mana-btn mana-btn--neutral landing-login-btn px-6 py-3 font-semibold rounded-xl border border-white/20 transition-all duration-300 flex items-center gap-2"
                >
                  <FaSignInAlt size={18} />
                  Masuk
                </motion.button>
              </Link>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:flex justify-center"
          >
            <AuthBb8Mascot className="auth-bb8-mascot-hero" />
          </motion.div>
        </motion.div>
      </section>

      {/* Fitur Section */}
      <section
        id="fitur"
        className="relative py-20 px-6"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-white text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3 flex-wrap">
            Fitur WeBoost <FaRocket className="text-current h-10 w-10" />
          </h2>
        </motion.div>

        <FeatureCards />
      </section>

      {/* Mitra Section */}
      <section
        id="mitra"
        className="relative py-20 px-6"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h2 className="text-white text-4xl md:text-5xl font-bold mb-12 flex items-center justify-center gap-3">
            Mitra WeBoost <FaHandshake className="text-current" />
          </h2>

          <motion.article
            whileHover={{ y: -4 }}
            transition={{ duration: 0.35 }}
            className="mitra-hover-card mx-auto"
          >
            <div className="mitra-slide mitra-slide-front">
              <div className="mitra-slide-content">
                <div className="mitra-logo-wrap">
                  <Image
                    src="/logo_smkypm4taman.png"
                    alt="SMK YPM 4 Taman Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <h3 className="mitra-front-title">SMKS YPM 4 Taman</h3>
              </div>
            </div>

            <div className="mitra-slide mitra-slide-back">
              <div className="mitra-slide-content">
                <h3 className="mitra-back-title">Lokasi Mitra</h3>
                <p className="mitra-back-description">Lihat lokasi resmi SMKS YPM 4 Taman di Google Maps.</p>
                <a
                  href="https://maps.app.goo.gl/JyeSNBwLUAMH5uVt8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mitra-map-link"
                >
                  Lihat Lokasi Mitra
                </a>
              </div>
            </div>
          </motion.article>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="landing-footer relative py-8 px-6 border-t border-white/10">
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
};

export default Home;
