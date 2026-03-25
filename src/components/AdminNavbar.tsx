'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { FaUserCircle, FaChevronDown, FaHome, FaUsers, FaSchool, FaDoorOpen, FaChalkboardTeacher, FaBook, FaBars, FaTimes, FaUserGraduate } from 'react-icons/fa';
import { useAdminTheme } from '@/contexts/AdminThemeContext';

interface AdminNavbarProps {
  adminName: string;
}

export default function AdminNavbar({ adminName }: AdminNavbarProps) {
  const [isPenggunaOpen, setIsPenggunaOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPenggunaMobileOpen, setIsPenggunaMobileOpen] = useState(false);
  const penggunaRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { theme, mounted, toggleTheme } = useAdminTheme();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (penggunaRef.current && !penggunaRef.current.contains(event.target as Node)) {
        setIsPenggunaOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    router.push('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsPenggunaMobileOpen(false);
  };

  // Get first name from full name
  const firstName = adminName.split(' ')[0];
  const resolvedTheme = mounted ? theme : 'dark';
  const isLightTheme = resolvedTheme === 'light';

  return (
    <nav className={`admin-navbar fixed top-0 left-0 right-0 z-50 px-3 py-2 backdrop-blur-xl border-b transition-all duration-500 ${isLightTheme ? 'admin-theme-light' : ''}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/admin"
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

          {/* Desktop Navigation Menu */}
          <div className="hidden md:flex items-center gap-10">
            <Link
              href="/admin"
              className="admin-nav-link transition-colors duration-300 font-medium relative group flex items-center gap-2"
            >
              <FaHome size={16} />
              Beranda
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#0080FF] transition-all duration-300 group-hover:w-full"></span>
            </Link>

            {/* Pengguna Dropdown */}
            <div
              className="relative"
              ref={penggunaRef}
            >
              <button
                onClick={() => setIsPenggunaOpen(!isPenggunaOpen)}
                className="admin-nav-link flex items-center gap-2 transition-colors duration-300 font-medium relative group"
              >
                <FaUsers size={16} />
                Pengguna
                <FaChevronDown className={`text-sm transition-transform ${isPenggunaOpen ? 'rotate-180' : ''}`} />
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#0080FF] transition-all duration-300 group-hover:w-full"></span>
              </button>

              {isPenggunaOpen && (
                <div className="admin-dropdown-panel absolute top-full mt-2 min-w-[150px] overflow-hidden rounded-lg backdrop-blur-md shadow-xl">
                  <Link
                    href="/admin/kelola-guru"
                    className="admin-dropdown-item flex items-center gap-2 px-4 py-3 transition-colors border-b border-white/5"
                  >
                    <FaChalkboardTeacher size={16} />
                    Guru
                  </Link>
                  <Link
                    href="/admin/kelola-siswa"
                    className="admin-dropdown-item flex items-center gap-2 px-4 py-3 transition-colors"
                  >
                    <FaUserGraduate size={16} />
                    Siswa
                  </Link>
                </div>
              )}
            </div>

            <Link
              href="/admin/kelola-sekolah"
              className="admin-nav-link transition-colors duration-300 font-medium relative group flex items-center gap-2"
            >
              <FaSchool size={16} />
              Lembaga
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#0080FF] transition-all duration-300 group-hover:w-full"></span>
            </Link>

            <Link
              href="/admin/kelola-kelas"
              className="admin-nav-link transition-colors duration-300 font-medium relative group flex items-center gap-2"
            >
              <FaDoorOpen size={16} />
              Kelas
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#0080FF] transition-all duration-300 group-hover:w-full"></span>
            </Link>

            <Link
              href="/admin/kelola-elemen"
              className="admin-nav-link transition-colors duration-300 font-medium relative group flex items-center gap-2"
            >
              <FaBook size={16} />
              Elemen
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#0080FF] transition-all duration-300 group-hover:w-full"></span>
            </Link>

            <button
              type="button"
              onClick={toggleTheme}
              className="admin-theme-toggle admin-theme-toggle-bb8"
              aria-label={`Aktifkan ${isLightTheme ? 'mode gelap' : 'mode terang'}`}
              title={`Aktifkan ${isLightTheme ? 'mode gelap' : 'mode terang'}`}
            >
              <input
                className="slider"
                type="checkbox"
                checked={isLightTheme}
                readOnly
                tabIndex={-1}
                aria-hidden="true"
              />
              <div
                className="switch"
                aria-hidden="true"
              >
                <div className="suns" />
                <div className="moons">
                  <div className="star star-1" />
                  <div className="star star-2" />
                  <div className="star star-3" />
                  <div className="star star-4" />
                  <div className="star star-5" />
                  <div className="first-moon" />
                </div>
                <div className="sand" />
                <div className="bb8">
                  <div className="antennas">
                    <div className="antenna short" />
                    <div className="antenna long" />
                  </div>
                  <div className="head">
                    <div className="stripe one" />
                    <div className="stripe two" />
                    <div className="eyes">
                      <div className="eye one" />
                      <div className="eye two" />
                    </div>
                    <div className="stripe detail">
                      <div className="detail zero" />
                      <div className="detail zero" />
                      <div className="detail one" />
                      <div className="detail two" />
                      <div className="detail three" />
                      <div className="detail four" />
                      <div className="detail five" />
                      <div className="detail five" />
                    </div>
                    <div className="stripe three" />
                  </div>
                  <div className="ball">
                    <div className="lines one" />
                    <div className="lines two" />
                    <div className="ring one" />
                    <div className="ring two" />
                    <div className="ring three" />
                  </div>
                  <div className="shadow" />
                </div>
              </div>
              <span className="sr-only">{isLightTheme ? 'Mode terang aktif' : 'Mode gelap aktif'}</span>
            </button>
          </div>

          {/* Desktop Admin Profile Dropdown */}
          <div
            className="hidden md:block relative"
            ref={profileRef}
          >
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 text-white hover:text-[#0080FF] transition-colors duration-300 font-medium relative group px-3 py-2 rounded-lg hover:bg-white/10"
            >
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                <FaUserCircle
                  className="text-2xl"
                  style={{ color: '#ffffff' }}
                />
              </div>
              <span className="font-medium">{firstName}</span>
              <FaChevronDown className={`text-sm transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProfileOpen && (
              <div className="absolute top-full right-0 mt-2 bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl min-w-[180px] overflow-hidden">
                <Link
                  href="/admin/profil"
                  className="flex items-center gap-3 px-4 py-3 text-white hover:bg-[#0080FF]/20 transition-colors border-b border-white/5"
                >
                  <FaUserCircle
                    className="text-xl"
                    style={{ color: '#ffffff' }}
                  />
                  <span>Profil</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/20 transition-colors w-full text-left"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>Keluar</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={toggleMobileMenu}
            className="admin-nav-link md:hidden text-2xl focus:outline-none z-50"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {/* Mobile Menu */}
        <motion.div
          initial={false}
          animate={{
            height: isMobileMenuOpen ? 'auto' : 0,
            opacity: isMobileMenuOpen ? 1 : 0,
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="admin-mobile-menu md:hidden overflow-hidden backdrop-blur-xl"
        >
          <div className="flex flex-col space-y-4 px-6 py-6">
            <Link
              href="/admin"
              onClick={closeMobileMenu}
              className="admin-nav-link transition-colors duration-300 flex items-center gap-3 text-lg"
            >
              <FaHome size={18} />
              Beranda
            </Link>

            {/* Mobile Pengguna Dropdown */}
            <div>
              <button
                onClick={() => setIsPenggunaMobileOpen(!isPenggunaMobileOpen)}
                className="admin-nav-link transition-colors duration-300 flex items-center gap-3 text-lg w-full"
              >
                <FaUsers size={18} />
                Pengguna
                <FaChevronDown className={`text-sm transition-transform ${isPenggunaMobileOpen ? 'rotate-180' : ''}`} />
              </button>
              {isPenggunaMobileOpen && (
                <div className="ml-8 mt-2 space-y-2">
                  <Link
                    href="/admin/kelola-guru"
                    onClick={closeMobileMenu}
                    className="admin-nav-link flex items-center gap-2 transition-colors duration-300"
                  >
                    <FaChalkboardTeacher size={16} />
                    Guru
                  </Link>
                  <Link
                    href="/admin/kelola-siswa"
                    onClick={closeMobileMenu}
                    className="admin-nav-link flex items-center gap-2 transition-colors duration-300"
                  >
                    <FaUserGraduate size={16} />
                    Siswa
                  </Link>
                </div>
              )}
            </div>

            <Link
              href="/admin/kelola-sekolah"
              onClick={closeMobileMenu}
              className="admin-nav-link transition-colors duration-300 flex items-center gap-3 text-lg"
            >
              <FaSchool size={18} />
              Sekolah/Lembaga
            </Link>

            <Link
              href="/admin/kelola-kelas"
              onClick={closeMobileMenu}
              className="admin-nav-link transition-colors duration-300 flex items-center gap-3 text-lg"
            >
              <FaSchool size={18} />
              Kelas
            </Link>

            <Link
              href="/admin/kelola-elemen"
              onClick={closeMobileMenu}
              className="admin-nav-link transition-colors duration-300 flex items-center gap-3 text-lg"
            >
              <FaBook size={18} />
              Elemen
            </Link>

            <button
              type="button"
              onClick={toggleTheme}
              className="admin-theme-toggle admin-theme-toggle-bb8 admin-theme-toggle-bb8-mobile"
            >
              <input
                className="slider"
                type="checkbox"
                checked={isLightTheme}
                readOnly
                tabIndex={-1}
                aria-hidden="true"
              />
              <div
                className="switch"
                aria-hidden="true"
              >
                <div className="suns" />
                <div className="moons">
                  <div className="star star-1" />
                  <div className="star star-2" />
                  <div className="star star-3" />
                  <div className="star star-4" />
                  <div className="star star-5" />
                  <div className="first-moon" />
                </div>
                <div className="sand" />
                <div className="bb8">
                  <div className="antennas">
                    <div className="antenna short" />
                    <div className="antenna long" />
                  </div>
                  <div className="head">
                    <div className="stripe one" />
                    <div className="stripe two" />
                    <div className="eyes">
                      <div className="eye one" />
                      <div className="eye two" />
                    </div>
                    <div className="stripe detail">
                      <div className="detail zero" />
                      <div className="detail zero" />
                      <div className="detail one" />
                      <div className="detail two" />
                      <div className="detail three" />
                      <div className="detail four" />
                      <div className="detail five" />
                      <div className="detail five" />
                    </div>
                    <div className="stripe three" />
                  </div>
                  <div className="ball">
                    <div className="lines one" />
                    <div className="lines two" />
                    <div className="ring one" />
                    <div className="ring two" />
                    <div className="ring three" />
                  </div>
                  <div className="shadow" />
                </div>
              </div>
              <span className="sr-only">{isLightTheme ? 'Mode terang aktif' : 'Mode gelap aktif'}</span>
            </button>

            {/* Mobile Profile Section */}
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center gap-3 mb-4 text-white">
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                  <FaUserCircle
                    className="text-2xl"
                    style={{ color: '#ffffff' }}
                  />
                </div>
                <span className="font-medium">{firstName}</span>
              </div>
              <Link
                href="/admin/profil"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 text-white hover:text-[#0080FF] transition-colors duration-300 block mb-3"
              >
                Profil
              </Link>
              <button
                onClick={() => {
                  closeMobileMenu();
                  handleLogout();
                }}
                className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all duration-300 shadow-lg flex items-center justify-center gap-2"
              >
                Keluar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </nav>
  );
}
