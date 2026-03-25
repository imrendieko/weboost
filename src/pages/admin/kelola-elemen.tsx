import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import supabase from '@/lib/db';
import AdminNavbar from '@/components/AdminNavbar';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import { FaBook, FaEdit, FaTrash, FaCheck, FaTimes, FaSearch, FaPlus, FaMinus, FaChartLine, FaUpload } from 'react-icons/fa';
import Image from 'next/image';

interface AdminData {
  id_admin: number;
  nama_admin: string;
  email_admin: string;
}

interface Kelas {
  id_kelas: number;
  nama_kelas: string;
}

interface Guru {
  id_guru: number;
  nama_guru: string;
}

interface TujuanPembelajaran {
  id_tp: number;
  nama_tp: string;
}

interface Elemen {
  id_elemen: number;
  nama_elemen: string;
  sampul_elemen: string | null;
  deskripsi_elemen: string | null;
  kelas_elemen: number;
  guru_pengampu: number | null;
  kelas?: Kelas;
  guru?: Guru;
  tujuan_pembelajaran?: TujuanPembelajaran[];
}

interface ElemenFormData {
  id_elemen?: number;
  nama_elemen: string;
  sampul_elemen: string | null;
  deskripsi_elemen: string;
  kelas_elemen: number;
  guru_pengampu: number | null;
  tujuan_pembelajaran: string[];
}

type NotificationType = 'success' | 'error';

interface Notification {
  show: boolean;
  message: string;
  type: NotificationType;
}

export default function KelolaElemen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [elemenList, setElemenList] = useState<Elemen[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingElemen, setEditingElemen] = useState<ElemenFormData | null>(null);
  const [newElemen, setNewElemen] = useState<Omit<ElemenFormData, 'id_elemen'>>({
    nama_elemen: '',
    sampul_elemen: null,
    deskripsi_elemen: '',
    kelas_elemen: 0,
    guru_pengampu: null,
    tujuan_pembelajaran: [''],
  });
  const [notification, setNotification] = useState<Notification>({ show: false, message: '', type: 'success' });

  // Filter and search states
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; nama: string } | null>(null);

  // File upload states
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        await fetchKelas();
        await fetchGuru();
        await fetchElemenData();
        setLoading(false);
      } catch (error) {
        console.error('Error checking admin auth:', error);
        router.push('/login');
      }
    };

    checkAdminAuth();
  }, [router]);

  const fetchKelas = async () => {
    try {
      const response = await fetch('/api/kelas');
      const data = await response.json();
      setKelasList(data);
    } catch (error) {
      console.error('Error fetching kelas:', error);
    }
  };

  const fetchGuru = async () => {
    try {
      const response = await fetch('/api/guru?status=validated');
      const data = await response.json();
      if (Array.isArray(data)) {
        setGuruList(data);
      }
    } catch (error) {
      console.error('Error fetching guru:', error);
    }
  };

  const fetchElemenData = async () => {
    try {
      const response = await fetch(`/api/elemen?search=${search}&kelas=${filterKelas}&sortBy=nama_elemen&sortOrder=${sortOrder}`);
      const data = await response.json();

      console.log('Fetched elemen data:', data);

      if (Array.isArray(data)) {
        setElemenList(data);
      } else {
        console.error('Data elemen bukan array:', data);
        setElemenList([]);
      }
    } catch (error) {
      console.error('Error fetching elemen data:', error);
      setElemenList([]);
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchElemenData();
    }
  }, [search, filterKelas, sortOrder]);

  const showNotification = (message: string, type: NotificationType) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 5000);
  };

  // Image compression function
  const compressImage = (file: File, maxSizeMB: number = 2): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while maintaining aspect ratio
          const maxDimension = 1024;
          if (width > height && width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Start with quality 0.9 and reduce if needed
          let quality = 0.9;
          let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

          // Keep compressing until under maxSizeMB
          while (compressedDataUrl.length > maxSizeMB * 1024 * 1024 * 1.37 && quality > 0.1) {
            quality -= 0.1;
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          resolve(compressedDataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showNotification('File harus berupa gambar', 'error');
      return;
    }

    setUploadingImage(true);

    try {
      const compressedImage = await compressImage(file, 2);
      setPreviewImage(compressedImage);

      if (isEdit && editingElemen) {
        setEditingElemen({ ...editingElemen, sampul_elemen: compressedImage });
      } else {
        setNewElemen({ ...newElemen, sampul_elemen: compressedImage });
      }
    } catch (error) {
      console.error('Error compressing image:', error);
      showNotification('Gagal mengompres gambar', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddTujuanPembelajaran = (isEdit: boolean = false) => {
    if (isEdit && editingElemen) {
      setEditingElemen({
        ...editingElemen,
        tujuan_pembelajaran: [...editingElemen.tujuan_pembelajaran, ''],
      });
    } else {
      setNewElemen({
        ...newElemen,
        tujuan_pembelajaran: [...newElemen.tujuan_pembelajaran, ''],
      });
    }
  };

  const handleRemoveTujuanPembelajaran = (index: number, isEdit: boolean = false) => {
    if (isEdit && editingElemen) {
      const newTP = editingElemen.tujuan_pembelajaran.filter((_, i) => i !== index);
      setEditingElemen({ ...editingElemen, tujuan_pembelajaran: newTP });
    } else {
      const newTP = newElemen.tujuan_pembelajaran.filter((_, i) => i !== index);
      setNewElemen({ ...newElemen, tujuan_pembelajaran: newTP });
    }
  };

  const handleTujuanPembelajaranChange = (index: number, value: string, isEdit: boolean = false) => {
    if (isEdit && editingElemen) {
      const newTP = [...editingElemen.tujuan_pembelajaran];
      newTP[index] = value;
      setEditingElemen({ ...editingElemen, tujuan_pembelajaran: newTP });
    } else {
      const newTP = [...newElemen.tujuan_pembelajaran];
      newTP[index] = value;
      setNewElemen({ ...newElemen, tujuan_pembelajaran: newTP });
    }
  };

  const handleOpenAddModal = () => {
    setNewElemen({
      nama_elemen: '',
      sampul_elemen: null,
      deskripsi_elemen: '',
      kelas_elemen: kelasList.length > 0 ? kelasList[0].id_kelas : 0,
      guru_pengampu: null,
      tujuan_pembelajaran: [''],
    });
    setPreviewImage(null);
    setShowAddModal(true);
  };

  const handleSaveNew = async () => {
    // Validate required fields
    if (!newElemen.nama_elemen || !newElemen.kelas_elemen || newElemen.kelas_elemen === 0) {
      showNotification('Nama elemen dan kelas harus diisi', 'error');
      return;
    }

    // Remove empty tujuan pembelajaran
    const filteredTP = newElemen.tujuan_pembelajaran.filter((tp) => tp.trim() !== '');

    if (filteredTP.length === 0) {
      showNotification('Minimal satu tujuan pembelajaran harus diisi', 'error');
      return;
    }

    try {
      const response = await fetch('/api/elemen/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newElemen,
          tujuan_pembelajaran: filteredTP,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showNotification('Data elemen berhasil ditambahkan', 'success');
        setShowAddModal(false);
        setNewElemen({
          nama_elemen: '',
          sampul_elemen: null,
          deskripsi_elemen: '',
          kelas_elemen: 0,
          guru_pengampu: null,
          tujuan_pembelajaran: [''],
        });
        setPreviewImage(null);
        fetchElemenData();
      } else {
        showNotification(result.error || 'Gagal menambahkan data elemen', 'error');
      }
    } catch (error) {
      console.error('Error adding elemen:', error);
      showNotification('Terjadi kesalahan saat menambahkan data', 'error');
    }
  };

  const handleEdit = (elemen: Elemen) => {
    console.log('Editing elemen:', elemen);
    console.log('Sampul elemen:', elemen.sampul_elemen);
    const tpList = elemen.tujuan_pembelajaran?.map((tp) => tp.nama_tp) || [''];
    setEditingElemen({
      id_elemen: elemen.id_elemen,
      nama_elemen: elemen.nama_elemen,
      sampul_elemen: elemen.sampul_elemen,
      deskripsi_elemen: elemen.deskripsi_elemen || '',
      kelas_elemen: elemen.kelas_elemen,
      guru_pengampu: elemen.guru_pengampu || null,
      tujuan_pembelajaran: tpList.length > 0 ? tpList : [''],
    });
    setPreviewImage(elemen.sampul_elemen);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingElemen) return;

    // Validate required fields
    if (!editingElemen.nama_elemen || !editingElemen.kelas_elemen) {
      showNotification('Nama elemen dan kelas harus diisi', 'error');
      return;
    }

    // Remove empty tujuan pembelajaran
    const filteredTP = editingElemen.tujuan_pembelajaran.filter((tp) => tp.trim() !== '');

    if (filteredTP.length === 0) {
      showNotification('Minimal satu tujuan pembelajaran harus diisi', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/elemen/${editingElemen.id_elemen}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingElemen,
          tujuan_pembelajaran: filteredTP,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showNotification('Data elemen berhasil diperbarui', 'success');
        setShowEditModal(false);
        setEditingElemen(null);
        setPreviewImage(null);
        fetchElemenData();
      } else {
        showNotification(result.error || 'Gagal memperbarui data elemen', 'error');
      }
    } catch (error) {
      console.error('Error updating elemen:', error);
      showNotification('Terjadi kesalahan saat memperbarui data', 'error');
    }
  };

  const handleDelete = async (id_elemen: number, nama_elemen: string) => {
    setDeleteTarget({ id: id_elemen, nama: nama_elemen });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const response = await fetch(`/api/elemen/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        showNotification('Data elemen berhasil dihapus', 'success');
        fetchElemenData();
      } else {
        showNotification(result.error || 'Gagal menghapus data elemen', 'error');
      }
    } catch (error) {
      console.error('Error deleting elemen:', error);
      showNotification('Terjadi kesalahan saat menghapus data', 'error');
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const renderTable = () => {
    const safeElemenList = Array.isArray(elemenList) ? elemenList : [];

    return (
      <div>
        {/* Filter and Search */}
        <div className="mb-4 flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan Nama Elemen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0080FF]/50"
            />
          </div>

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

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 bg-gray-800/50 border border-white/10 rounded-lg text-white hover:bg-gray-700/50 transition-colors"
          >
            {sortOrder === 'asc' ? '↑ A-Z' : '↓ Z-A'}
          </button>
        </div>

        {/* Table */}
        <div className="admin-elemen-table overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="admin-elemen-table-head border-b border-white/10">
                <th className="px-4 py-3 text-left text-white font-semibold">No</th>
                <th className="px-4 py-3 text-left text-white font-semibold">Sampul</th>
                <th className="px-4 py-3 text-left text-white font-semibold">Nama Elemen</th>
                <th className="px-4 py-3 text-left text-white font-semibold">Deskripsi</th>
                <th className="px-4 py-3 text-left text-white font-semibold">Kelas</th>
                <th className="px-4 py-3 text-left text-white font-semibold">Guru Pengampu</th>
                <th className="px-4 py-3 text-left text-white font-semibold">Tujuan Pembelajaran</th>
                <th className="px-4 py-3 text-center text-white font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {safeElemenList.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    Tidak ada data elemen
                  </td>
                </tr>
              ) : (
                safeElemenList.map((elemen, index) => (
                  <tr
                    key={elemen.id_elemen}
                    className="admin-elemen-table-row border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-white">{index + 1}</td>
                    <td className="px-4 py-3">
                      {elemen.sampul_elemen ? (
                        <img
                          src={elemen.sampul_elemen}
                          alt={elemen.nama_elemen}
                          className="admin-elemen-cover w-16 h-16 object-cover rounded-lg"
                          onError={(e) => {
                            console.error('Image failed to load:', elemen.nama_elemen, elemen.sampul_elemen?.substring(0, 50));
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.innerHTML =
                                '<div class="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center"><svg class="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg></div>';
                            }
                          }}
                        />
                      ) : (
                        <div className="admin-elemen-cover-placeholder w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                          <FaBook className="text-gray-500" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white">
                      <div className="admin-elemen-name-cell">{elemen.nama_elemen}</div>
                    </td>
                    <td className="px-4 py-3 text-white max-w-xs">
                      <div className="admin-elemen-description line-clamp-2">{elemen.deskripsi_elemen || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-white">{elemen.kelas?.nama_kelas || '-'}</td>
                    <td className="px-4 py-3 text-white">{elemen.guru?.nama_guru || '-'}</td>
                    <td className="px-4 py-3 text-white max-w-xs">
                      {elemen.tujuan_pembelajaran && elemen.tujuan_pembelajaran.length > 0 ? (
                        <ol className="admin-elemen-goals list-decimal list-inside space-y-1">
                          {elemen.tujuan_pembelajaran.map((tp, idx) => (
                            <li
                              key={tp.id_tp}
                              className="text-sm"
                            >
                              {tp.nama_tp}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <Link
                          href={`/admin/admin-hasil-asesmen?id_elemen=${elemen.id_elemen}`}
                          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                          title="Hasil Asesmen"
                        >
                          <FaChartLine />
                          Hasil Asesmen
                        </Link>
                        <button
                          onClick={() => handleEdit(elemen)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(elemen.id_elemen, elemen.nama_elemen)}
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
          <div className="admin-elemen-modal bg-gray-900 border border-white/20 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-white text-2xl font-bold mb-6">Tambah Elemen</h2>

            {/* Notification inside modal */}
            {notification.show && (
              <div className={`mb-4 px-4 py-3 rounded-lg ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white flex items-center gap-3`}>
                {notification.type === 'success' ? <FaCheck /> : <FaTimes />}
                {notification.message}
              </div>
            )}

            <div className="space-y-4">
              {/* Sampul Upload */}
              <div>
                <label className="block text-white mb-2">Sampul</label>
                <div className="admin-upload-dropzone border-2 border-dashed border-white/20 rounded-lg p-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, false)}
                    className="hidden"
                  />
                  {previewImage ? (
                    <div className="admin-upload-preview-shell relative">
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="admin-upload-preview-image w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setPreviewImage(null);
                          setNewElemen({ ...newElemen, sampul_elemen: null });
                        }}
                        className="admin-upload-remove absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="admin-upload-empty-state flex flex-col items-center justify-center py-8 cursor-pointer hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <FaUpload className="text-4xl text-gray-400 mb-2" />
                      <p className="text-gray-400 text-center">
                        Klik untuk unggah foto
                        <br />
                        <span className="text-sm">Maksimal 2MB</span>
                      </p>
                    </div>
                  )}
                  {uploadingImage && <p className="text-gray-400 text-sm mt-2">Mengompres gambar...</p>}
                </div>
              </div>

              <div>
                <label className="block text-white mb-2">Nama Elemen</label>
                <input
                  type="text"
                  value={newElemen.nama_elemen}
                  onChange={(e) => setNewElemen({ ...newElemen, nama_elemen: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
                  placeholder="Masukkan nama elemen"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Deskripsi Elemen</label>
                <textarea
                  value={newElemen.deskripsi_elemen}
                  onChange={(e) => setNewElemen({ ...newElemen, deskripsi_elemen: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
                  placeholder="Masukkan deskripsi elemen"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-white mb-2">Guru Pengampu</label>
                <select
                  value={newElemen.guru_pengampu || ''}
                  onChange={(e) => setNewElemen({ ...newElemen, guru_pengampu: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
                >
                  <option value="">Pilih Guru Pengampu</option>
                  {guruList.map((guru) => (
                    <option
                      key={guru.id_guru}
                      value={guru.id_guru}
                    >
                      {guru.nama_guru}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white mb-2">Kelas</label>
                <select
                  value={newElemen.kelas_elemen}
                  onChange={(e) => setNewElemen({ ...newElemen, kelas_elemen: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
                >
                  <option value={0}>Pilih Kelas</option>
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

              {/* Tujuan Pembelajaran */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-white">Tujuan Pembelajaran</label>
                  <button
                    onClick={() => handleAddTujuanPembelajaran(false)}
                    className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    title="Tambah Tujuan Pembelajaran"
                  >
                    <FaPlus />
                  </button>
                </div>
                <div className="space-y-3">
                  {newElemen.tujuan_pembelajaran.map((tp, index) => (
                    <div
                      key={index}
                      className="flex gap-2"
                    >
                      <div className="flex-shrink-0 w-8 h-12 flex items-center justify-center text-white font-semibold">{index + 1}.</div>
                      <input
                        type="text"
                        value={tp}
                        onChange={(e) => handleTujuanPembelajaranChange(index, e.target.value, false)}
                        className="flex-1 px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
                        placeholder={`Tujuan pembelajaran ${index + 1}`}
                      />
                      {newElemen.tujuan_pembelajaran.length > 1 && (
                        <button
                          onClick={() => handleRemoveTujuanPembelajaran(index, false)}
                          className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <FaMinus />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewElemen({
                      nama_elemen: '',
                      sampul_elemen: null,
                      deskripsi_elemen: '',
                      kelas_elemen: 0,
                      guru_pengampu: null,
                      tujuan_pembelajaran: [''],
                    });
                    setPreviewImage(null);
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
      {showEditModal && editingElemen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="admin-elemen-modal bg-gray-900 border border-white/20 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-white text-2xl font-bold mb-6">Detail Elemen</h2>

            {/* Notification inside modal */}
            {notification.show && (
              <div className={`mb-4 px-4 py-3 rounded-lg ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white flex items-center gap-3`}>
                {notification.type === 'success' ? <FaCheck /> : <FaTimes />}
                {notification.message}
              </div>
            )}

            <div className="space-y-4">
              {/* Sampul Upload */}
              <div>
                <label className="block text-white mb-2">Sampul</label>
                <div className="admin-upload-dropzone border-2 border-dashed border-white/20 rounded-lg p-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, true)}
                    className="hidden"
                  />
                  {previewImage ? (
                    <div className="admin-upload-preview-shell relative">
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="admin-upload-preview-image w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setPreviewImage(null);
                          setEditingElemen({ ...editingElemen, sampul_elemen: null });
                        }}
                        className="admin-upload-remove absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="admin-upload-empty-state flex flex-col items-center justify-center py-8 cursor-pointer hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <FaUpload className="text-4xl text-gray-400 mb-2" />
                      <p className="text-gray-400 text-center">
                        Klik untuk unggah foto
                        <br />
                        <span className="text-sm">Maksimal 2MB</span>
                      </p>
                    </div>
                  )}
                  {uploadingImage && <p className="text-gray-400 text-sm mt-2">Mengompres gambar...</p>}
                </div>
              </div>

              <div>
                <label className="block text-white mb-2">Nama Elemen</label>
                <input
                  type="text"
                  value={editingElemen.nama_elemen}
                  onChange={(e) => setEditingElemen({ ...editingElemen, nama_elemen: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
                  placeholder="Masukkan nama elemen"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Deskripsi Elemen</label>
                <textarea
                  value={editingElemen.deskripsi_elemen}
                  onChange={(e) => setEditingElemen({ ...editingElemen, deskripsi_elemen: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
                  placeholder="Masukkan deskripsi elemen"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-white mb-2">Guru Pengampu</label>
                <select
                  value={editingElemen.guru_pengampu || ''}
                  onChange={(e) => setEditingElemen({ ...editingElemen, guru_pengampu: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
                >
                  <option value="">Pilih Guru Pengampu</option>
                  {guruList.map((guru) => (
                    <option
                      key={guru.id_guru}
                      value={guru.id_guru}
                    >
                      {guru.nama_guru}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white mb-2">Kelas</label>
                <select
                  value={editingElemen.kelas_elemen}
                  onChange={(e) => setEditingElemen({ ...editingElemen, kelas_elemen: parseInt(e.target.value) })}
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

              {/* Tujuan Pembelajaran */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-white">Tujuan Pembelajaran</label>
                  <button
                    onClick={() => handleAddTujuanPembelajaran(true)}
                    className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    title="Tambah Tujuan Pembelajaran"
                  >
                    <FaPlus />
                  </button>
                </div>
                <div className="space-y-3">
                  {editingElemen.tujuan_pembelajaran.map((tp, index) => (
                    <div
                      key={index}
                      className="flex gap-2"
                    >
                      <div className="flex-shrink-0 w-8 h-12 flex items-center justify-center text-white font-semibold">{index + 1}.</div>
                      <input
                        type="text"
                        value={tp}
                        onChange={(e) => handleTujuanPembelajaranChange(index, e.target.value, true)}
                        className="flex-1 px-4 py-3 bg-gray-800 border-none rounded-lg text-white"
                        placeholder={`Tujuan pembelajaran ${index + 1}`}
                      />
                      {editingElemen.tujuan_pembelajaran.length > 1 && (
                        <button
                          onClick={() => handleRemoveTujuanPembelajaran(index, true)}
                          className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <FaMinus />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingElemen(null);
                    setPreviewImage(null);
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
          <div className="admin-elemen-delete-modal bg-gray-900 border border-red-500/50 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-600/20 rounded-full">
                <FaTrash className="text-red-500 text-2xl" />
              </div>
              <div>
                <h3 className="text-white text-xl font-bold">Konfirmasi Hapus</h3>
                <p className="text-gray-400 text-sm">Apakah Anda yakin?</p>
              </div>
            </div>
            <p className="text-white mb-6">
              Anda akan menghapus elemen <span className="font-bold">"{deleteTarget.nama}"</span>. Tindakan ini tidak dapat dibatalkan.
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
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative pt-32 pb-12 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-white text-3xl md:text-4xl font-bold mb-2">Kelola Elemen</h1>
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
          <span className="text-white">kelola-elemen</span>
        </div>

        {/* Global Notification */}
        {notification.show && !showAddModal && !showEditModal && (
          <div className={`mb-6 px-4 py-3 rounded-lg ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white flex items-center gap-3`}>
            {notification.type === 'success' ? <FaCheck /> : <FaTimes />}
            {notification.message}
          </div>
        )}

        {/* Content Card */}
        <div className="admin-elemen-content-card bg-gray-800/30 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-white text-xl font-bold flex items-center gap-2">
              <FaBook />
              Elemen yang Terdaftar
            </h2>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <FaPlus />
              Tambah Data Elemen
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
    </div>
  );
}
