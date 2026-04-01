import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import supabase from '@/lib/db';
import AdminNavbar from '@/components/AdminNavbar';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import { FaUserGraduate, FaEdit, FaTrash, FaCheck, FaTimes, FaSearch } from 'react-icons/fa';

interface AdminData {
  id_admin: number;
  nama_admin: string;
  email_admin: string;
}

interface Lembaga {
  id_lembaga: number;
  nama_lembaga: string;
}

interface Kelas {
  id_kelas: number;
  nama_kelas: string;
}

interface Siswa {
  id_siswa: number;
  nama_siswa: string;
  email_siswa: string;
  password_siswa: string;
  nisn_siswa: string;
  kelas_siswa: number;
  lembaga_siswa: number;
  created_at: string;
  lembaga?: Lembaga;
  kelas?: Kelas;
}

interface EditFormData {
  id_siswa: number;
  nama_siswa: string;
  email_siswa: string;
  password_siswa: string;
  nisn_siswa: string;
  kelas_siswa: number;
  lembaga_siswa: number;
}

type NotificationType = 'success' | 'error';

interface Notification {
  show: boolean;
  message: string;
  type: NotificationType;
}

export default function KelolaSiswa() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [lembagaList, setLembagaList] = useState<Lembaga[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSiswa, setEditingSiswa] = useState<EditFormData | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSiswa, setNewSiswa] = useState<Omit<EditFormData, 'id_siswa'>>({
    nama_siswa: '',
    email_siswa: '',
    password_siswa: '',
    nisn_siswa: '',
    kelas_siswa: 0,
    lembaga_siswa: 0,
  });
  const [notification, setNotification] = useState<Notification>({ show: false, message: '', type: 'success' });

  // Filter and search states
  const [search, setSearch] = useState('');
  const [filterLembaga, setFilterLembaga] = useState('all');
  const [filterKelas, setFilterKelas] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
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
        await fetchKelas();
        await fetchSiswaData();
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

  const fetchKelas = async () => {
    try {
      const response = await fetch('/api/kelas');
      const data = await response.json();
      setKelasList(data);
    } catch (error) {
      console.error('Error fetching kelas:', error);
    }
  };

  const fetchSiswaData = async () => {
    try {
      // Fetch all siswa data
      const response = await fetch(`/api/siswa?search=${search}&lembaga=${filterLembaga}&kelas=${filterKelas}&sortBy=${sortBy}&sortOrder=${sortOrder}`);
      const data = await response.json();

      // Ensure data is an array
      if (Array.isArray(data)) {
        setSiswaList(data);
      } else {
        console.error('Data siswa bukan array:', data);
        setSiswaList([]);
      }
    } catch (error) {
      console.error('Error fetching siswa data:', error);
      setSiswaList([]);
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchSiswaData();
    }
  }, [search, filterLembaga, filterKelas, sortBy, sortOrder]);

  const showNotification = (message: string, type: NotificationType) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const handleEdit = (siswa: Siswa) => {
    setEditingSiswa({
      id_siswa: siswa.id_siswa,
      nama_siswa: siswa.nama_siswa,
      email_siswa: siswa.email_siswa,
      password_siswa: siswa.password_siswa,
      nisn_siswa: siswa.nisn_siswa,
      kelas_siswa: siswa.kelas_siswa,
      lembaga_siswa: siswa.lembaga_siswa,
    });
    setShowEditModal(true);
  };

  const handleOpenAddModal = () => {
    setNewSiswa({
      nama_siswa: '',
      email_siswa: '',
      password_siswa: '',
      nisn_siswa: '',
      kelas_siswa: kelasList.length > 0 ? kelasList[0].id_kelas : 0,
      lembaga_siswa: lembagaList.length > 0 ? lembagaList[0].id_lembaga : 0,
    });
    setShowAddModal(true);
  };

  const handleSaveNew = async () => {
    // Validate required fields
    if (!newSiswa.nama_siswa || !newSiswa.email_siswa || !newSiswa.password_siswa || !newSiswa.nisn_siswa || !newSiswa.kelas_siswa || newSiswa.kelas_siswa === 0 || !newSiswa.lembaga_siswa || newSiswa.lembaga_siswa === 0) {
      showNotification('Semua field harus diisi', 'error');
      return;
    }

    try {
      console.log('Sending data:', newSiswa);

      const response = await fetch('/api/siswa/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSiswa),
      });

      const result = await response.json();
      console.log('Response:', result);

      if (response.ok) {
        showNotification('Data siswa berhasil ditambahkan', 'success');
        setShowAddModal(false);
        setNewSiswa({ nama_siswa: '', email_siswa: '', password_siswa: '', nisn_siswa: '', kelas_siswa: 0, lembaga_siswa: 0 });
        fetchSiswaData();
      } else {
        const errorMsg = result.details ? `${result.error}: ${result.details}` : result.error;
        console.error('API Error:', errorMsg);
        showNotification(errorMsg || 'Gagal menambahkan data siswa', 'error');
      }
    } catch (error) {
      console.error('Error adding siswa:', error);
      showNotification('Terjadi kesalahan saat menambahkan data', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingSiswa) return;

    try {
      const response = await fetch(`/api/siswa/${editingSiswa.id_siswa}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSiswa),
      });

      const result = await response.json();

      if (response.ok) {
        showNotification('Data siswa berhasil diperbarui', 'success');
        setShowEditModal(false);
        setEditingSiswa(null);
        fetchSiswaData();
      } else {
        showNotification(result.error || 'Gagal memperbarui data siswa', 'error');
      }
    } catch (error) {
      console.error('Error updating siswa:', error);
      showNotification('Terjadi kesalahan saat memperbarui data', 'error');
    }
  };

  const handleDelete = async (id_siswa: number, nama_siswa: string) => {
    setDeleteTarget({ id: id_siswa, nama: nama_siswa });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const response = await fetch(`/api/siswa/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        showNotification('Data siswa berhasil dihapus', 'success');
        fetchSiswaData();
      } else {
        showNotification(result.error || 'Gagal menghapus data siswa', 'error');
      }
    } catch (error) {
      console.error('Error deleting siswa:', error);
      showNotification('Terjadi kesalahan saat menghapus data', 'error');
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const maskPassword = (password: string) => {
    return '*'.repeat(password.length);
  };

  const renderTable = () => {
    // Safety check: ensure siswaList is an array
    const safeSiswaList = Array.isArray(siswaList) ? siswaList : [];
    const normalizedSearch = search.trim().toLowerCase();
    const filteredList = safeSiswaList.filter((siswa) => {
      if (!normalizedSearch) return true;

      const nama = String(siswa.nama_siswa || '').toLowerCase();
      const nisn = String(siswa.nisn_siswa || '').toLowerCase();

      return nama.includes(normalizedSearch) || nisn.includes(normalizedSearch);
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
              placeholder="Cari berdasarkan Nama atau NISN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0080FF]/50"
            />
          </div>

          {/* Filter Lembaga */}
          <select
            value={filterLembaga}
            onChange={(e) => setFilterLembaga(e.target.value)}
            className="px-4 py-2 bg-gray-800/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#0080FF]/50"
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

          {/* Filter Kelas */}
          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="px-4 py-2 bg-gray-800/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#0080FF]/50"
          >
            <option value="all">Semua Kelas</option>
            {kelasList.map((kelas) => (
              <option
                key={kelas.id_kelas}
                value={kelas.id_kelas}
              >
                {kelas.nama_kelas}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 bg-gray-800/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#0080FF]/50"
          >
            <option value="created_at">Urutkan: Tanggal Dibuat</option>
          </select>

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
                <th className="px-4 py-3 text-left text-white font-semibold">Nama</th>
                <th className="px-4 py-3 text-left text-white font-semibold">Email</th>
                <th className="px-4 py-3 text-left text-white font-semibold">Password</th>
                <th className="px-4 py-3 text-left text-white font-semibold">NISN</th>
                <th className="px-4 py-3 text-left text-white font-semibold">Kelas</th>
                <th className="px-4 py-3 text-left text-white font-semibold">Sekolah/Lembaga</th>
                <th className="px-4 py-3 text-center text-white font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    Tidak ada data siswa
                  </td>
                </tr>
              ) : (
                filteredList.map((siswa, index) => (
                  <tr
                    key={siswa.id_siswa}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-white">{index + 1}</td>
                    <td className="px-4 py-3 text-white">{siswa.nama_siswa}</td>
                    <td className="px-4 py-3 text-white">{siswa.email_siswa}</td>
                    <td className="px-4 py-3 text-white font-mono">{maskPassword(siswa.password_siswa)}</td>
                    <td className="px-4 py-3 text-white">{siswa.nisn_siswa}</td>
                    <td className="px-4 py-3 text-white">{siswa.kelas?.nama_kelas || '-'}</td>
                    <td className="px-4 py-3 text-white">{siswa.lembaga?.nama_lembaga || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(siswa)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(siswa.id_siswa, siswa.nama_siswa)}
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
          <div className="bg-gray-900 border border-white/20 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-white text-2xl font-bold mb-6">Tambah Data Siswa</h2>

            {/* Notification inside modal */}
            {notification.show && (
              <div className={`mb-4 px-4 py-3 rounded-lg ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white flex items-center gap-3`}>
                {notification.type === 'success' ? <FaCheck /> : <FaTimes />}
                {notification.message}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-white mb-2">Nama</label>
                <input
                  type="text"
                  value={newSiswa.nama_siswa}
                  onChange={(e) => setNewSiswa({ ...newSiswa, nama_siswa: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
                  placeholder="Masukkan nama siswa"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Email</label>
                <input
                  type="email"
                  value={newSiswa.email_siswa}
                  onChange={(e) => setNewSiswa({ ...newSiswa, email_siswa: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
                  placeholder="Masukkan email siswa"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Password</label>
                <input
                  type="text"
                  value={newSiswa.password_siswa}
                  onChange={(e) => setNewSiswa({ ...newSiswa, password_siswa: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
                  placeholder="Masukkan password"
                />
              </div>

              <div>
                <label className="block text-white mb-2">NISN</label>
                <input
                  type="text"
                  value={newSiswa.nisn_siswa}
                  onChange={(e) => setNewSiswa({ ...newSiswa, nisn_siswa: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
                  placeholder="Masukkan NISN"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Kelas</label>
                <select
                  value={newSiswa.kelas_siswa}
                  onChange={(e) => setNewSiswa({ ...newSiswa, kelas_siswa: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
                >
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

              <div>
                <label className="block text-white mb-2">Sekolah/Lembaga</label>
                <select
                  value={newSiswa.lembaga_siswa}
                  onChange={(e) => setNewSiswa({ ...newSiswa, lembaga_siswa: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
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

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewSiswa({ nama_siswa: '', email_siswa: '', password_siswa: '', nisn_siswa: '', kelas_siswa: 0, lembaga_siswa: 0 });
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
      {showEditModal && editingSiswa && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/20 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-white text-2xl font-bold mb-6">Identitas Siswa</h2>

            {/* Notification inside modal */}
            {notification.show && (
              <div className={`mb-4 px-4 py-3 rounded-lg ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white flex items-center gap-3`}>
                {notification.type === 'success' ? <FaCheck /> : <FaTimes />}
                {notification.message}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-white mb-2">Nama</label>
                <input
                  type="text"
                  value={editingSiswa.nama_siswa}
                  onChange={(e) => setEditingSiswa({ ...editingSiswa, nama_siswa: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Email</label>
                <input
                  type="email"
                  value={editingSiswa.email_siswa}
                  onChange={(e) => setEditingSiswa({ ...editingSiswa, email_siswa: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Password</label>
                <input
                  type="text"
                  value={editingSiswa.password_siswa}
                  onChange={(e) => setEditingSiswa({ ...editingSiswa, password_siswa: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
                  placeholder="Kosongkan jika tidak ingin mengubah"
                />
              </div>

              <div>
                <label className="block text-white mb-2">NISN</label>
                <input
                  type="text"
                  value={editingSiswa.nisn_siswa}
                  onChange={(e) => setEditingSiswa({ ...editingSiswa, nisn_siswa: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Kelas</label>
                <select
                  value={editingSiswa.kelas_siswa}
                  onChange={(e) => setEditingSiswa({ ...editingSiswa, kelas_siswa: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
                >
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

              <div>
                <label className="block text-white mb-2">Sekolah/Lembaga</label>
                <select
                  value={editingSiswa.lembaga_siswa}
                  onChange={(e) => setEditingSiswa({ ...editingSiswa, lembaga_siswa: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
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

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSiswa(null);
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
              Apakah Anda yakin ingin menghapus data siswa <span className="font-semibold text-white">{deleteTarget.nama}</span>?
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

        {/* Notification */}
        {notification.show && (
          <div className={`mb-6 px-4 py-3 rounded-lg ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white flex items-center gap-3`}>
            {notification.type === 'success' ? <FaCheck /> : <FaTimes />}
            {notification.message}
          </div>
        )}

        {/* Breadcrumb */}
        <div className="mb-4 sm:mb-6 flex items-center gap-2 text-xs sm:text-sm text-gray-400">
          <Link
            href="/admin"
            className="hover:text-[#0080FF] transition-colors"
          >
            admin
          </Link>
          <span>/</span>
          <span className="text-white">kelola-siswa</span>
        </div>

        {/* Siswa Terdaftar */}
        <div className="bg-gray-900/50 backdrop-blur-md border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FaUserGraduate className="text-white text-2xl" />
              <h2 className="text-white text-xl font-semibold">Data Siswa</h2>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <FaUserGraduate />
              Tambah Data Siswa
            </button>
          </div>
          {renderTable()}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative py-6 sm:py-8 px-3 sm:px-6 border-t border-white/10">
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
