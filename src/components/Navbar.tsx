'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { useState } from 'react';
import { FaHome, FaRocket, FaHandshake, FaUserPlus, FaBars, FaTimes } from 'react-icons/fa';
import PublicThemeToggle from '@/components/PublicThemeToggle';
import { useAdminTheme } from '@/contexts/AdminThemeContext';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const { theme, mounted } = useAdminTheme();
  const resolvedTheme = mounted ? theme : 'dark';
  const isLightTheme = resolvedTheme === 'light';

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setIsScrolled(latest > 50);
  });

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`admin-navbar fixed top-0 left-0 right-0 z-50 px-3 py-2 backdrop-blur-xl border-b transition-all duration-500 ${isScrolled ? 'shadow-[0_8px_32px_0_rgba(0,229,255,0.15)]' : ''} ${isLightTheme ? 'admin-theme-light' : ''}`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="md:hidden flex items-center justify-between">
          {/* Mobile Logo */}
          <Link
            href="/"
            className="flex items-center group"
          >
            {/* Mobile - Square Logo */}
            <div className="relative w-12 h-12 group-hover:shadow-[0_0_20px_rgba(0,229,255,0.6)] transition-all duration-300 rounded-lg overflow-hidden sm:hidden">
              <Image
                src="/logo_weboost_persegi.png"
                alt="WeBoost Logo"
                fill
                className="object-contain"
              />
            </div>
            {/* Tablet - Original Logo */}
            <div className="relative w-45 h-16 group-hover:shadow-[0_0_20px_rgba(0,229,255,0.6)] transition-all duration-300 rounded-lg overflow-hidden hidden sm:block">
              <Image
                src="/logo_weboost.png"
                alt="WeBoost Logo"
                fill
                className="object-contain"
              />
            </div>
          </Link>

          {/* Mobile Hamburger Button */}
          <button
            onClick={toggleMenu}
            className="mana-btn mana-btn--neutral h-11 w-11 p-0 inline-flex items-center justify-center text-lg z-50"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        <div className="hidden md:grid grid-cols-[auto_1fr_auto] items-center gap-18">
          {/* Desktop Logo */}
          <Link
            href="/"
            className="flex items-center group"
          >
            <div className="relative w-45 h-16 group-hover:shadow-[0_0_20px_rgba(0,229,255,0.6)] transition-all duration-300 rounded-lg overflow-hidden">
              <Image
                src="/logo_weboost.png"
                alt="WeBoost Logo"
                fill
                className="object-contain"
              />
            </div>
          </Link>

          {/* Desktop Navigation Links (Centered) */}
          <div className="flex items-center justify-center gap-27">
            <Link
              href="#beranda"
              className="admin-nav-link transition-colors duration-300 relative group flex items-center gap-2"
            >
              <FaHome size={23} />
              Beranda
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#0080FF] transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link
              href="#fitur"
              className="admin-nav-link transition-colors duration-300 relative group flex items-center gap-2"
            >
              <FaRocket size={23} />
              Fitur
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#0080FF] transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link
              href="#mitra"
              className="admin-nav-link transition-colors duration-300 relative group flex items-center gap-2"
            >
              <FaHandshake size={23} />
              Mitra
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#0080FF] transition-all duration-300 group-hover:w-full"></span>
            </Link>
          </div>

          {/* Desktop Right Controls */}
          <div className="flex items-center gap-6 justify-self-end">
            <PublicThemeToggle />

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
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <motion.div
        initial={false}
        animate={{
          height: isMenuOpen ? 'auto' : 0,
          opacity: isMenuOpen ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="admin-mobile-menu md:hidden overflow-hidden backdrop-blur-xl"
      >
        <div className="flex flex-col space-y-4 px-6 py-6">
          <Link
            href="#beranda"
            onClick={closeMobileMenu}
            className="admin-nav-link transition-colors duration-300 flex items-center gap-3 text-lg"
          >
            <FaHome size={18} />
            Beranda
          </Link>
          <Link
            href="#fitur"
            onClick={closeMobileMenu}
            className="admin-nav-link transition-colors duration-300 flex items-center gap-3 text-lg"
          >
            <FaRocket size={18} />
            Fitur
          </Link>
          <Link
            href="#mitra"
            onClick={closeMobileMenu}
            className="admin-nav-link transition-colors duration-300 flex items-center gap-3 text-lg"
          >
            <FaHandshake size={18} />
            Mitra
          </Link>

          <PublicThemeToggle mobile />

          <Link
            href="/register"
            onClick={closeMobileMenu}
            className="mt-4 pt-4 border-t border-white/20"
          >
            <button className="mana-btn mana-btn--primary w-full px-6 py-3 text-white font-medium rounded-xl transition-all duration-300 shadow-lg flex items-center justify-center gap-2">
              <FaUserPlus size={18} />
              Daftar
            </button>
          </Link>
        </div>
      </motion.div>
    </motion.nav>
  );
}
