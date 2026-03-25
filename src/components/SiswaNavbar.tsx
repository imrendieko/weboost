'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { FaUserCircle, FaChevronDown, FaHome, FaBook, FaProjectDiagram, FaClipboardList, FaBars, FaTimes } from 'react-icons/fa';

interface SiswaNavbarProps {
  siswaName: string;
}

export default function SiswaNavbar({ siswaName }: SiswaNavbarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('siswa_session');
    router.push('/');
  };

  const firstName = siswaName.split(' ')[0];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-3 py-2 bg-black/40 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,229,255,0.15)] border-b border-white/20 transition-all duration-500">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
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

          <div className="hidden md:flex items-center gap-15">
            <Link
              href="/dashboard"
              className="text-white hover:text-[#0080FF] transition-colors duration-300 font-medium relative group flex items-center gap-2"
            >
              <FaHome size={16} />
              Beranda
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#0080FF] transition-all duration-300 group-hover:w-full"></span>
            </Link>

            <Link
              href="/siswa/materi"
              className="text-white hover:text-[#0080FF] transition-colors duration-300 font-medium relative group flex items-center gap-2"
            >
              <FaBook size={16} />
              Materi
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#0080FF] transition-all duration-300 group-hover:w-full"></span>
            </Link>

            <Link
              href="/siswa/pbl"
              className="text-white hover:text-[#0080FF] transition-colors duration-300 font-medium relative group flex items-center gap-2"
            >
              <FaProjectDiagram size={16} />
              PBL
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#0080FF] transition-all duration-300 group-hover:w-full"></span>
            </Link>

            <Link
              href="/siswa/asesmen"
              className="text-white hover:text-[#0080FF] transition-colors duration-300 font-medium relative group flex items-center gap-2"
            >
              <FaClipboardList size={16} />
              Asesmen
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#0080FF] transition-all duration-300 group-hover:w-full"></span>
            </Link>
          </div>

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
                  href="/siswa/profil"
                  className="flex items-center gap-3 px-4 py-3 text-white hover:bg-[#0080FF]/20 transition-colors border-b border-white/5"
                >
                  <FaUserCircle className="text-xl" />
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

          <button
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="md:hidden text-white text-2xl focus:outline-none z-50"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        <motion.div
          initial={false}
          animate={{
            height: isMobileMenuOpen ? 'auto' : 0,
            opacity: isMobileMenuOpen ? 1 : 0,
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="md:hidden overflow-hidden bg-black/90 backdrop-blur-xl"
        >
          <div className="flex flex-col space-y-4 px-6 py-6">
            <Link
              href="/dashboard"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white hover:text-[#0080FF] transition-colors duration-300 flex items-center gap-3 text-lg"
            >
              <FaHome size={18} />
              Beranda
            </Link>

            <Link
              href="/siswa/materi"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white hover:text-[#0080FF] transition-colors duration-300 flex items-center gap-3 text-lg"
            >
              <FaBook size={18} />
              Materi
            </Link>

            <Link
              href="/siswa/pbl"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white hover:text-[#0080FF] transition-colors duration-300 flex items-center gap-3 text-lg"
            >
              <FaProjectDiagram size={18} />
              PBL
            </Link>

            <Link
              href="/siswa/asesmen"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white hover:text-[#0080FF] transition-colors duration-300 flex items-center gap-3 text-lg"
            >
              <FaClipboardList size={18} />
              Asesmen
            </Link>

            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center gap-3 mb-4 text-white">
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                  <FaUserCircle className="text-2xl" />
                </div>
                <span className="font-medium">{firstName}</span>
              </div>
              <Link
                href="/siswa/profil"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-white hover:text-[#0080FF] transition-colors duration-300 mb-3"
              >
                Profil
              </Link>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
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
