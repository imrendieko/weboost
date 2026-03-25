import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import supabase from '@/lib/db';
import AdminNavbar from '@/components/AdminNavbar';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import { FaDoorOpen, FaEdit, FaTrash, FaCheck, FaTimes, FaSearch } from 'react-icons/fa';

interface AdminData {
  id_admin: number;
  nama_admin: string;
  email_admin: string;
}

interface Kelas {
  id_kelas: number;
  nama_kelas: string;
}

interface EditFormData {
  id_kelas: number;
  nama_kelas: string;
}

type NotificationType = 'success' | 'error';

interface Notification {
  show: boolean;
  message: string;
  type: NotificationType;
}

export default function KelolaKelas() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingKelas, setEditingKelas] = useState<EditFormData | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKelas, setNewKelas] = useState<Omit<EditFormData, 'id_kelas'>>({ nama_kelas: '' });
  const [notification, setNotification] = useState<Notification>({ show: false, message: '', type: 'success' });

  // Filter and search states
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; nama: string } | null>(null);

  // Get current date in Indonesian format
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
    const checkAdminAuth = async () => {
      try {
        const adminSession = localStorage.getItem('admin_session');

        if (!adminSession) {
          router.push('/login');
          return;
        }

        const sessionData = JSON.parse(adminSession);

        const { data: admin, error: adminError } = await supabase.from('admin').select('*').eq('id_admin', sessionData.id_admin).single();

        if (adminError || !admin) {
          console.error('Error fetching admin data:', adminError);
          localStorage.removeItem('admin_session');
          router.push('/login');
          return;
        }

        setAdminData(admin);
        await fetchKelasData();
        setLoading(false);
      } catch (error) {
        console.error('Error checking admin auth:', error);
        router.push('/login');
      }
    };

    checkAdminAuth();
  }, [router]);

  const fetchKelasData = async () => {
    try {
      const response = await fetch('/api/kelas');
      const data = await response.json();

      if (Array.isArray(data)) {
        setKelasList(data);
      } else {
        console.error('Data kelas bukan array:', data);
        setKelasList([]);
      }
    } catch (error) {
      console.error('Error fetching kelas data:', error);
      setKelasList([]);
    }
  };

  const showNotification = (message: string, type: NotificationType) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const handleEdit = (kelas: Kelas) => {
    setEditingKelas({
      id_kelas: kelas.id_kelas,
      nama_kelas: kelas.nama_kelas,
    });
    setShowEditModal(true);
  };

  const handleOpenAddModal = () => {
    setNewKelas({ nama_kelas: '' });
    setShowAddModal(true);
  };

  const handleSaveNew = async () => {
    if (!newKelas.nama_kelas || newKelas.nama_kelas.trim() === '') {
      showNotification('Nama kelas harus diisi', 'error');
      return;
    }

    try {
      const response = await fetch('/api/kelas/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKelas),
      });

      const result = await response.json();

      if (response.ok) {
        showNotification('Data kelas berhasil ditambahkan', 'success');
        setShowAddModal(false);
        setNewKelas({ nama_kelas: '' });
        fetchKelasData();
      } else {
        const errorMsg = result.details ? `${result.error}: ${result.details}` : result.error;
        showNotification(errorMsg || 'Gagal menambahkan data kelas', 'error');
      }
    } catch (error) {
      console.error('Error adding kelas:', error);
      showNotification('Terjadi kesalahan saat menambahkan data', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingKelas) return;

    if (!editingKelas.nama_kelas || editingKelas.nama_kelas.trim() === '') {
      showNotification('Nama kelas harus diisi', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/kelas/${editingKelas.id_kelas}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingKelas),
      });

      const result = await response.json();

      if (response.ok) {
        showNotification('Data kelas berhasil diperbarui', 'success');
        setShowEditModal(false);
        setEditingKelas(null);
        fetchKelasData();
      } else {
        showNotification(result.error || 'Gagal memperbarui data kelas', 'error');
      }
    } catch (error) {
      console.error('Error updating kelas:', error);
      showNotification('Terjadi kesalahan saat memperbarui data', 'error');
    }
  };

  const handleDelete = async (id_kelas: number, nama_kelas: string) => {
    setDeleteTarget({ id: id_kelas, nama: nama_kelas });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const response = await fetch(`/api/kelas/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        showNotification('Data kelas berhasil dihapus', 'success');
        fetchKelasData();
      } else {
        showNotification(result.error || 'Gagal menghapus data kelas', 'error');
      }
    } catch (error) {
      console.error('Error deleting kelas:', error);
      showNotification('Terjadi kesalahan saat menghapus data', 'error');
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const renderTable = () => {
    const safeKelasList = Array.isArray(kelasList) ? kelasList : [];

    // Filter by search
    let filteredList = safeKelasList.filter((kelas) => kelas.nama_kelas.toLowerCase().includes(search.toLowerCase()));

    // Sort
    filteredList = filteredList.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.nama_kelas.localeCompare(b.nama_kelas);
      } else {
        return b.nama_kelas.localeCompare(a.nama_kelas);
      }
    });

    return (
      <div>
        {/* Filter and Search */}
        <div className="mb-4 flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama kelas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0080FF]/50"
            />
          </div>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 bg-gray-800/50 border border-white/10 rounded-lg text-white hover:bg-gray-700/50 transition-colors"
          >
            {sortOrder === 'asc' ? '↑ A-Z' : '↓ Z-A'}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-white font-semibold">No</th>
                <th className="px-4 py-3 text-left text-white font-semibold">Nama Kelas</th>
                <th className="px-4 py-3 text-center text-white font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    Tidak ada data kelas
                  </td>
                </tr>
              ) : (
                filteredList.map((kelas, index) => (
                  <tr
                    key={kelas.id_kelas}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-white">{index + 1}</td>
                    <td className="px-4 py-3 text-white">{kelas.nama_kelas}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(kelas)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(kelas.id_kelas, kelas.nama_kelas)}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B1F] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!adminData) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-[#0B0B1F] overflow-hidden">
      <StarBackground />
      <AdminNavbar adminName={adminData.nama_admin} />

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/20 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-white text-2xl font-bold mb-6">Tambah Data Kelas</h2>

            {/* Notification inside modal */}
            {notification.show && (
              <div className={`mb-4 px-4 py-3 rounded-lg ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white flex items-center gap-3`}>
                {notification.type === 'success' ? <FaCheck /> : <FaTimes />}
                {notification.message}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-white mb-2">Nama Kelas</label>
                <input
                  type="text"
                  value={newKelas.nama_kelas}
                  onChange={(e) => setNewKelas({ nama_kelas: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
                  placeholder="Masukkan nama kelas"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewKelas({ nama_kelas: '' });
                  }}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveNew}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingKelas && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/20 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-white text-2xl font-bold mb-6">Edit Data Kelas</h2>

            {/* Notification inside modal */}
            {notification.show && (
              <div className={`mb-4 px-4 py-3 rounded-lg ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white flex items-center gap-3`}>
                {notification.type === 'success' ? <FaCheck /> : <FaTimes />}
                {notification.message}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-white mb-2">Nama Kelas</label>
                <input
                  type="text"
                  value={editingKelas.nama_kelas}
                  onChange={(e) => setEditingKelas({ ...editingKelas, nama_kelas: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingKelas(null);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-red-500/50 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-600/20 rounded-full">
                <FaTrash className="text-red-500 text-2xl" />
              </div>
              <h2 className="text-white text-2xl font-bold">Konfirmasi Penghapusan</h2>
            </div>

            <p className="text-gray-300 mb-6">
              Apakah Anda yakin ingin menghapus kelas <span className="font-semibold text-white">{deleteTarget.nama}</span>?
              <br />
              <span className="text-red-400 text-sm">Tindakan ini tidak dapat dibatalkan.</span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative pt-32 pb-50 px-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-white text-3xl md:text-4xl font-bold mb-2">Selamat Datang, {adminData.nama_admin.split(' ')[0]}!</h1>
            <p className="text-gray-400 text-sm md:text-base">{getCurrentDate()}</p>
          </div>
          <div className="flex justify-start md:justify-end">
            <CountdownTimer />
          </div>
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
          <span className="text-white">kelola-kelas</span>
        </div>

        {/* Kelas Section */}
        <div className="bg-gray-900/50 backdrop-blur-md border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FaDoorOpen className="text-white text-2xl" />
              <h2 className="text-white text-xl font-semibold">Kelas yang Terdaftar</h2>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <FaDoorOpen />
              Tambah Data Kelas
            </button>
          </div>
          {renderTable()}
        </div>
      </div>

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

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
