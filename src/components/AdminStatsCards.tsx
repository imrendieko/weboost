'use client';

import Link from 'next/link';
import { FaUsers, FaUserGraduate, FaSchool, FaDoorOpen, FaChalkboardTeacher, FaBook, FaCheckCircle, FaClock } from 'react-icons/fa';

interface StatsCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function StatsCard({ title, icon, children }: StatsCardProps) {
  return (
    <div className="admin-stats-card admin-stats-card--dashboard rounded-xl p-6 transition-all duration-300 backdrop-blur-md border hover:border-[#0080FF]/50">
      <div className="admin-stats-card-header flex items-center gap-3 mb-6">
        <div className="admin-stats-icon text-2xl">{icon}</div>
        <h3 className="admin-stats-title text-xl font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

interface KelolaUserStatsProps {
  guruBelumValidasi: number;
  guruSudahValidasi: number;
  siswaBelumValidasi: number;
  siswaSudahValidasi: number;
}

export function KelolaUserStats({ guruBelumValidasi, guruSudahValidasi, siswaBelumValidasi, siswaSudahValidasi }: KelolaUserStatsProps) {
  return (
    <StatsCard
      title="Kelola Pengguna"
      icon={<FaUsers />}
    >
      <div className="grid grid-cols-2 gap-4">
        {/* Guru Section */}
        <Link
          href="/admin/kelola-guru"
          className="admin-stats-panel col-span-2 rounded-lg p-4 transition-all cursor-pointer border"
        >
          <div className="flex items-center gap-2 mb-3">
            <FaChalkboardTeacher className="admin-stats-icon text-lg" />
            <h4 className="admin-stats-title font-semibold">Guru</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="admin-stats-subpanel admin-stats-subpanel--pending rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <FaClock className="admin-stats-accent-icon text-sm" />
                <span className="admin-stats-muted text-xs">Belum Divalidasi</span>
              </div>
              <p className="admin-stats-value text-3xl font-bold">{guruBelumValidasi}</p>
            </div>
            <div className="admin-stats-subpanel admin-stats-subpanel--verified rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <FaCheckCircle className="admin-stats-accent-icon text-sm" />
                <span className="admin-stats-muted text-xs">Sudah Divalidasi</span>
              </div>
              <p className="admin-stats-value text-3xl font-bold">{guruSudahValidasi}</p>
            </div>
          </div>
        </Link>

        {/* Siswa Section */}
        <Link
          href="/admin/kelola-siswa"
          className="admin-stats-panel col-span-2 rounded-lg p-4 transition-all cursor-pointer border"
        >
          <div className="flex items-center gap-2 mb-3">
            <FaUserGraduate className="admin-stats-icon text-lg" />
            <h4 className="admin-stats-title font-semibold">Siswa</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="admin-stats-subpanel admin-stats-subpanel--pending rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <FaClock className="admin-stats-accent-icon text-sm" />
                <span className="admin-stats-muted text-xs">Belum Divalidasi</span>
              </div>
              <p className="admin-stats-value text-3xl font-bold">{siswaBelumValidasi}</p>
            </div>
            <div className="admin-stats-subpanel admin-stats-subpanel--verified rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <FaCheckCircle className="admin-stats-accent-icon text-sm" />
                <span className="admin-stats-muted text-xs">Sudah Divalidasi</span>
              </div>
              <p className="admin-stats-value text-3xl font-bold">{siswaSudahValidasi}</p>
            </div>
          </div>
        </Link>
      </div>
    </StatsCard>
  );
}

interface KelolaSekolahStatsProps {
  sekolahTerdaftar: number;
}

export function KelolaSekolahStats({ sekolahTerdaftar }: KelolaSekolahStatsProps) {
  return (
    <Link href="/admin/kelola-sekolah">
      <StatsCard
        title="Kelola Sekolah/Lembaga"
        icon={<FaSchool />}
      >
        <div className="admin-stats-panel admin-stats-panel--registered rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-2">
            <span className="admin-stats-muted text-sm">Sekolah/Lembaga Terdaftar</span>
            <FaCheckCircle className="admin-stats-accent-icon" />
          </div>
          <p className="admin-stats-value text-5xl font-bold">{sekolahTerdaftar}</p>
        </div>
      </StatsCard>
    </Link>
  );
}

interface KelolaKelasStatsProps {
  kelasTerdaftar: number;
}

export function KelolaKelasStats({ kelasTerdaftar }: KelolaKelasStatsProps) {
  return (
    <Link href="/admin/kelola-kelas">
      <StatsCard
        title="Kelola Kelas"
        icon={<FaDoorOpen />}
      >
        <div className="admin-stats-panel admin-stats-panel--registered rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-2">
            <span className="admin-stats-muted text-sm">Kelas Terdaftar</span>
            <FaCheckCircle className="admin-stats-accent-icon" />
          </div>
          <p className="admin-stats-value text-5xl font-bold">{kelasTerdaftar}</p>
        </div>
      </StatsCard>
    </Link>
  );
}

interface KelolaElemenStatsProps {
  elemenTerdaftar: number;
}

export function KelolaElemenStats({ elemenTerdaftar }: KelolaElemenStatsProps) {
  return (
    <Link href="/admin/kelola-elemen">
      <StatsCard
        title="Kelola Elemen"
        icon={<FaBook />}
      >
        <div className="admin-stats-panel admin-stats-panel--registered rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-2">
            <span className="admin-stats-muted text-sm">Elemen Terdaftar</span>
            <FaCheckCircle className="admin-stats-accent-icon" />
          </div>
          <p className="admin-stats-value text-5xl font-bold">{elemenTerdaftar}</p>
        </div>
      </StatsCard>
    </Link>
  );
}
