import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import GuruNavbar from '@/components/GuruNavbar';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import { FaBook, FaPlus, FaEdit, FaTrash, FaChevronDown, FaChevronUp, FaFileAlt, FaVideo, FaLink, FaChartBar, FaArrowLeft } from 'react-icons/fa';

interface GuruData {
  id_guru: number;
  nama_guru: string;
  email_guru: string;
}

interface SubBab {
  id_sub_bab: number;
  judul_sub_bab: string;
  nama_bab: number;
  tautan_konten: string;
}

interface Bab {
  id_bab: number;
  nama_materi: number;
  judul_bab: string;
  deskripsi_bab: string;
  sub_bab?: SubBab[];
}

interface Materi {
  id_materi: number;
  judul_materi: string;
  deskripsi_materi: string;
  bab?: Bab[];
  elemen?: {
    id_elemen: number;
    nama_elemen: string;
    sampul_elemen?: string;
  };
}

export default function DetailMateri() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [guruData, setGuruData] = useState<GuruData | null>(null);
  const [materi, setMateri] = useState<Materi | null>(null);
  const [showAddBabModal, setShowAddBabModal] = useState(false);
  const [showEditBabModal, setShowEditBabModal] = useState(false);
  const [showAddSubBabModal, setShowAddSubBabModal] = useState(false);
  const [showEditSubBabModal, setShowEditSubBabModal] = useState(false);
  const [selectedBab, setSelectedBab] = useState<Bab | null>(null);
  const [selectedSubBab, setSelectedSubBab] = useState<SubBab | null>(null);
  const [expandedBabs, setExpandedBabs] = useState<number[]>([]);
  const [fileType, setFileType] = useState<'dokumen' | 'video' | 'tautan'>('dokumen');

  const [babFormData, setbabFormData] = useState({
    judul_bab: '',
    deskripsi_bab: '',
  });

  const [subBabFormData, setSubBabFormData] = useState({
    judul_sub_bab: '',
    tautan_konten: '',
  });

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
    const checkGuruAuth = async () => {
      try {
        const guruSession = localStorage.getItem('guru_session');

        if (!guruSession) {
          router.push('/login');
          return;
        }

        const sessionData = JSON.parse(guruSession);
        setGuruData(sessionData);
        setLoading(false);
      } catch (error) {
        console.error('Error checking guru auth:', error);
        router.push('/login');
      }
    };

    checkGuruAuth();
  }, [router]);

  useEffect(() => {
    if (id && !Array.isArray(id)) {
      fetchMateriDetail();
    }
  }, [id]);

  const fetchMateriDetail = async () => {
    try {
      const response = await fetch(`/api/materi/${id}`);
      const data = await response.json();
      if (response.ok) {
        setMateri(data);
      }
    } catch (error) {
      console.error('Error fetching materi detail:', error);
    }
  };

  const handleAddBab = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/bab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_materi: id,
          ...babFormData,
        }),
      });

      if (response.ok) {
        setShowAddBabModal(false);
        setbabFormData({ judul_bab: '', deskripsi_bab: '' });
        await fetchMateriDetail();
      } else {
        alert('Gagal menambahkan bab');
      }
    } catch (error) {
      console.error('Error adding bab:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleEditBab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBab) return;

    try {
      const response = await fetch(`/api/bab/${selectedBab.id_bab}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(babFormData),
      });

      if (response.ok) {
        setShowEditBabModal(false);
        setSelectedBab(null);
        setbabFormData({ judul_bab: '', deskripsi_bab: '' });
        await fetchMateriDetail();
      } else {
        alert('Gagal mengedit bab');
      }
    } catch (error) {
      console.error('Error editing bab:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleDeleteBab = async (idBab: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus bab ini?')) return;

    try {
      const response = await fetch(`/api/bab/${idBab}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchMateriDetail();
      } else {
        alert('Gagal menghapus bab');
      }
    } catch (error) {
      console.error('Error deleting bab:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleAddSubBab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBab) return;

    try {
      const response = await fetch('/api/sub-bab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_bab: selectedBab.id_bab,
          ...subBabFormData,
        }),
      });

      if (response.ok) {
        setShowAddSubBabModal(false);
        setSelectedBab(null);
        setSubBabFormData({ judul_sub_bab: '', tautan_konten: '' });
        setFileType('dokumen');
        await fetchMateriDetail();
      } else {
        alert('Gagal menambahkan sub-bab');
      }
    } catch (error) {
      console.error('Error adding sub-bab:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleEditSubBab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubBab) return;

    try {
      const response = await fetch(`/api/sub-bab/${selectedSubBab.id_sub_bab}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subBabFormData),
      });

      if (response.ok) {
        setShowEditSubBabModal(false);
        setSelectedSubBab(null);
        setSubBabFormData({ judul_sub_bab: '', tautan_konten: '' });
        await fetchMateriDetail();
      } else {
        alert('Gagal mengedit sub-bab');
      }
    } catch (error) {
      console.error('Error editing sub-bab:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleDeleteSubBab = async (idSubBab: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus sub-bab ini?')) return;

    try {
      const response = await fetch(`/api/sub-bab/${idSubBab}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchMateriDetail();
      } else {
        alert('Gagal menghapus sub-bab');
      }
    } catch (error) {
      console.error('Error deleting sub-bab:', error);
      alert('Terjadi kesalahan');
    }
  };

  const toggleBabExpand = (idBab: number) => {
    setExpandedBabs((prev) => (prev.includes(idBab) ? prev.filter((id) => id !== idBab) : [...prev, idBab]));
  };

  const openEditBabModal = (bab: Bab) => {
    setSelectedBab(bab);
    setbabFormData({
      judul_bab: bab.judul_bab,
      deskripsi_bab: bab.deskripsi_bab,
    });
    setShowEditBabModal(true);
  };

  const openAddSubBabModal = (bab: Bab) => {
    setSelectedBab(bab);
    setShowAddSubBabModal(true);
  };

  const openEditSubBabModal = (subBab: SubBab) => {
    setSelectedSubBab(subBab);
    setSubBabFormData({
      judul_sub_bab: subBab.judul_sub_bab,
      tautan_konten: subBab.tautan_konten,
    });
    setShowEditSubBabModal(true);
  };

  const handleViewProgress = (idSubBab: number) => {
    router.push(`/guru/materi/progres/${idSubBab}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <StarBackground />

      {guruData && <GuruNavbar guruName={guruData.nama_guru} />}

      <div className="relative z-10 pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Selamat Datang, <span className="text-[#FFFFFF]">{guruData?.nama_guru.split(' ')[0]}!</span>
              </h1>
              <p className="text-gray-400">{getCurrentDate()}</p>
            </div>

            {/* Clock Timer */}
            <CountdownTimer showDate={false} />
          </div>

          {/* Back Button */}
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 rounded-lg border border-white/10 bg-gray-800/50 px-3 sm:px-4 py-1.5 sm:py-2 text-gray-300 transition-all hover:bg-gray-700/50 hover:text-white"
          >
            <FaArrowLeft />
            Kembali
          </button>

          {/* Content */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <FaBook className="text-white" />
                {materi?.elemen?.nama_elemen || materi?.judul_materi || 'Loading...'}
              </h2>
              <button
                onClick={() => setShowAddBabModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <FaPlus />
                Tambah Sub-bab
              </button>
            </div>

            {!materi?.bab || materi.bab.length === 0 ? (
              <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
                <p className="text-gray-400 text-lg mb-4">Belum ada BAB yang ditambahkan</p>
              </div>
            ) : (
              <div className="space-y-4">
                {materi.bab.map((bab, index) => (
                  <div
                    key={bab.id_bab}
                    className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden"
                  >
                    {/* Bab Header */}
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <button
                              onClick={() => toggleBabExpand(bab.id_bab)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              {expandedBabs.includes(bab.id_bab) ? <FaChevronUp /> : <FaChevronDown />}
                            </button>
                            <h3 className="text-xl font-bold">
                              Bab {index + 1}: {bab.judul_bab}
                            </h3>
                          </div>
                          <p className="text-gray-400 ml-9">{bab.deskripsi_bab}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openAddSubBabModal(bab)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                          >
                            <FaPlus size={12} />
                            Tambah Sub-bab
                          </button>
                          <button
                            onClick={() => openEditBabModal(bab)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteBab(bab.id_bab)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>

                      {/* Sub-bab List */}
                      {expandedBabs.includes(bab.id_bab) && (
                        <div className="mt-4 ml-9 space-y-2">
                          {bab.sub_bab && bab.sub_bab.length > 0 ? (
                            bab.sub_bab.map((subBab) => (
                              <div
                                key={subBab.id_sub_bab}
                                className="bg-gray-800/50 border border-white/10 rounded-lg p-4"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <FaFileAlt className="text-gray-400" />
                                    <div>
                                      <p className="font-medium">{subBab.judul_sub_bab}</p>
                                      {subBab.tautan_konten && (
                                        <a
                                          href={subBab.tautan_konten}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-400 hover:underline"
                                        >
                                          {subBab.tautan_konten}
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleViewProgress(subBab.id_sub_bab)}
                                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                    >
                                      <FaChartBar size={12} />
                                      Progres
                                    </button>
                                    <button
                                      onClick={() => openEditSubBabModal(subBab)}
                                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                                    >
                                      <FaEdit />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSubBab(subBab.id_sub_bab)}
                                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                                    >
                                      <FaTrash />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-sm">Belum ada sub-bab</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Bab Modal */}
      {showAddBabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/20 rounded-2xl p-8 w-full max-w-2xl mx-4">
            <h2 className="text-3xl font-bold mb-6 text-center">Tambah BAB Materi</h2>
            <form onSubmit={handleAddBab}>
              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Nama BAB</label>
                <input
                  type="text"
                  value={babFormData.judul_bab}
                  onChange={(e) => setbabFormData({ ...babFormData, judul_bab: e.target.value })}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  placeholder="HTML"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Deskripsi Bab</label>
                <textarea
                  value={babFormData.deskripsi_bab}
                  onChange={(e) => setbabFormData({ ...babFormData, deskripsi_bab: e.target.value })}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 min-h-[100px]"
                  placeholder="Mempelajari semua tentang HTML"
                  required
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBabModal(false);
                    setbabFormData({ judul_bab: '', deskripsi_bab: '' });
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Tambah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Bab Modal */}
      {showEditBabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/20 rounded-2xl p-8 w-full max-w-2xl mx-4">
            <h2 className="text-3xl font-bold mb-6 text-center">Edit BAB Materi</h2>
            <form onSubmit={handleEditBab}>
              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Nama BAB</label>
                <input
                  type="text"
                  value={babFormData.judul_bab}
                  onChange={(e) => setbabFormData({ ...babFormData, judul_bab: e.target.value })}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Deskripsi Bab</label>
                <textarea
                  value={babFormData.deskripsi_bab}
                  onChange={(e) => setbabFormData({ ...babFormData, deskripsi_bab: e.target.value })}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 min-h-[100px]"
                  required
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditBabModal(false);
                    setSelectedBab(null);
                    setbabFormData({ judul_bab: '', deskripsi_bab: '' });
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Sub-bab Modal */}
      {showAddSubBabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/20 rounded-2xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-bold mb-6 text-center">Tambah Sub-bab Materi</h2>
            <form onSubmit={handleAddSubBab}>
              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Nama Sub-bab</label>
                <input
                  type="text"
                  value={subBabFormData.judul_sub_bab}
                  onChange={(e) => setSubBabFormData({ ...subBabFormData, judul_sub_bab: e.target.value })}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  placeholder="HTML"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Deskripsi Sub-bab</label>
                <textarea
                  value={subBabFormData.tautan_konten.split('|')[1] || ''}
                  onChange={(e) => {
                    const currentType = subBabFormData.tautan_konten.split('|')[0] || '';
                    const currentFile = subBabFormData.tautan_konten.split('|')[2] || '';
                    setSubBabFormData({ ...subBabFormData, tautan_konten: `${currentType}|${e.target.value}|${currentFile}` });
                  }}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 min-h-[100px]"
                  placeholder="Mempelajari semua tentang HTML"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Unggah File</label>
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setFileType('dokumen')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                      fileType === 'dokumen' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-white/10 text-gray-400 hover:border-blue-500/50'
                    }`}
                  >
                    <FaFileAlt />
                    Dokumen
                  </button>
                  <button
                    type="button"
                    onClick={() => setFileType('video')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                      fileType === 'video' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-white/10 text-gray-400 hover:border-blue-500/50'
                    }`}
                  >
                    <FaVideo />
                    Video
                  </button>
                  <button
                    type="button"
                    onClick={() => setFileType('tautan')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                      fileType === 'tautan' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-white/10 text-gray-400 hover:border-blue-500/50'
                    }`}
                  >
                    <FaLink />
                    Tautan
                  </button>
                </div>

                {fileType === 'dokumen' && (
                  <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-blue-500/50 transition-colors cursor-pointer">
                    <div className="text-6xl text-gray-500 mb-4">☁️</div>
                    <p className="text-gray-400 mb-2">Unggah Dokumen</p>
                    <p className="text-xs text-gray-500">Format: .docx, .pdf, .xlsx</p>
                    <input
                      type="file"
                      accept=".docx,.pdf,.xlsx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const desc = subBabFormData.tautan_konten.split('|')[1] || '';
                          setSubBabFormData({ ...subBabFormData, tautan_konten: `dokumen|${desc}|${file.name}` });
                        }
                      }}
                      className="hidden"
                      id="dokumen-upload"
                    />
                    <label
                      htmlFor="dokumen-upload"
                      className="block cursor-pointer"
                    >
                      {subBabFormData.tautan_konten.includes('dokumen|') && <p className="text-blue-400 mt-2">{subBabFormData.tautan_konten.split('|')[2]}</p>}
                    </label>
                  </div>
                )}

                {fileType === 'video' && (
                  <input
                    type="url"
                    onChange={(e) => {
                      const desc = subBabFormData.tautan_konten.split('|')[1] || '';
                      setSubBabFormData({ ...subBabFormData, tautan_konten: `video|${desc}|${e.target.value}` });
                    }}
                    className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="https://youtube.com/... atau https://drive.google.com/..."
                  />
                )}

                {fileType === 'tautan' && (
                  <input
                    type="url"
                    onChange={(e) => {
                      const desc = subBabFormData.tautan_konten.split('|')[1] || '';
                      setSubBabFormData({ ...subBabFormData, tautan_konten: `tautan|${desc}|${e.target.value}` });
                    }}
                    className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="https://example.com..."
                  />
                )}
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSubBabModal(false);
                    setSelectedBab(null);
                    setSubBabFormData({ judul_sub_bab: '', tautan_konten: '' });
                    setFileType('dokumen');
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Tambah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sub-bab Modal */}
      {showEditSubBabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/20 rounded-2xl p-8 w-full max-w-2xl mx-4">
            <h2 className="text-3xl font-bold mb-6 text-center">Edit Sub-bab Materi</h2>
            <form onSubmit={handleEditSubBab}>
              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Nama Sub-bab</label>
                <input
                  type="text"
                  value={subBabFormData.judul_sub_bab}
                  onChange={(e) => setSubBabFormData({ ...subBabFormData, judul_sub_bab: e.target.value })}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Tautan Konten</label>
                <input
                  type="text"
                  value={subBabFormData.tautan_konten}
                  onChange={(e) => setSubBabFormData({ ...subBabFormData, tautan_konten: e.target.value })}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSubBabModal(false);
                    setSelectedSubBab(null);
                    setSubBabFormData({ judul_sub_bab: '', tautan_konten: '' });
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
