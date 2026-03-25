import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import GuruNavbar from '@/components/GuruNavbar';
import StarBackground from '@/components/StarBackground';
import supabase from '@/lib/db';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { compressFile } from '@/lib/fileCompression';
import { FaSearch, FaPlus, FaArrowLeft, FaEllipsisV, FaClock, FaCalendar, FaImage, FaTimes, FaInfoCircle, FaListAlt, FaTrash, FaStopwatch, FaChartBar, FaChartLine, FaSave } from 'react-icons/fa';
import { Asesmen, Elemen, GuruData } from '@/types/asesmen.d';

interface MenuItem {
  label: string;
  action: () => void;
  color?: string;
}

type NotificationType = 'success' | 'error';

interface Notification {
  show: boolean;
  message: string;
  type: NotificationType;
}

export default function DaftarAsesmen() {
  const router = useRouter();
  const { id: idElemenStr } = router.query;
  const idElemen = idElemenStr ? parseInt(idElemenStr as string, 10) : null;

  const [loading, setLoading] = useState(true);
  const [guruData, setGuruData] = useState<GuruData | null>(null);
  const [elemenData, setElemenData] = useState<Elemen | null>(null);
  const [asesmenList, setAsesmenList] = useState<Asesmen[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredAsesmen, setFilteredAsesmen] = useState<Asesmen[]>([]);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAsesmen, setEditingAsesmen] = useState<Asesmen | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; judul: string } | null>(null);
  const [notification, setNotification] = useState<Notification>({
    show: false,
    message: '',
    type: 'success',
  });
  const [formData, setFormData] = useState({
    judul_asesmen: '',
    sampul_asesmen_preview: '',
    sampul_asesmen_file: null as File | null,
    waktu_mulai_date: '',
    waktu_mulai_time: '',
    waktu_terakhir_date: '',
    waktu_terakhir_time: '',
    durasi_asesmen: '',
  });

  const showNotification = (message: string, type: NotificationType) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 4000);
  };

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

  // Check auth & fetch data
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

        if (idElemen) {
          await fetchElemenData(idElemen);
          await fetchAsesmenByElemen(idElemen);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error checking guru auth:', error);
        router.push('/login');
      }
    };

    if (router.isReady) {
      checkGuruAuth();
    }
  }, [router.isReady, idElemen]);

  useEffect(() => {
    const handleClickOutsideMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-asesmen-menu]')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutsideMenu);

    return () => {
      document.removeEventListener('mousedown', handleClickOutsideMenu);
    };
  }, []);

  const fetchElemenData = async (idElemen: number) => {
    try {
      const { data, error } = await supabase
        .from('elemen')
        .select(
          `
          *,
          kelas:kelas_elemen (
            id_kelas,
            nama_kelas
          )
        `,
        )
        .eq('id_elemen', idElemen)
        .single();

      if (error) {
        console.error('Error fetching elemen:', error);
        return;
      }

      setElemenData(data);
    } catch (error) {
      console.error('Error fetching elemen:', error);
    }
  };

  const fetchAsesmenByElemen = async (idElemen: number) => {
    try {
      const res = await fetch(`/api/asesmen?id_elemen=${idElemen}`);
      if (!res.ok) {
        console.error('Error fetching asesmen:', res.status);
        return;
      }

      const data = await res.json();
      setAsesmenList(data || []);
      setFilteredAsesmen(data || []);
    } catch (error) {
      console.error('Error fetching asesmen:', error);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = asesmenList.filter((item) => item.judul_asesmen.toLowerCase().includes(term.toLowerCase()));
    setFilteredAsesmen(filtered);
  };

  const handleAddAsesmen = () => {
    setEditingAsesmen(null);
    setFormData({
      judul_asesmen: '',
      sampul_asesmen_preview: '',
      sampul_asesmen_file: null,
      waktu_mulai_date: '',
      waktu_mulai_time: '',
      waktu_terakhir_date: '',
      waktu_terakhir_time: '',
      durasi_asesmen: '',
    });
    setShowForm(true);
  };

  const toLocalDateTimeInput = (value: string) => {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return {
        date: '',
        time: '',
      };
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');

    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`,
    };
  };

  const handleEditAsesmen = (asesmen: Asesmen) => {
    setEditingAsesmen(asesmen);
    const mulaiInput = toLocalDateTimeInput(asesmen.waktu_mulai);
    const terakhirInput = toLocalDateTimeInput(asesmen.waktu_terakhir);

    setFormData({
      judul_asesmen: asesmen.judul_asesmen,
      sampul_asesmen_preview: asesmen.sampul_asesmen,
      sampul_asesmen_file: null,
      waktu_mulai_date: mulaiInput.date,
      waktu_mulai_time: mulaiInput.time,
      waktu_terakhir_date: terakhirInput.date,
      waktu_terakhir_time: terakhirInput.time,
      durasi_asesmen: asesmen.durasi_asesmen ? String(asesmen.durasi_asesmen) : asesmen.durasi_kuis ? String(asesmen.durasi_kuis) : '',
    });
    setOpenMenuId(null);
    setShowForm(true);
  };

  const handleDeleteAsesmen = async (idAsesmen: number) => {
    // Find the asesmen to get its title
    const asesmen = asesmenList.find((a) => a.id_asesmen === idAsesmen);
    if (asesmen) {
      setDeleteTarget({ id: idAsesmen, judul: asesmen.judul_asesmen });
      setShowDeleteModal(true);
    }
  };

  const confirmDeleteAsesmen = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`/api/asesmen/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        console.error('Error deleting asesmen:', res.status);
        showNotification('Gagal menghapus asesmen', 'error');
        setShowDeleteModal(false);
        setDeleteTarget(null);
        return;
      }

      // Refresh list
      if (idElemen) {
        await fetchAsesmenByElemen(idElemen);
      }
      setOpenMenuId(null);
      setShowDeleteModal(false);
      setDeleteTarget(null);
      showNotification('Asesmen berhasil dihapus', 'success');
    } catch (error) {
      console.error('Error deleting asesmen:', error);
      showNotification('Gagal menghapus asesmen', 'error');
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For now, use FileReader to convert to base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = event.target?.result as string;
        setFormData({
          ...formData,
          sampul_asesmen_file: file,
          sampul_asesmen_preview: preview,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAsesmen = async () => {
    if (!formData.judul_asesmen.trim() || !formData.sampul_asesmen_preview || !formData.waktu_mulai_date || !formData.waktu_mulai_time || !formData.waktu_terakhir_date || !formData.waktu_terakhir_time) {
      showNotification('Semua field wajib harus terisi (judul, sampul, waktu mulai, waktu terakhir)', 'error');
      return;
    }

    if (!guruData || !idElemen) {
      showNotification('Data guru atau elemen tidak lengkap', 'error');
      return;
    }

    try {
      let sampulUrl = formData.sampul_asesmen_preview;

      // Handle file upload to Supabase Storage if file exists
      if (formData.sampul_asesmen_file) {
        try {
          console.log('📸 Processing sampul image, original size:', formData.sampul_asesmen_file.size);

          // Automatically compress file if needed
          let fileToUpload = formData.sampul_asesmen_file;
          if (formData.sampul_asesmen_file.size > 500 * 1024) {
            // > 500KB
            console.log('📦 File is large, compressing...');
            try {
              const compressionResult = await compressFile(formData.sampul_asesmen_file);
              fileToUpload = compressionResult.compressedFile;
              console.log(`✅ Compressed: ${compressionResult.originalSize} → ${compressionResult.compressedSize} bytes (${compressionResult.reductionPercent}% reduction)`);
            } catch (compressionError) {
              console.warn('⚠️ Compression failed, using original file:', compressionError);
              fileToUpload = formData.sampul_asesmen_file;
            }
          }

          const fileName = `asesmen-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

          // Use supabaseAdmin to bypass RLS policies
          const { data, error } = await supabaseAdmin.storage.from('weboost-storage').upload(`asesmen-covers/${fileName}`, fileToUpload, {
            cacheControl: '3600',
            upsert: false,
          });

          if (error) {
            console.error('❌ Error uploading sampul:', error);
            showNotification(`Gagal upload sampul: ${error.message}`, 'error');
            return;
          }

          // Get public URL for the uploaded file
          const { data: publicData } = supabaseAdmin.storage.from('weboost-storage').getPublicUrl(`asesmen-covers/${fileName}`);

          sampulUrl = publicData?.publicUrl || '';
          console.log('✅ Sampul uploaded successfully, size after compression:', fileToUpload.size);
        } catch (uploadError) {
          console.error('❌ Error during file upload:', uploadError);
          showNotification('Gagal upload sampul gambar', 'error');
          return;
        }
      }

      if (editingAsesmen) {
        // Update existing
        const waktuMulai = `${formData.waktu_mulai_date}T${formData.waktu_mulai_time}:00`;
        const waktuTerakhir = `${formData.waktu_terakhir_date}T${formData.waktu_terakhir_time}:00`;

        console.log('📤 Updating asesmen:', {
          id: editingAsesmen.id_asesmen,
          judul: formData.judul_asesmen,
          waktu_mulai: new Date(waktuMulai).toISOString(),
          waktu_terakhir: new Date(waktuTerakhir).toISOString(),
        });

        try {
          const res = await fetch(`/api/asesmen/${editingAsesmen.id_asesmen}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              judul_asesmen: formData.judul_asesmen,
              sampul_asesmen: sampulUrl,
              waktu_mulai: new Date(waktuMulai).toISOString(),
              waktu_terakhir: new Date(waktuTerakhir).toISOString(),
              durasi_asesmen: formData.durasi_asesmen ? parseInt(formData.durasi_asesmen, 10) : null,
            }),
          });

          if (!res.ok) {
            const errorText = await res.text();
            console.error('Error updating asesmen:', res.status, errorText);
            showNotification(`Gagal menyimpan asesmen: ${res.status}`, 'error');
            return;
          }

          // Refresh list and close form
          if (idElemen) {
            await fetchAsesmenByElemen(idElemen);
          }
          setShowForm(false);
          showNotification('Asesmen berhasil diperbarui!', 'success');
        } catch (fetchError) {
          console.error('Fetch error during asesmen update:', fetchError);
          showNotification(`Gagal menyimpan asesmen: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`, 'error');
          return;
        }
      } else {
        // Create new
        const waktuMulai = `${formData.waktu_mulai_date}T${formData.waktu_mulai_time}:00`;
        const waktuTerakhir = `${formData.waktu_terakhir_date}T${formData.waktu_terakhir_time}:00`;

        console.log('📤 Creating asesmen:', {
          judul: formData.judul_asesmen,
          guru_id: guruData.id_guru,
          elemen_id: idElemen,
          waktu_mulai: new Date(waktuMulai).toISOString(),
          waktu_terakhir: new Date(waktuTerakhir).toISOString(),
        });

        try {
          const res = await fetch('/api/asesmen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              judul_asesmen: formData.judul_asesmen,
              sampul_asesmen: sampulUrl,
              guru_asesmen: guruData.id_guru,
              id_elemen: idElemen,
              nilai_asesmen: 0,
              waktu_mulai: new Date(waktuMulai).toISOString(),
              waktu_terakhir: new Date(waktuTerakhir).toISOString(),
              durasi_asesmen: formData.durasi_asesmen ? parseInt(formData.durasi_asesmen, 10) : null,
            }),
          });

          if (!res.ok) {
            const errorText = await res.text();
            console.error('Error creating asesmen:', res.status, errorText);
            showNotification(`Gagal membuat asesmen: ${res.status}`, 'error');
            return;
          }

          const newAsesmen = await res.json();
          console.log('✅ Asesmen created with ID:', newAsesmen.id_asesmen);

          // Close the form and show success notification
          setShowForm(false);
          showNotification('Asesmen berhasil dibuat!', 'success');

          // Refresh list
          if (idElemen) {
            await fetchAsesmenByElemen(idElemen);
          }
        } catch (fetchError) {
          console.error('Fetch error during asesmen creation:', fetchError);
          showNotification(`Gagal membuat asesmen: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`, 'error');
          return;
        }
      }
    } catch (error) {
      console.error('❌ Error saving asesmen:', error);
      if (error instanceof Error) {
        console.error('  Message:', error.message);
        console.error('  Stack:', error.stack);
      }
      showNotification(`Gagal menyimpan asesmen: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleGoToSoal = (idAsesmen: number) => {
    router.push(`/guru/asesmen/kelola-soal/${idAsesmen}`);
  };

  const handleGoToProgres = (idAsesmen: number) => {
    router.push(`/guru/asesmen/progres/${idAsesmen}`);
  };

  const handleGoToAnalisis = (idAsesmen: number) => {
    router.push(`/guru/asesmen/analisis/${idAsesmen}`);
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

      {/* Notification Toast */}
      {notification.show && (
        <div
          className={`fixed top-24 right-6 px-6 py-3 rounded-lg shadow-lg z-[70] text-white max-w-sm animate-fade-in ${notification.type === 'success' ? 'bg-green-500/90 border border-green-400/30' : 'bg-red-500/90 border border-red-400/30'}`}
        >
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-red-500/50 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-600/20 rounded-full">
                <FaTimes className="text-red-500 text-2xl" />
              </div>
              <div>
                <h3 className="text-white text-xl font-bold">Konfirmasi Hapus</h3>
                <p className="text-gray-400 text-sm">Apakah Anda yakin?</p>
              </div>
            </div>
            <p className="text-white mb-6">
              Anda akan menghapus asesmen <span className="font-bold">"{deleteTarget.judul}"</span>. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-white/10 rounded-lg text-white transition-all"
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteAsesmen}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-all"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {guruData && <GuruNavbar guruName={guruData.nama_guru} />}

      <div className="relative z-10 pt-32 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Selamat Datang, <span className="text-[#FFFFFF]">{guruData?.nama_guru.split(' ')[0]}!</span>
              </h1>
              <p className="text-gray-400">{getCurrentDate()}</p>
            </div>
          </div>

          {/* Back & Title */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 border border-white/10 px-4 py-2 rounded-lg text-gray-300 hover:text-white transition-all"
              >
                <FaArrowLeft size={16} />
                Kembali
              </button>

              <div>
                <h2 className="text-2xl font-bold">{elemenData?.nama_elemen || 'Elemen'}</h2>
                <p className="text-sm text-gray-400">Daftar Asesmen</p>
              </div>
            </div>

            {/* Add Button */}
            <button
              onClick={handleAddAsesmen}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 border border-blue-500/50 px-6 py-2 rounded-lg text-white transition-all"
            >
              <FaPlus size={16} />
              Tambah Asesmen
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Cari nama asesmen..."
              className="w-full bg-gray-800 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Asesmen Cards */}
          {filteredAsesmen.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <p className="text-lg">Belum ada asesmen untuk elemen ini</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 mb-8">
              {filteredAsesmen.map((asesmen) => (
                <div
                  key={asesmen.id_asesmen}
                  onClick={() => handleGoToSoal(asesmen.id_asesmen)}
                  className="group bg-gray-800/30 border border-white/10 hover:border-blue-500/50 rounded-lg transition-all hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer"
                >
                  <div className="flex gap-4 p-4">
                    {/* Sampul */}
                    <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800">
                      {asesmen.sampul_asesmen ? (
                        <img
                          src={asesmen.sampul_asesmen}
                          alt={asesmen.judul_asesmen}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
                          <FaImage className="text-2xl text-white/50" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2 group-hover:text-blue-400 transition-colors">{asesmen.judul_asesmen}</h3>

                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-400 mb-3">
                        <div className="flex items-center gap-2">
                          <FaCalendar size={14} />
                          <span>
                            Mulai: {new Date(asesmen.waktu_mulai).toLocaleDateString('id-ID')} {new Date(asesmen.waktu_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaClock size={14} />
                          <span>
                            Akhir: {new Date(asesmen.waktu_terakhir).toLocaleDateString('id-ID')} {new Date(asesmen.waktu_terakhir).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="text-sm text-gray-400">
                        <p>Guru: {asesmen.guru?.nama_guru || '-'}</p>
                        <p>Kelas: {elemenData?.kelas?.nama_kelas || '-'}</p>
                        {(asesmen.durasi_asesmen || asesmen.durasi_kuis) && <p>Durasi Kuis: {asesmen.durasi_asesmen || asesmen.durasi_kuis} menit</p>}
                      </div>
                    </div>

                    {/* Menu */}
                    <div
                      className="relative flex-shrink-0"
                      data-asesmen-menu="true"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === asesmen.id_asesmen ? null : asesmen.id_asesmen);
                        }}
                        className="p-2 hover:bg-gray-700/50 rounded-lg transition-all"
                      >
                        <FaEllipsisV />
                      </button>

                      {openMenuId === asesmen.id_asesmen && (
                        <div className="absolute right-0 bottom-10 bg-gray-800 border border-white/10 rounded-lg shadow-lg z-50 min-w-[220px] overflow-hidden">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAsesmen(asesmen);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-700/50 border-b border-white/10 transition-all flex items-center gap-2"
                          >
                            <FaInfoCircle className="text-blue-300" />
                            Detail Asesmen
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGoToSoal(asesmen.id_asesmen);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-700/50 border-b border-white/10 transition-all flex items-center gap-2"
                          >
                            <FaListAlt className="text-cyan-300" />
                            Kelola Soal
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGoToProgres(asesmen.id_asesmen);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-700/50 border-b border-white/10 transition-all flex items-center gap-2"
                          >
                            <FaChartBar className="text-emerald-300" />
                            Progres Pengerjaan
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGoToAnalisis(asesmen.id_asesmen);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-700/50 border-b border-white/10 transition-all flex items-center gap-2"
                          >
                            <FaChartLine className="text-violet-300" />
                            Hasil Analisis
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAsesmen(asesmen.id_asesmen);
                            }}
                            className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-2"
                          >
                            <FaTrash className="text-red-400" />
                            Hapus Asesmen
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-xl max-w-2xl w-full max-h-96 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">{editingAsesmen ? 'Edit Asesmen' : 'Tambah Asesmen'}</h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-gray-800 rounded-lg transition-all"
              >
                <FaTimes />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-6 space-y-4">
              {/* Judul */}
              <div>
                <label className="block text-sm font-medium mb-2">Judul Asesmen</label>
                <input
                  type="text"
                  value={formData.judul_asesmen}
                  onChange={(e) => setFormData({ ...formData, judul_asesmen: e.target.value })}
                  placeholder="Masukkan judul asesmen"
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Sampul */}
              <div>
                <label className="block text-sm font-medium mb-2">Sampul Asesmen</label>
                <div className="flex gap-4">
                  {formData.sampul_asesmen_preview && (
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-800">
                      <img
                        src={formData.sampul_asesmen_preview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <label className="flex-1 border-2 border-dashed border-white/20 rounded-lg p-4 hover:border-blue-500/50 cursor-pointer transition-all flex flex-col items-center justify-center">
                    <FaImage className="text-2xl text-gray-400 mb-2" />
                    <span className="text-sm text-gray-400">Klik untuk upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Waktu Mulai */}
              <div>
                <label className="block text-sm font-medium mb-2">Waktu Mulai</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.waktu_mulai_date}
                      onChange={(e) => setFormData({ ...formData, waktu_mulai_date: e.target.value })}
                      className="asesmen-datetime-input w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2 pr-11 text-white focus:outline-none focus:border-blue-500"
                    />
                    <FaCalendar className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/90" />
                  </div>
                  <div className="relative">
                    <input
                      type="time"
                      value={formData.waktu_mulai_time}
                      onChange={(e) => setFormData({ ...formData, waktu_mulai_time: e.target.value })}
                      className="asesmen-datetime-input w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2 pr-11 text-white focus:outline-none focus:border-blue-500"
                    />
                    <FaClock className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/90" />
                  </div>
                </div>
              </div>

              {/* Waktu Terakhir */}
              <div>
                <label className="block text-sm font-medium mb-2">Waktu Terakhir</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.waktu_terakhir_date}
                      onChange={(e) => setFormData({ ...formData, waktu_terakhir_date: e.target.value })}
                      className="asesmen-datetime-input w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2 pr-11 text-white focus:outline-none focus:border-blue-500"
                    />
                    <FaCalendar className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/90" />
                  </div>
                  <div className="relative">
                    <input
                      type="time"
                      value={formData.waktu_terakhir_time}
                      onChange={(e) => setFormData({ ...formData, waktu_terakhir_time: e.target.value })}
                      className="asesmen-datetime-input w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2 pr-11 text-white focus:outline-none focus:border-blue-500"
                    />
                    <FaClock className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/90" />
                  </div>
                </div>
              </div>

              {/* Durasi Kuis (Opsional) */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <FaStopwatch className="text-blue-400" />
                  Durasi Kuis (Menit) - Opsional
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.durasi_asesmen}
                  onChange={(e) => setFormData({ ...formData, durasi_asesmen: e.target.value })}
                  placeholder="Contoh: 60"
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-900 border-t border-white/10 px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gray-800 hover:bg-gray-700 border border-white/10 rounded-lg transition-all inline-flex items-center gap-2"
              >
                <FaTimes size={13} />
                Batal
              </button>
              <button
                onClick={handleSaveAsesmen}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all inline-flex items-center gap-2"
              >
                <FaSave size={13} />
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      <style
        jsx
        global
      >{`
        .asesmen-datetime-input {
          color-scheme: dark;
        }

        .asesmen-datetime-input::-webkit-calendar-picker-indicator {
          opacity: 0;
          position: absolute;
          right: 0;
          width: 2.5rem;
          height: 100%;
          cursor: pointer;
        }
      `}</style>

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
