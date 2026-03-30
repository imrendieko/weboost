import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import StarBackground from '@/components/StarBackground';
import Navbar from '@/components/Navbar';
import CountdownTimer from '@/components/CountdownTimer';
import FeatureCards from '@/components/FeatureCards';
import Image from 'next/image';
import { FaRocket, FaHandshake, FaUserPlus, FaSignInAlt } from 'react-icons/fa';

const Home = () => {
  const [isBoostHovered, setIsBoostHovered] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Star Background */}
      <StarBackground />

      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section
        id="beranda"
        className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h1 className="text-white text-5xl md:text-6xl font-bold mb-6">
            <span
              className="text-[#0080FF]"
              onMouseEnter={() => setIsBoostHovered(true)}
              onMouseLeave={() => setIsBoostHovered(false)}
            >
              {isBoostHovered ? 'Tingkatkan' : <i>Boost</i>}
            </span>{' '}
            Pengetahuan Kamu Setiap Hari!
          </h1>
          <p className="text-gray-300 text-lg md:text-xl mb-8 max-w-2xl mx-auto">LMS WeBoost akan membantu proses belajar kamu menjadi 100% lebih mudah dan menyenangkan. Mulai dan terus belajar bersama kami!</p>
          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <Link href="/register">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mana-btn mana-btn--primary px-8 py-3 font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(0,128,255,0.5)] flex items-center gap-2"
              >
                <FaUserPlus size={18} />
                Daftar
              </motion.button>
            </Link>
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mana-btn mana-btn--neutral px-8 py-3 font-semibold rounded-xl border border-white/20 transition-all duration-300 flex items-center gap-2"
              >
                <FaSignInAlt size={18} />
                Masuk
              </motion.button>
            </Link>
          </div>

          {/* Countdown Timer with Date */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex justify-center"
          >
            <CountdownTimer />
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
            Mitra Kami <FaHandshake className="text-current" />
          </h2>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="inline-block bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:shadow-[0_0_40px_rgba(0,229,255,0.4)] transition-all duration-300"
          >
            <div className="w-55 h-55 relative">
              <Image
                src="/logo_smkypm4taman.png"
                alt="SMK YPM 4 Taman Logo"
                fill
                className="object-contain"
              />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative py-8 px-6 border-t border-white/10">
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

export const getStaticProps = async () => {
  return {
    props: {},
    revalidate: 3600, // Revalidate every hour
  };
};

export default Home;
