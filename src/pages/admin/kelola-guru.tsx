import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import supabase from '@/lib/db';
import AdminNavbar from '@/components/AdminNavbar';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import { FaChalkboardTeacher, FaUserGraduate, FaCheckCircle, FaClock, FaEdit, FaTrash, FaCheck, FaTimes, FaSearch, FaFilter } from 'react-icons/fa';

interface AdminData {
  id_admin: number;
  nama_admin: string;
  email_admin: string;
}

interface Lembaga {
  id_lembaga: number;
  nama_lembaga: string;
}

interface Guru {
  id_guru: number;
  nama_guru: string;
  email_guru: string;
  password_guru: string;
  nip_guru: string;
  lembaga_guru: number;
  status_guru: boolean;
  created_at: string;
  lembaga?: Lembaga;
}

interface EditFormData {
  id_guru: number;
  nama_guru: string;
  email_guru: string;
  password_guru: string;
  nip_guru: string;
  lembaga_guru: number;
}

type NotificationType = 'success' | 'error';

interface Notification {
  show: boolean;
  message: string;
  type: NotificationType;
}

export default function KelolaGuru() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [guruBelumValidasi, setGuruBelumValidasi] = useState<Guru[]>([]);
  const [guruSudahValidasi, setGuruSudahValidasi] = useState<Guru[]>([]);
  const [lembagaList, setLembagaList] = useState<Lembaga[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGuru, setEditingGuru] = useState<EditFormData | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGuru, setNewGuru] = useState<Omit<EditFormData, 'id_guru'>>({ nama_guru: '', email_guru: '', password_guru: '', nip_guru: '', lembaga_guru: 0 });
  const [notification, setNotification] = useState<Notification>({ show: false, message: '', type: 'success' });

  // Filter and search states
  const [searchBelum, setSearchBelum] = useState('');
  const [searchSudah, setSearchSudah] = useState('');
  const [filterLembagaBelum, setFilterLembagaBelum] = useState('all');
  const [filterLembagaSudah, setFilterLembagaSudah] = useState('all');
  const [sortByBelum, setSortByBelum] = useState('created_at');
  const [sortBySudah, setSortBySudah] = useState('created_at');
  const [sortOrderBelum, setSortOrderBelum] = useState('desc');
  const [sortOrderSudah, setSortOrderSudah] = useState('desc');
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
    if (!router.isReady) return;

    const checkAdminAuth = async () => {
      try {
        const adminSession = localStorage.getItem('admin_session');

        if (!adminSession) {
          router.push('/');
          return;
        }

        const sessionData = JSON.parse(adminSession);

        const { data: admin, error: adminError } = await supabase.from('admin').select('*').eq('id_admin', sessionData.id_admin).single();

        if (adminError || !admin) {
          console.error('Error fetching admin data:', adminError);
          localStorage.removeItem('admin_session');
          router.push('/');
          return;
        }

        setAdminData(admin);
        await fetchLembaga();
        await fetchGuruData();
        setLoading(false);
      } catch (error) {
        console.error('Error checking admin auth:', error);
        router.push('/');
      }
    };

    checkAdminAuth();
  }, [router]);

  const fetchLembaga = async () => {
    try {
      const response = await fetch('/api/lembaga');
      const data = await response.json();
      setLembagaList(data);
    } catch (error) {
      console.error('Error fetching lembaga:', error);
    }
  };

  const fetchGuruData = async () => {
    try {
      // Fetch unvalidated guru
      const resBelum = await fetch(`/api/guru?status=unvalidated&search=${searchBelum}&lembaga=${filterLembagaBelum}&sortBy=${sortByBelum}&sortOrder=${sortOrderBelum}`);
      const dataBelum = await resBelum.json();

      // Ensure data is an array
      if (Array.isArray(dataBelum)) {
        setGuruBelumValidasi(dataBelum);
      } else {
        console.error('Data belum validasi bukan array:', dataBelum);
        setGuruBelumValidasi([]);
      }

      // Fetch validated guru
      const resSudah = await fetch(`/api/guru?status=validated&search=${searchSudah}&lembaga=${filterLembagaSudah}&sortBy=${sortBySudah}&sortOrder=${sortOrderSudah}`);
      const dataSudah = await resSudah.json();

      // Ensure data is an array
      if (Array.isArray(dataSudah)) {
        setGuruSudahValidasi(dataSudah);
      } else {
        console.error('Data sudah validasi bukan array:', dataSudah);
        setGuruSudahValidasi([]);
      }
    } catch (error) {
      console.error('Error fetching guru data:', error);
      setGuruBelumValidasi([]);
      setGuruSudahValidasi([]);
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchGuruData();
    }
  }, [searchBelum, searchSudah, filterLembagaBelum, filterLembagaSudah, sortByBelum, sortBySudah, sortOrderBelum, sortOrderSudah]);

  const showNotification = (message: string, type: NotificationType) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const handleValidate = async (id_guru: number) => {
    try {
      const response = await fetch('/api/guru/validate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_guru }),
      });

      const result = await response.json();

      if (response.ok) {
        showNotification('Guru berhasil divalidasi', 'success');
        fetchGuruData();
      } else {
        showNotification(result.error || 'Gagal memvalidasi guru', 'error');
      }
    } catch (error) {
      console.error('Error validating guru:', error);
      showNotification('Terjadi kesalahan saat memvalidasi guru', 'error');
    }
  };

  const handleEdit = (guru: Guru) => {
    setEditingGuru({
      id_guru: guru.id_guru,
      nama_guru: guru.nama_guru,
      email_guru: guru.email_guru,
      password_guru: guru.password_guru,
      nip_guru: guru.nip_guru,
      lembaga_guru: guru.lembaga_guru,
    });
    setShowEditModal(true);
  };

  const handleOpenAddModal = () => {
    setNewGuru({
      nama_guru: '',
      email_guru: '',
      password_guru: '',
      nip_guru: '',
      lembaga_guru: lembagaList.length > 0 ? lembagaList[0].id_lembaga : 0,
    });
    setShowAddModal(true);
  };

  const handleSaveNew = async () => {
    // Validate required fields
    if (!newGuru.nama_guru || !newGuru.email_guru || !newGuru.password_guru || !newGuru.nip_guru || !newGuru.lembaga_guru || newGuru.lembaga_guru === 0) {
      showNotification('Semua field harus diisi', 'error');
      return;
    }

    try {
      console.log('Sending data:', newGuru);

      const response = await fetch('/api/guru/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGuru),
      });

      const result = await response.json();
      console.log('Response:', result);

      if (response.ok) {
        showNotification('Data guru berhasil ditambahkan', 'success');
        setShowAddModal(false);
        setNewGuru({ nama_guru: '', email_guru: '', password_guru: '', nip_guru: '', lembaga_guru: 0 });
        fetchGuruData();
      } else {
        const errorMsg = result.details ? `${result.error}: ${result.details}` : result.error;
        console.error('API Error:', errorMsg);
        showNotification(errorMsg || 'Gagal menambahkan data guru', 'error');
      }
    } catch (error) {
      console.error('Error adding guru:', error);
      showNotification('Terjadi kesalahan saat menambahkan data', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingGuru) return;

    try {
      const response = await fetch(`/api/guru/${editingGuru.id_guru}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingGuru),
      });

      const result = await response.json();

      if (response.ok) {
        showNotification('Data guru berhasil diperbarui', 'success');
        setShowEditModal(false);
        setEditingGuru(null);
        fetchGuruData();
      } else {
        showNotification(result.error || 'Gagal memperbarui data guru', 'error');
      }
    } catch (error) {
      console.error('Error updating guru:', error);
      showNotification('Terjadi kesalahan saat memperbarui data', 'error');
    }
  };

  const handleDelete = async (id_guru: number, nama_guru: string) => {
    setDeleteTarget({ id: id_guru, nama: nama_guru });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const response = await fetch(`/api/guru/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        showNotification('Data guru berhasil dihapus', 'success');
        fetchGuruData();
      } else {
        showNotification(result.error || 'Gagal menghapus data guru', 'error');
      }
    } catch (error) {
      console.error('Error deleting guru:', error);
      showNotification('Terjadi kesalahan saat menghapus data', 'error');
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const maskPassword = (password: string) => {
    return '*'.repeat(password.length);
  };

  const renderTable = (
    guruList: Guru[],
    isValidated: boolean,
    search: string,
    setSearch: (v: string) => void,
    filterLembaga: string,
    setFilterLembaga: (v: string) => void,
    sortBy: string,
    setSortBy: (v: string) => void,
    sortOrder: string,
    setSortOrder: (v: string) => void,
  ) => {
    // Safety check: ensure guruList is an array
    const safeGuruList = Array.isArray(guruList) ? guruList : [];

    return (
      <div>
        {/* Filter and Search */}
        <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <FaSearch className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm sm:text-base" />
            <input
              type="text"
              placeholder="Cari Nama atau NIP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 bg-gray-800/50 border border-white/10 rounded-lg text-white text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:border-[#0080FF]/50"
            />
          </div>

          {/* Filter Lembaga */}
          <select
            value={filterLembaga}
            onChange={(e) => setFilterLembaga(e.target.value)}
            className="px-3 sm:px-4 py-2 bg-gray-800/50 border border-white/10 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-[#0080FF]/50 w-full sm:w-auto"
          >
            <option value="all">Semua Lembaga</option>
            {lembagaList.map((lembaga) => (
              <option
                key={lembaga.id_lembaga}
                value={lembaga.id_lembaga}
              >
                {lembaga.nama_lembaga}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 sm:px-4 py-2 bg-gray-800/50 border border-white/10 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-[#0080FF]/50 w-full sm:w-auto"
          >
            <option value="created_at">Urutkan: Tanggal Dibuat</option>
          </select>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 sm:px-4 py-2 bg-gray-800/50 border border-white/10 rounded-lg text-white text-sm sm:text-base hover:bg-gray-700/50 transition-colors w-full sm:w-auto"
          >
            {sortOrder === 'asc' ? '↑ A-Z' : '↓ Z-A'}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-white text-xs sm:text-sm font-semibold">No</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-white text-xs sm:text-sm font-semibold">Nama</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-white text-xs sm:text-sm font-semibold hidden md:table-cell">Email</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-white text-xs sm:text-sm font-semibold hidden lg:table-cell">Password</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-white text-xs sm:text-sm font-semibold hidden sm:table-cell">NIP</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-white text-xs sm:text-sm font-semibold hidden lg:table-cell">Sekolah/Lembaga</th>
                {!isValidated && <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-white text-xs sm:text-sm font-semibold hidden md:table-cell">Validasi</th>}
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-white text-xs sm:text-sm font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {safeGuruList.length === 0 ? (
                <tr>
                  <td
                    colSpan={!isValidated ? 8 : 7}
                    className="px-3 sm:px-4 py-6 sm:py-8 text-center text-gray-400 text-sm sm:text-base"
                  >
                    Tidak ada data guru
                  </td>
                </tr>
              ) : (
                safeGuruList.map((guru, index) => (
                  <tr
                    key={guru.id_guru}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-white text-xs sm:text-sm">{index + 1}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-white text-xs sm:text-sm font-medium">{guru.nama_guru}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-white text-xs sm:text-sm hidden md:table-cell">{guru.email_guru}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-white text-xs sm:text-sm font-mono hidden lg:table-cell">{maskPassword(guru.password_guru)}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-white text-xs sm:text-sm hidden sm:table-cell">{guru.nip_guru}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-white text-xs sm:text-sm hidden lg:table-cell">{guru.lembaga?.nama_lembaga || '-'}</td>
                    {!isValidated && (
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-center hidden md:table-cell">
                        <button
                          onClick={() => handleValidate(guru.id_guru)}
                          className="px-2 sm:px-3 py-1 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs sm:text-sm"
                        >
                          Validasi
                        </button>
                      </td>
                    )}
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                      <div className="flex gap-1 sm:gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(guru)}
                          className="p-1 sm:p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm sm:text-base"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(guru.id_guru, guru.nama_guru)}
                          className="p-1 sm:p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm sm:text-base"
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

      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-24 right-6 z-50 px-6 py-4 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white flex items-center gap-3 animate-slide-in`}>
          {notification.type === 'success' ? <FaCheck /> : <FaTimes />}
          {notification.message}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-gray-900 border border-white/20 rounded-xl p-4 sm:p-6 max-w-sm sm:max-w-md md:max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-white text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Tambah Data Guru</h2>

            {/* Notification inside modal */}
            {notification.show && (
              <div className={`mb-4 px-4 py-3 rounded-lg ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white flex items-center gap-3`}>
                {notification.type === 'success' ? <FaCheck /> : <FaTimes />}
                {notification.message}
              </div>
            )}

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-white text-sm sm:text-base mb-1 sm:mb-2">Nama</label>
                <input
                  type="text"
                  value={newGuru.nama_guru}
                  onChange={(e) => setNewGuru({ ...newGuru, nama_guru: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border-none rounded-lg text-white text-sm sm:text-base"
                  placeholder="Masukkan nama guru"
                />
              </div>

              <div>
                <label className="block text-white text-sm sm:text-base mb-1 sm:mb-2">Email</label>
                <input
                  type="email"
                  value={newGuru.email_guru}
                  onChange={(e) => setNewGuru({ ...newGuru, email_guru: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border-none rounded-lg text-white text-sm sm:text-base"
                  placeholder="Masukkan email guru"
                />
              </div>

              <div>
                <label className="block text-white text-sm sm:text-base mb-1 sm:mb-2">Password</label>
                <input
                  type="text"
                  value={newGuru.password_guru}
                  onChange={(e) => setNewGuru({ ...newGuru, password_guru: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border-none rounded-lg text-white text-sm sm:text-base"
                  placeholder="Masukkan password"
                />
              </div>

              <div>
                <label className="block text-white text-sm sm:text-base mb-1 sm:mb-2">NIP</label>
                <input
                  type="text"
                  value={newGuru.nip_guru}
                  onChange={(e) => setNewGuru({ ...newGuru, nip_guru: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border-none rounded-lg text-white text-sm sm:text-base"
                  placeholder="Masukkan NIP"
                />
              </div>

              <div>
                <label className="block text-white text-sm sm:text-base mb-1 sm:mb-2">Sekolah/Lembaga</label>
                <select
                  value={newGuru.lembaga_guru}
                  onChange={(e) => setNewGuru({ ...newGuru, lembaga_guru: parseInt(e.target.value) })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border-none rounded-lg text-white text-sm sm:text-base"
                >
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

              <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewGuru({ nama_guru: '', email_guru: '', password_guru: '', nip_guru: '', lembaga_guru: 0 });
                  }}
                  className="flex-1 px-3 sm:px-6 py-2 sm:py-3 bg-gray-700 hover:bg-gray-600 text-white text-sm sm:text-base rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveNew}
                  className="flex-1 px-3 sm:px-6 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base rounded-lg transition-colors"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingGuru && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-gray-900 border border-white/20 rounded-xl p-4 sm:p-6 max-w-sm sm:max-w-md md:max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-white text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Identitas Guru</h2>

            {/* Notification inside modal */}
            {notification.show && (
              <div className={`mb-3 sm:mb-4 px-3 sm:px-4 py-2 sm:py-3 rounded-lg ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white text-sm sm:text-base flex items-center gap-3`}>
                {notification.type === 'success' ? <FaCheck /> : <FaTimes />}
                {notification.message}
              </div>
            )}

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-white text-sm sm:text-base mb-1 sm:mb-2">Nama</label>
                <input
                  type="text"
                  value={editingGuru.nama_guru}
                  onChange={(e) => setEditingGuru({ ...editingGuru, nama_guru: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border-none rounded-lg text-white text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-white text-sm sm:text-base mb-1 sm:mb-2">Email</label>
                <input
                  type="email"
                  value={editingGuru.email_guru}
                  onChange={(e) => setEditingGuru({ ...editingGuru, email_guru: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border-none rounded-lg text-white text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-white text-sm sm:text-base mb-1 sm:mb-2">Password</label>
                <input
                  type="text"
                  value={editingGuru.password_guru}
                  onChange={(e) => setEditingGuru({ ...editingGuru, password_guru: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border-none rounded-lg text-white text-sm sm:text-base"
                  placeholder="Kosongkan jika tidak ingin mengubah"
                />
              </div>

              <div>
                <label className="block text-white text-sm sm:text-base mb-1 sm:mb-2">NIP</label>
                <input
                  type="text"
                  value={editingGuru.nip_guru}
                  onChange={(e) => setEditingGuru({ ...editingGuru, nip_guru: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border-none rounded-lg text-white text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-white text-sm sm:text-base mb-1 sm:mb-2">Sekolah/Lembaga</label>
                <select
                  value={editingGuru.lembaga_guru}
                  onChange={(e) => setEditingGuru({ ...editingGuru, lembaga_guru: parseInt(e.target.value) })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border-none rounded-lg text-white text-sm sm:text-base"
                >
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

              <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingGuru(null);
                  }}
                  className="flex-1 px-3 sm:px-6 py-2 sm:py-3 bg-gray-700 hover:bg-gray-600 text-white text-sm sm:text-base rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-3 sm:px-6 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base rounded-lg transition-colors"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-gray-900 border border-red-500/50 rounded-xl p-4 sm:p-6 max-w-sm sm:max-w-md w-full">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-red-600/20 rounded-full">
                <FaTrash className="text-red-500 text-lg sm:text-2xl" />
              </div>
              <h2 className="text-white text-lg sm:text-2xl font-bold">Konfirmasi Penghapusan</h2>
            </div>

            <p className="text-gray-300 text-sm sm:text-base mb-4 sm:mb-6">
              Apakah Anda yakin ingin menghapus data guru <span className="font-semibold text-white">{deleteTarget.nama}</span>?
              <br />
              <span className="text-red-400 text-xs sm:text-sm">Tindakan ini tidak dapat dibatalkan.</span>
            </p>

            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="flex-1 px-3 sm:px-6 py-2 sm:py-3 bg-gray-700 hover:bg-gray-600 text-white text-sm sm:text-base rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-3 sm:px-6 py-2 sm:py-3 bg-red-600 hover:bg-red-700 text-white text-sm sm:text-base rounded-lg transition-colors font-semibold"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative pt-24 sm:pt-28 md:pt-32 pb-12 px-3 sm:px-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-3 sm:gap-4">
          <div>
            <h1 className="text-white text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Selamat Datang, {adminData.nama_admin.split(' ')[0]}!</h1>
            <p className="text-gray-400 text-xs sm:text-sm md:text-base">{getCurrentDate()}</p>
          </div>
          <div className="flex justify-start md:justify-end">
            <CountdownTimer showDate={false} />
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="mb-4 sm:mb-6 flex items-center gap-2 text-xs sm:text-sm text-gray-400">
          <Link
            href="/admin"
            className="hover:text-[#0080FF] transition-colors"
          >
            admin
          </Link>
          <span>/</span>
          <span className="text-white">kelola-guru</span>
        </div>

        {/* Guru Belum diValidasi */}
        <div className="mb-6 sm:mb-8 bg-gray-900/50 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <FaClock className="text-white text-lg sm:text-2xl" />
              <h2 className="text-white text-base sm:text-lg md:text-xl font-semibold">Guru yang Belum diValidasi</h2>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="px-3 sm:px-4 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base rounded-lg transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <FaChalkboardTeacher />
              Tambah Data Guru
            </button>
          </div>
          {renderTable(guruBelumValidasi, false, searchBelum, setSearchBelum, filterLembagaBelum, setFilterLembagaBelum, sortByBelum, setSortByBelum, sortOrderBelum, setSortOrderBelum)}
        </div>

        {/* Guru Sudah diValidasi */}
        <div className="bg-gray-900/50 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <FaCheckCircle className="text-white text-lg sm:text-2xl" />
            <h2 className="text-white text-base sm:text-lg md:text-xl font-semibold">Guru yang Sudah diValidasi</h2>
          </div>
          {renderTable(guruSudahValidasi, true, searchSudah, setSearchSudah, filterLembagaSudah, setFilterLembagaSudah, sortBySudah, setSortBySudah, sortOrderSudah, setSortOrderSudah)}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative py-6 sm:py-8 px-3 sm:px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400 text-xs sm:text-sm">
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
