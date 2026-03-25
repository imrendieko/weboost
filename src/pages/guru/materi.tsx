import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import GuruNavbar from '@/components/GuruNavbar';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import { FaBook, FaPlus, FaEdit, FaTrash, FaChevronDown, FaChevronUp, FaFileAlt, FaVideo, FaLink, FaChartBar, FaCheck, FaTimes, FaCompress, FaDownload, FaExternalLinkAlt, FaCloudUploadAlt, FaSave, FaUnderline } from 'react-icons/fa';
import { FaBold, FaItalic, FaListUl } from 'react-icons/fa6';
import { compressFile, formatFileSize } from '@/lib/fileCompression';

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
  file_materi?: string;
  kelas_materi?: number;
  id_elemen?: number; // FK to elemen
  kelas?: {
    id_kelas: number;
    nama_kelas: string;
  };
  elemen?: {
    id_elemen: number;
    nama_elemen: string;
    sampul_elemen?: string;
  };
  guru?: {
    id_guru: number;
    nama_guru: string;
  };
  bab?: Bab[];
}

interface Elemen {
  id_elemen: number;
  nama_elemen: string;
  deskripsi_elemen: string;
  sampul_elemen?: string;
}

type NotificationType = 'success' | 'error';

interface Notification {
  show: boolean;
  message: string;
  type: NotificationType;
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const applyCommand = (command: 'bold' | 'italic' | 'underline' | 'insertUnorderedList') => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    onChange(editorRef.current?.innerHTML || '');
  };

  return (
    <div className="rounded-xl border border-white/10 bg-gray-800">
      <div className="flex flex-wrap gap-2 border-b border-white/10 px-3 py-2">
        {[
          { key: 'bold', label: 'Bold', icon: <FaBold /> },
          { key: 'italic', label: 'Italic', icon: <FaItalic /> },
          { key: 'underline', label: 'Underline', icon: <FaUnderline /> },
          { key: 'insertUnorderedList', label: 'Bullet List', icon: <FaListUl /> },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => applyCommand(item.key as 'bold' | 'italic' | 'underline' | 'insertUnorderedList')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-gray-200 transition hover:border-[#0080FF]/60 hover:text-white"
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current?.innerHTML || '')}
        data-placeholder={placeholder}
        className="min-h-[120px] w-full px-4 py-3 text-white outline-none empty:before:pointer-events-none empty:before:text-gray-500 empty:before:content-[attr(data-placeholder)]"
      />
    </div>
  );
}

export default function MateriGuru() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [guruData, setGuruData] = useState<GuruData | null>(null);
  const [materiList, setMateriList] = useState<Materi[]>([]); // List all materi
  const [materi, setMateri] = useState<Materi | null>(null); // Single materi detail
  const [elemen, setElemen] = useState<Elemen | null>(null);
  const [showAddBabModal, setShowAddBabModal] = useState(false);
  const [showEditBabModal, setShowEditBabModal] = useState(false);
  const [showAddSubBabModal, setShowAddSubBabModal] = useState(false);
  const [showEditSubBabModal, setShowEditSubBabModal] = useState(false);
  const [selectedBab, setSelectedBab] = useState<Bab | null>(null);
  const [selectedSubBab, setSelectedSubBab] = useState<SubBab | null>(null);
  const [expandedBabs, setExpandedBabs] = useState<number[]>([]);
  const [fileType, setFileType] = useState<'dokumen' | 'video' | 'tautan'>('dokumen');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedPreviews, setExpandedPreviews] = useState<number[]>([]);
  const [notification, setNotification] = useState<Notification>({ show: false, message: '', type: 'success' });
  const [showDeleteBabModal, setShowDeleteBabModal] = useState(false);
  const [deleteTargetBab, setDeleteTargetBab] = useState<{ id: number; judul: string } | null>(null);
  const [showDeleteSubBabModal, setShowDeleteSubBabModal] = useState(false);
  const [deleteTargetSubBab, setDeleteTargetSubBab] = useState<{ id: number; judul: string } | null>(null);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [compressionMessage, setCompressionMessage] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number;
    compressedSize: number;
    reductionPercent: number;
  } | null>(null);

  const [babFormData, setBabFormData] = useState({
    judul_bab: '',
    deskripsi_bab: '',
  });

  const [subBabFormData, setSubBabFormData] = useState({
    judul_sub_bab: '',
    tautan_konten: '',
  });

  const getSubBabDescription = () => subBabFormData.tautan_konten.split('|')[1] || '';

  const setSubBabDescription = (descriptionHtml: string) => {
    const currentType = subBabFormData.tautan_konten.split('|')[0] || '';
    const currentFile = subBabFormData.tautan_konten.split('|')[2] || '';
    setSubBabFormData({ ...subBabFormData, tautan_konten: `${currentType}|${descriptionHtml}|${currentFile}` });
  };

  const showNotification = (message: string, type: NotificationType) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 5000);
  };

  const handleFileSelection = async (file: File) => {
    try {
      // Check file size (50MB max before compression)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        showNotification(`File terlalu besar! Maksimal ${formatFileSize(maxSize)}`, 'error');
        return null;
      }

      setIsCompressing(true);
      setCompressionProgress(0);
      setCompressionMessage('Mempersiapkan kompresi...');

      // Compress file
      const result = await compressFile(file, (progress, message) => {
        setCompressionProgress(progress);
        setCompressionMessage(message);
      });

      setIsCompressing(false);

      // Save compression info
      if (result.reductionPercent > 0) {
        setCompressionInfo({
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          reductionPercent: result.reductionPercent,
        });

        showNotification(`File berhasil dikompres ${result.reductionPercent}%! ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)}`, 'success');
      } else {
        setCompressionInfo(null);
      }

      return result.compressedFile;
    } catch (error) {
      console.error('Error handling file selection:', error);
      setIsCompressing(false);
      showNotification('Gagal memproses file. Menggunakan file asli.', 'error');
      return file; // Return original file if compression fails
    }
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

  useEffect(() => {
    const checkGuruAuth = async () => {
      try {
        console.log('🔄 useEffect checkGuruAuth triggered');
        console.log('🔍 router.isReady:', router.isReady);
        console.log('🔍 router.query:', router.query);

        const guruSession = localStorage.getItem('guru_session');

        if (!guruSession) {
          console.log('❌ No guru session found, redirecting to login');
          router.push('/login');
          return;
        }

        const sessionData = JSON.parse(guruSession);
        console.log('✅ Guru session data:', sessionData);
        setGuruData(sessionData);

        // Check if we have id_materi query param (detail view)
        const idMateri = router.query.id_materi as string;
        const elemenQuery = router.query.elemen;
        const idElemenFilter = typeof elemenQuery === 'string' ? parseInt(elemenQuery, 10) : null;

        if (idMateri) {
          // DETAIL VIEW: Show specific materi with bab-bab
          console.log('✅ id_materi exists, showing detail view:', idMateri);
          await fetchMateriDetail(parseInt(idMateri));
        } else {
          // LIST VIEW: Show all materi as cards
          console.log('✅ No id_materi, showing list view');
          await fetchAllMateri(sessionData.id_guru, Number.isNaN(idElemenFilter || NaN) ? undefined : idElemenFilter || undefined);
        }

        setLoading(false);
        console.log('✅ Loading complete');
      } catch (error) {
        console.error('❌ Error checking guru auth:', error);
        router.push('/login');
      }
    };

    if (router.isReady) {
      checkGuruAuth();
    }
  }, [router.isReady, router.query.id_materi, router.query.elemen]);

  const fetchAllMateri = async (idGuru: number, idElemenFilter?: number) => {
    try {
      console.log('📥 fetchAllMateri called for guru:', idGuru);
      const response = await fetch(`/api/materi?id_guru=${idGuru}`);

      if (!response.ok) {
        throw new Error('Failed to fetch materi list');
      }

      const data = await response.json();
      console.log('✅ Materi list fetched:', data);

      // For each materi, fetch its bab-bab for preview
      const materiWithBabs = await Promise.all(
        (data || []).map(async (m: any) => {
          try {
            const detailResponse = await fetch(`/api/materi/${m.id_materi}`);
            if (detailResponse.ok) {
              const materiDetail = await detailResponse.json();
              // Keep elemen from original data since detail might not have it
              if (m.elemen) {
                materiDetail.elemen = m.elemen;
              }
              return materiDetail;
            }
            return m;
          } catch (error) {
            console.error('Error fetching bab for materi:', m.id_materi);
            return m;
          }
        }),
      );

      const filteredMateri = idElemenFilter ? materiWithBabs.filter((m: any) => m.id_elemen === idElemenFilter || m.elemen?.id_elemen === idElemenFilter || m.kelas_materi === idElemenFilter) : materiWithBabs;

      setMateriList(filteredMateri);
    } catch (error) {
      console.error('❌ Error fetching all materi:', error);
      showNotification('Gagal memuat daftar materi', 'error');
    }
  };

  const fetchElemenData = async (idElemen: number) => {
    try {
      const response = await fetch(`/api/elemen/${idElemen}`);
      const data = await response.json();
      if (response.ok) {
        setElemen(data);
      }
    } catch (error) {
      console.error('Error fetching elemen data:', error);
    }
  };

  const fetchOrCreateMateri = async (idGuru: number, idElemen: number) => {
    try {
      console.log('🔍 fetchOrCreateMateri called with idGuru:', idGuru, 'idElemen:', idElemen);

      // Fetch existing materi for this elemen
      const materiResponse = await fetch(`/api/materi?id_guru=${idGuru}`);
      const materiData = await materiResponse.json();

      console.log('📊 Fetched materi data:', materiData);

      let currentMateri;
      // Find materi for this specific elemen (you may need to add elemen_materi field to materi table)
      const existingMateri = materiData?.find((m: any) => m.kelas_materi === idElemen);

      if (existingMateri) {
        console.log('✅ Found existing materi for elemen:', existingMateri);
        currentMateri = existingMateri;
      } else if (materiData && materiData.length > 0) {
        // Use first materi if no specific materi for elemen
        console.log('⚠️ No specific materi for elemen, using first materi:', materiData[0]);
        currentMateri = materiData[0];
      } else {
        // Create default materi
        console.log('🆕 Creating new default materi...');
        const createResponse = await fetch('/api/materi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            judul_materi: 'Materi Pembelajaran',
            deskripsi_materi: 'Materi Pembelajaran',
            kelas_materi: 1, // Default to first class
            guru_materi: idGuru,
          }),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          console.error('❌ Failed to create materi:', errorData);
          throw new Error('Failed to create materi');
        }

        currentMateri = await createResponse.json();
        console.log('✅ Materi created:', currentMateri);
      }

      if (!currentMateri || !currentMateri.id_materi) {
        console.error('❌ currentMateri is invalid:', currentMateri);
        throw new Error('Invalid materi data');
      }

      console.log('📥 Fetching materi detail for id:', currentMateri.id_materi);
      // Fetch full detail with bab and sub-bab
      await fetchMateriDetail(currentMateri.id_materi);
    } catch (error) {
      console.error('❌ Error in fetchOrCreateMateri:', error);
      showNotification('Gagal memuat data materi. Silakan refresh halaman.', 'error');
    }
  };

  const fetchMateriDetail = async (idMateri: number) => {
    try {
      console.log('📥 fetchMateriDetail called with idMateri:', idMateri);
      const response = await fetch(`/api/materi/${idMateri}`);

      if (!response.ok) {
        console.error('❌ Failed to fetch materi detail, status:', response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Materi detail fetched:', data);

      if (data) {
        setMateri(data);
        console.log('✅ Materi state updated:', data);
      } else {
        console.error('❌ No data returned from API');
      }
    } catch (error) {
      console.error('❌ Error fetching materi detail:', error);
      showNotification('Gagal memuat detail materi', 'error');
    }
  };

  const handleAddBab = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🔍 handleAddBab called');
    console.log('📊 Materi state:', materi);
    console.log('📝 Form data:', babFormData);

    if (!materi) {
      console.error('❌ Materi is null!');
      showNotification('Gagal menambahkan bab: Data materi tidak ditemukan', 'error');
      return;
    }

    // Validasi form
    if (!babFormData.judul_bab.trim() || !stripHtml(babFormData.deskripsi_bab)) {
      showNotification('Semua field harus diisi', 'error');
      return;
    }

    try {
      console.log('📤 Sending POST request to /api/bab');
      const response = await fetch('/api/bab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_materi: materi.id_materi,
          ...babFormData,
        }),
      });

      console.log('📥 Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Bab created successfully:', result);
        setShowAddBabModal(false);
        setBabFormData({ judul_bab: '', deskripsi_bab: '' });
        await fetchMateriDetail(materi.id_materi);
        showNotification('Bab berhasil ditambahkan', 'success');
      } else {
        const errorData = await response.json();
        console.error('❌ Error response:', errorData);
        showNotification(errorData.error || 'Gagal menambahkan bab', 'error');
      }
    } catch (error) {
      console.error('❌ Error adding bab:', error);
      showNotification('Terjadi kesalahan saat menambahkan bab', 'error');
    }
  };

  const handleEditBab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBab || !materi) return;

    // Validasi form
    if (!babFormData.judul_bab.trim() || !stripHtml(babFormData.deskripsi_bab)) {
      showNotification('Semua field harus diisi', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/bab/${selectedBab.id_bab}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(babFormData),
      });

      if (response.ok) {
        setShowEditBabModal(false);
        setSelectedBab(null);
        setBabFormData({ judul_bab: '', deskripsi_bab: '' });
        await fetchMateriDetail(materi.id_materi);
        showNotification('Bab berhasil diperbarui', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Gagal mengedit bab', 'error');
      }
    } catch (error) {
      console.error('Error editing bab:', error);
      showNotification('Terjadi kesalahan saat mengedit bab', 'error');
    }
  };

  const handleDeleteBab = (idBab: number, judulBab: string) => {
    setDeleteTargetBab({ id: idBab, judul: judulBab });
    setShowDeleteBabModal(true);
  };

  const confirmDeleteBab = async () => {
    if (!deleteTargetBab || !materi) return;

    try {
      const response = await fetch(`/api/bab/${deleteTargetBab.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchMateriDetail(materi.id_materi);
        showNotification('Bab berhasil dihapus', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Gagal menghapus bab', 'error');
      }
    } catch (error) {
      console.error('Error deleting bab:', error);
      showNotification('Terjadi kesalahan saat menghapus bab', 'error');
    } finally {
      setShowDeleteBabModal(false);
      setDeleteTargetBab(null);
    }
  };

  const handleAddSubBab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBab || !materi) return;

    // Validasi form
    if (!subBabFormData.judul_sub_bab.trim()) {
      showNotification('Judul sub-bab harus diisi', 'error');
      return;
    }

    const desc = subBabFormData.tautan_konten.split('|')[1] || '';
    if (!stripHtml(desc)) {
      showNotification('Deskripsi sub-bab harus diisi', 'error');
      return;
    }

    if (fileType === 'dokumen' && !uploadedFile) {
      showNotification('Pilih file dokumen terlebih dahulu', 'error');
      return;
    }

    const url = subBabFormData.tautan_konten.split('|')[2] || '';
    if ((fileType === 'video' || fileType === 'tautan') && !url.trim()) {
      showNotification('URL harus diisi', 'error');
      return;
    }

    setIsUploading(true);

    try {
      let finalTautanKonten = subBabFormData.tautan_konten;

      // Upload file if dokumen type and file is selected
      if (fileType === 'dokumen' && uploadedFile) {
        try {
          console.log('📤 Starting file upload:', uploadedFile.name, 'Size:', formatFileSize(uploadedFile.size));

          // Convert file to base64
          const reader = new FileReader();
          const fileBase64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(uploadedFile);
          });

          console.log('🔄 File converted to base64, uploading to server...');

          // Upload via API (server-side with supabaseAdmin)
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file: fileBase64,
              fileName: uploadedFile.name,
              fileType: uploadedFile.type,
            }),
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            console.error('❌ Upload error:', errorData);
            showNotification('Gagal mengupload file: ' + (errorData.details || errorData.error), 'error');
            setIsUploading(false);
            return;
          }

          const uploadData = await uploadResponse.json();
          console.log('✅ File uploaded successfully:', uploadData.url);

          const desc = subBabFormData.tautan_konten.split('|')[1] || '';
          finalTautanKonten = `dokumen|${desc}|${uploadData.url}`;
        } catch (uploadError) {
          console.error('❌ Upload error:', uploadError);
          showNotification('Gagal mengupload file: ' + (uploadError instanceof Error ? uploadError.message : 'Unknown error'), 'error');
          setIsUploading(false);
          return;
        }
      }

      const response = await fetch('/api/sub-bab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_bab: selectedBab.id_bab,
          judul_sub_bab: subBabFormData.judul_sub_bab,
          tautan_konten: finalTautanKonten,
        }),
      });

      if (response.ok) {
        setShowAddSubBabModal(false);
        setSelectedBab(null);
        setSubBabFormData({ judul_sub_bab: '', tautan_konten: '' });
        setFileType('dokumen');
        setUploadedFile(null);
        await fetchMateriDetail(materi.id_materi);
        showNotification('Sub-bab berhasil ditambahkan', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Gagal menambahkan sub-bab', 'error');
      }
    } catch (error) {
      console.error('Error adding sub-bab:', error);
      showNotification('Terjadi kesalahan saat menambahkan sub-bab', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditSubBab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubBab || !materi) return;

    try {
      setIsUploading(true);
      let finalTautanKonten = subBabFormData.tautan_konten;

      // If user uploaded a new file, upload it first
      if (uploadedFile && fileType === 'dokumen') {
        console.log('📤 Starting file upload for edit:', uploadedFile.name, 'Size:', formatFileSize(uploadedFile.size));

        // Delete old file first if it exists
        const oldFileUrl = selectedSubBab.tautan_konten.split('|')[2];
        const oldFileType = selectedSubBab.tautan_konten.split('|')[0];

        if (oldFileUrl && oldFileType === 'dokumen' && oldFileUrl.includes('weboost-storage')) {
          try {
            console.log('🗑️ Deleting old file:', oldFileUrl);
            await fetch('/api/delete-file', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileUrl: oldFileUrl }),
            });
            console.log('✅ Old file deleted');
          } catch (deleteError) {
            console.error('⚠️ Warning: Failed to delete old file:', deleteError);
            // Continue with upload even if delete fails
          }
        }

        // Convert file to base64
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            resolve(base64String.split(',')[1]); // Remove data:*/*;base64, prefix
          };
          reader.readAsDataURL(uploadedFile);
        });

        console.log('🔄 File converted to base64, uploading to server...');

        // Upload new file to server
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: uploadedFile.name,
            fileData: base64,
            fileType: uploadedFile.type,
          }),
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          console.error('❌ Upload error:', errorData);
          throw new Error(errorData.details || 'Upload failed');
        }

        const { url } = await uploadResponse.json();
        const desc = subBabFormData.tautan_konten.split('|')[1] || '';
        finalTautanKonten = `dokumen|${desc}|${url}`;
        console.log('✅ New file uploaded successfully:', url);
      }

      const response = await fetch(`/api/sub-bab/${selectedSubBab.id_sub_bab}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...subBabFormData,
          tautan_konten: finalTautanKonten,
        }),
      });

      if (response.ok) {
        setShowEditSubBabModal(false);
        setSelectedSubBab(null);
        setSubBabFormData({ judul_sub_bab: '', tautan_konten: '' });
        setFileType('dokumen');
        setUploadedFile(null);
        await fetchMateriDetail(materi.id_materi);
        showNotification('Sub-bab berhasil diperbarui', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Gagal mengedit sub-bab', 'error');
      }
    } catch (error) {
      console.error('Error editing sub-bab:', error);
      showNotification('Terjadi kesalahan saat mengedit sub-bab', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteSubBab = (idSubBab: number, judulSubBab: string) => {
    setDeleteTargetSubBab({ id: idSubBab, judul: judulSubBab });
    setShowDeleteSubBabModal(true);
  };

  const confirmDeleteSubBab = async () => {
    if (!deleteTargetSubBab || !materi) return;

    try {
      // Find the sub-bab to get file URL
      const subBabToDelete = materi.bab?.flatMap((bab) => bab.sub_bab || []).find((sb) => sb.id_sub_bab === deleteTargetSubBab.id);

      // Delete file from storage if it's a document
      if (subBabToDelete) {
        const fileUrl = subBabToDelete.tautan_konten.split('|')[2];
        const fileType = subBabToDelete.tautan_konten.split('|')[0];

        if (fileUrl && fileType === 'dokumen' && fileUrl.includes('weboost-storage')) {
          try {
            console.log('🗑️ Deleting file from storage:', fileUrl);
            await fetch('/api/delete-file', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileUrl }),
            });
          } catch (deleteError) {
            console.error('Warning: Failed to delete file:', deleteError);
            // Continue with record deletion even if file delete fails
          }
        }
      }

      const response = await fetch(`/api/sub-bab/${deleteTargetSubBab.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchMateriDetail(materi.id_materi);
        showNotification('Sub-bab berhasil dihapus', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Gagal menghapus sub-bab', 'error');
      }
    } catch (error) {
      console.error('Error deleting sub-bab:', error);
      showNotification('Terjadi kesalahan saat menghapus sub-bab', 'error');
    } finally {
      setShowDeleteSubBabModal(false);
      setDeleteTargetSubBab(null);
    }
  };

  const toggleBabExpand = (idBab: number) => {
    setExpandedBabs((prev) => (prev.includes(idBab) ? prev.filter((id) => id !== idBab) : [...prev, idBab]));
  };

  const openEditBabModal = (bab: Bab) => {
    setSelectedBab(bab);
    setBabFormData({
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

    // Parse tautan_konten to get type, description, and URL
    const parts = subBab.tautan_konten.split('|');
    const type = parts[0] || 'tautan';

    // Set file type based on content
    if (type === 'dokumen') {
      setFileType('dokumen');
    } else if (type === 'video') {
      setFileType('video');
    } else {
      setFileType('tautan');
    }

    setSubBabFormData({
      judul_sub_bab: subBab.judul_sub_bab,
      tautan_konten: subBab.tautan_konten,
    });

    setShowEditSubBabModal(true);
  };

  const handleViewMateriProgress = () => {
    if (!materi?.bab || materi.bab.length === 0) {
      showNotification('Belum ada BAB untuk dilihat progresnya', 'error');
      return;
    }

    const firstSubBab = materi.bab.flatMap((bab) => bab.sub_bab || []).find((item) => item?.id_sub_bab);

    if (!firstSubBab) {
      showNotification('Belum ada sub-bab untuk dilihat progresnya', 'error');
      return;
    }

    router.push(`/guru/materi/progres/${firstSubBab.id_sub_bab}`);
  };

  const togglePreview = (idSubBab: number) => {
    setExpandedPreviews((prev) => (prev.includes(idSubBab) ? prev.filter((id) => id !== idSubBab) : [...prev, idSubBab]));
  };

  const convertYouTubeUrl = (url: string): string => {
    // Handle youtube.com/watch?v=VIDEO_ID
    if (url.includes('youtube.com/watch')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    // Handle youtu.be/VIDEO_ID
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    // Already embed URL or other
    return url;
  };

  const getFileTypeFromUrl = (tautanKonten: string): string => {
    const parts = tautanKonten.split('|');
    if (parts.length >= 3) {
      return parts[0]; // 'dokumen', 'video', or 'tautan'
    }
    return 'tautan';
  };

  const getFileUrlFromContent = (tautanKonten: string): string => {
    const parts = tautanKonten.split('|');
    if (parts.length >= 3) {
      return parts[2]; // URL
    }
    return tautanKonten;
  };

  const getDescriptionFromContent = (tautanKonten: string): string => {
    const parts = tautanKonten.split('|');
    if (parts.length >= 3) {
      return parts[1]; // Description
    }
    return '';
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      showNotification('Mengunduh file...', 'success');

      // Fetch file as blob
      const response = await fetch(fileUrl);

      if (!response.ok) {
        throw new Error('Gagal mengunduh file');
      }

      const blob = await response.blob();

      // Create temporary URL
      const blobUrl = window.URL.createObjectURL(blob);

      // Create temporary anchor element
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      showNotification('File berhasil diunduh', 'success');
    } catch (error) {
      console.error('Error downloading file:', error);
      showNotification('Gagal mengunduh file', 'error');
    }
  };

  const InlineFilePreview = ({ subBab }: { subBab: SubBab }) => {
    const fileType = getFileTypeFromUrl(subBab.tautan_konten);
    const fileUrl = getFileUrlFromContent(subBab.tautan_konten);
    const description = getDescriptionFromContent(subBab.tautan_konten);

    const getFileExtension = (url: string): string => {
      const match = url.match(/\.([^.]+)$/);
      return match ? match[1].toLowerCase() : '';
    };

    const getFileName = (url: string): string => {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const fileName = pathname.split('/').pop() || 'file';
        return decodeURIComponent(fileName);
      } catch {
        return `${subBab.judul_sub_bab}.${getFileExtension(url)}`;
      }
    };

    const extension = getFileExtension(fileUrl);
    const isOfficeDocument = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension);
    const previewUrl =
      extension === 'pdf' ? fileUrl : isOfficeDocument ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}` : `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;

    return (
      <div className="mt-4 border-t border-white/10 pt-4">
        {description && <p className="text-gray-400 mb-3">{description}</p>}

        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {fileType === 'dokumen' && (
            <div
              className="w-full"
              style={{ height: '600px' }}
            >
              <iframe
                src={previewUrl}
                className="w-full h-full"
                title={subBab.judul_sub_bab}
              />
            </div>
          )}

          {fileType === 'video' && (
            <div
              className="w-full"
              style={{ height: '600px' }}
            >
              {fileUrl.includes('youtube.com') || fileUrl.includes('youtu.be') ? (
                <iframe
                  src={convertYouTubeUrl(fileUrl)}
                  className="w-full h-full"
                  title={subBab.judul_sub_bab}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={fileUrl}
                  controls
                  className="w-full h-full"
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          )}

          {fileType === 'tautan' && (
            <div className="p-8 text-center">
              <FaLink className="text-6xl text-blue-400 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">Link Eksternal</p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline break-all block mb-6"
              >
                {fileUrl}
              </a>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => handleDownloadFile(fileUrl, getFileName(fileUrl))}
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  <FaDownload /> Download
                </button>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  <FaExternalLinkAlt /> Buka di Tab Baru
                </a>
              </div>
            </div>
          )}
        </div>

        {fileType !== 'tautan' && (
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => handleDownloadFile(fileUrl, getFileName(fileUrl))}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              <FaDownload /> Download
            </button>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              <FaExternalLinkAlt /> Buka di Tab Baru
            </a>
          </div>
        )}
      </div>
    );
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
                Selamat Datang, <span className="text-white">{guruData?.nama_guru.split(' ')[0]}!</span>
              </h1>
              <p className="text-gray-400">{getCurrentDate()}</p>
            </div>

            {/* Clock Timer */}
            <CountdownTimer />
          </div>

          {/* Back Button */}
          {router.query.id_materi && (
            <button
              onClick={() => router.back()}
              className="mb-6 flex items-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 border border-white/10 px-4 py-2 rounded-lg text-gray-300 hover:text-white transition-all"
            >
              <span>←</span> Kembali
            </button>
          )}

          {/* Conditional Content: List View or Detail View */}
          {!router.query.id_materi ? (
            // ===== LIST VIEW: Show all materi as cards =====
            <div className="mb-8">
              <div className="mb-6 flex items-center gap-3">
                <FaBook className="text-2xl text-[#FFFFFF]" />
                <h2 className="text-2xl font-bold">Pilih Elemen untuk Kelola Materi</h2>
              </div>

              {materiList.length === 0 ? (
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
                  <p className="text-gray-400 text-lg mb-4">Belum ada materi yang dibuat</p>
                  <p className="text-gray-500 text-sm">Silakan buat materi dari dashboard</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {materiList.map((materiItem) => (
                    <div
                      key={materiItem.id_materi}
                      className="card-container cursor-pointer"
                      onClick={() => router.push(`/guru/materi?id_materi=${materiItem.id_materi}`)}
                    >
                      <div className="card">
                        {/* Front Side */}
                        <div className="card-front bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 rounded-xl overflow-hidden shadow-lg hover:shadow-[0_0_30px_rgba(0,128,255,0.3)] transition-all duration-300">
                          <div className="relative h-48 w-full bg-gray-900">
                            {materiItem.elemen?.sampul_elemen ? (
                              <Image
                                src={materiItem.elemen.sampul_elemen}
                                alt={materiItem.elemen?.nama_elemen || materiItem.judul_materi}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                                <div className="text-6xl">📚</div>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                          </div>
                          <div className="p-4">
                            <h3 className="text-xl font-bold text-white">{materiItem.elemen?.nama_elemen || materiItem.judul_materi}</h3>
                            <p className="text-gray-400 text-sm mt-1">{materiItem.kelas?.nama_kelas || 'Kelas tidak ditemukan'}</p>
                            <p className="text-gray-300 text-xs mt-1">Pengampu: {materiItem.guru?.nama_guru || 'Guru'}</p>
                          </div>
                        </div>

                        {/* Back Side */}
                        <div className="card-back bg-gradient-to-br from-[#0080FF] to-[#0050AA] border border-white/20 rounded-xl p-6 shadow-lg overflow-hidden">
                          <h3 className="text-lg font-bold mb-3 text-white">BAB Materi</h3>
                          <h4 className="text-base font-semibold mb-3 text-white/90">
                            {materiItem.elemen?.nama_elemen || materiItem.judul_materi} - {materiItem.kelas?.nama_kelas || 'Kelas tidak ditemukan'}
                          </h4>
                          <div className="space-y-2 overflow-y-auto max-h-44 pr-1">
                            {materiItem.bab && materiItem.bab.length > 0 ? (
                              <ol className="list-decimal list-inside text-white/95 text-sm space-y-2">
                                {materiItem.bab.map((bab) => (
                                  <li
                                    key={bab.id_bab}
                                    className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 transition-colors hover:bg-white/20"
                                  >
                                    {bab.judul_bab}
                                  </li>
                                ))}
                              </ol>
                            ) : (
                              <p className="text-white/85 text-sm">Belum ada bab.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // ===== DETAIL VIEW: Show specific materi with bab-bab =====
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <FaBook className="text-white" /> Materi {materi?.elemen?.nama_elemen || materi?.judul_materi || 'Materi Pembelajaran'}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleViewMateriProgress}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <FaChartBar size={12} />
                    Progres
                  </button>

                  <button
                    onClick={() => {
                      console.log('🖱️ Tambah BAB button clicked');
                      console.log('📊 Current materi state:', materi);

                      if (!materi) {
                        showNotification('Data materi belum dimuat. Silakan tunggu atau refresh halaman.', 'error');
                        return;
                      }

                      setShowAddBabModal(true);
                    }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <FaPlus />
                    Tambah BAB
                  </button>
                </div>
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
                              onClick={() => handleDeleteBab(bab.id_bab, bab.judul_bab)}
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
                                  className="bg-gray-800/50 border border-white/10 rounded-lg overflow-hidden"
                                >
                                  {/* Sub-bab Header */}
                                  <div
                                    className="p-4 cursor-pointer hover:bg-gray-700/30 transition-colors"
                                    onClick={() => togglePreview(subBab.id_sub_bab)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3 flex-1">
                                        <button className="text-blue-400">{expandedPreviews.includes(subBab.id_sub_bab) ? <FaChevronUp /> : <FaChevronDown />}</button>
                                        {getFileTypeFromUrl(subBab.tautan_konten) === 'dokumen' && <FaFileAlt className="text-blue-400" />}
                                        {getFileTypeFromUrl(subBab.tautan_konten) === 'video' && <FaVideo className="text-red-400" />}
                                        {getFileTypeFromUrl(subBab.tautan_konten) === 'tautan' && <FaLink className="text-green-400" />}
                                        <div>
                                          <p className="text-xl font-bold">{subBab.judul_sub_bab}</p>
                                        </div>
                                      </div>
                                      <div
                                        className="flex gap-2"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <button
                                          onClick={() => openEditSubBabModal(subBab)}
                                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                                        >
                                          <FaEdit />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSubBab(subBab.id_sub_bab, subBab.judul_sub_bab)}
                                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                                        >
                                          <FaTrash />
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Inline Preview */}
                                  {expandedPreviews.includes(subBab.id_sub_bab) && (
                                    <div className="px-4 pb-4">
                                      <InlineFilePreview subBab={subBab} />
                                    </div>
                                  )}
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
          )}
          {/* End of Conditional Rendering */}
        </div>
      </div>

      {/* CSS for Card Flip Animation */}
      <style jsx>{`
        .card-container {
          perspective: 1000px;
          height: 320px;
        }

        .card {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1);
          will-change: transform;
          transform-style: preserve-3d;
        }

        .card-container:hover .card,
        .card-container:focus-within .card {
          transform: rotateY(180deg);
        }

        .card-front,
        .card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }

        .card-back {
          transform: rotateY(180deg) translateZ(1px);
        }
      `}</style>

      {/* Add Bab Modal */}
      {showAddBabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/20 rounded-2xl p-8 w-full max-w-2xl mx-4">
            <h2 className="text-3xl font-bold mb-6 text-center">Tambah BAB Materi</h2>
            {notification.show && (
              <div className={`mb-4 px-4 py-3 rounded-lg ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white flex items-center gap-3`}>
                {notification.type === 'success' ? <FaCheck /> : <FaTimes />}
                <span>{notification.message}</span>
              </div>
            )}
            <form onSubmit={handleAddBab}>
              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Nama BAB</label>
                <input
                  type="text"
                  value={babFormData.judul_bab}
                  onChange={(e) => setBabFormData({ ...babFormData, judul_bab: e.target.value })}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Nama Bab:"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Deskripsi Bab</label>
                <RichTextEditor
                  value={babFormData.deskripsi_bab}
                  onChange={(value) => setBabFormData({ ...babFormData, deskripsi_bab: value })}
                  placeholder="Deskripsi Bab"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBabModal(false);
                    setBabFormData({ judul_bab: '', deskripsi_bab: '' });
                  }}
                  className="flex flex-1 items-center justify-center gap-2 bg-gray-700 px-6 py-3 font-semibold text-white rounded-lg transition-colors hover:bg-gray-600"
                >
                  <FaTimes />
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex flex-1 items-center justify-center gap-2 bg-blue-600 px-6 py-3 font-semibold text-white rounded-lg transition-colors hover:bg-blue-700"
                >
                  <FaPlus />
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
            {notification.show && (
              <div className={`mb-4 px-4 py-3 rounded-lg ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white flex items-center gap-3`}>
                {notification.type === 'success' ? <FaCheck /> : <FaTimes />}
                <span>{notification.message}</span>
              </div>
            )}
            <form onSubmit={handleEditBab}>
              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Nama Bab</label>
                <input
                  type="text"
                  value={babFormData.judul_bab}
                  onChange={(e) => setBabFormData({ ...babFormData, judul_bab: e.target.value })}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Deskripsi Bab</label>
                <RichTextEditor
                  value={babFormData.deskripsi_bab}
                  onChange={(value) => setBabFormData({ ...babFormData, deskripsi_bab: value })}
                  placeholder="Deskripsi Bab"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditBabModal(false);
                    setSelectedBab(null);
                    setBabFormData({ judul_bab: '', deskripsi_bab: '' });
                  }}
                  className="flex flex-1 items-center justify-center gap-2 bg-gray-700 px-6 py-3 font-semibold text-white rounded-lg transition-colors hover:bg-gray-600"
                >
                  <FaTimes />
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex flex-1 items-center justify-center gap-2 bg-blue-600 px-6 py-3 font-semibold text-white rounded-lg transition-colors hover:bg-blue-700"
                >
                  <FaSave />
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
            {notification.show && (
              <div className={`mb-4 px-4 py-3 rounded-lg ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white flex items-center gap-3`}>
                {notification.type === 'success' ? <FaCheck /> : <FaTimes />}
                <span>{notification.message}</span>
              </div>
            )}
            <form onSubmit={handleAddSubBab}>
              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Nama Sub-bab</label>
                <input
                  type="text"
                  value={subBabFormData.judul_sub_bab}
                  onChange={(e) => setSubBabFormData({ ...subBabFormData, judul_sub_bab: e.target.value })}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Nama Sub-bab:"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Deskripsi Sub-bab</label>
                <RichTextEditor
                  value={getSubBabDescription()}
                  onChange={setSubBabDescription}
                  placeholder="Deskripsi Sub-bab"
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
                  <div>
                    <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-blue-500/50 transition-colors cursor-pointer">
                      <FaCloudUploadAlt className="text-6xl text-gray-400 mb-4 mx-auto" />
                      <p className="text-gray-400 mb-2">Unggah Dokumen</p>
                      <p className="text-xs text-gray-500 mb-4">Format: .docx, .pdf, .xlsx, .pptx (Max 50MB, akan dikompres otomatis)</p>
                      <input
                        type="file"
                        accept=".docx,.pdf,.xlsx,.pptx,.doc,.xls,.ppt"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const compressedFile = await handleFileSelection(file);
                            if (compressedFile) {
                              setUploadedFile(compressedFile);
                              const desc = subBabFormData.tautan_konten.split('|')[1] || '';
                              setSubBabFormData({ ...subBabFormData, tautan_konten: `dokumen|${desc}|${compressedFile.name}` });
                            } else {
                              e.target.value = '';
                            }
                          }
                        }}
                        className="hidden"
                        id="dokumen-upload"
                        disabled={isCompressing}
                      />
                      <label
                        htmlFor="dokumen-upload"
                        className={`inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors ${isCompressing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <FaCloudUploadAlt />
                        {isCompressing ? 'Mengompres...' : 'Pilih File'}
                      </label>
                    </div>
                    {isCompressing && (
                      <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <FaCompress className="text-blue-400 animate-pulse" />
                          <p className="text-sm text-blue-400">{compressionMessage}</p>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${compressionProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {uploadedFile && !isCompressing && (
                      <div className="mt-3 p-3 bg-gray-800 rounded-lg border border-white/10">
                        <p className="text-sm text-gray-300">File terpilih:</p>
                        <p className="text-blue-400 font-medium">{uploadedFile.name}</p>
                        <p className="text-xs text-gray-500">Ukuran: {formatFileSize(uploadedFile.size)}</p>
                        {compressionInfo && compressionInfo.reductionPercent > 0 && (
                          <div className="mt-2 pt-2 border-t border-white/10">
                            <p className="text-xs text-green-400 flex items-center gap-1">
                              <FaCompress />
                              Dikompres {compressionInfo.reductionPercent}%
                              <span className="text-gray-500">
                                ({formatFileSize(compressionInfo.originalSize)} → {formatFileSize(compressionInfo.compressedSize)})
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
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
                    setUploadedFile(null);
                  }}
                  className="flex flex-1 items-center justify-center gap-2 bg-gray-700 px-6 py-3 font-semibold text-white rounded-lg transition-colors hover:bg-gray-600"
                >
                  <FaTimes />
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex flex-1 items-center justify-center gap-2 bg-blue-600 px-6 py-3 font-semibold text-white rounded-lg transition-colors hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {isUploading ? <FaCloudUploadAlt className="animate-pulse" /> : <FaPlus />}
                  {isUploading ? 'Mengupload...' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sub-bab Modal */}
      {showEditSubBabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/20 rounded-2xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-bold mb-6 text-center">Edit Sub-bab Materi</h2>
            {notification.show && (
              <div className={`mb-4 px-4 py-3 rounded-lg ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white flex items-center gap-3`}>
                {notification.type === 'success' ? <FaCheck /> : <FaTimes />}
                <span>{notification.message}</span>
              </div>
            )}
            <form onSubmit={handleEditSubBab}>
              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Nama Sub-bab</label>
                <input
                  type="text"
                  value={subBabFormData.judul_sub_bab}
                  onChange={(e) => setSubBabFormData({ ...subBabFormData, judul_sub_bab: e.target.value })}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Pengertian dan Fungsi HTML"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Deskripsi Sub-bab</label>
                <RichTextEditor
                  value={getSubBabDescription()}
                  onChange={setSubBabDescription}
                  placeholder="Deskripsi Sub-bab"
                />
              </div>

              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Tipe Konten</label>
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setFileType('dokumen');
                      const desc = subBabFormData.tautan_konten.split('|')[1] || '';
                      const url = subBabFormData.tautan_konten.split('|')[2] || '';
                      setSubBabFormData({ ...subBabFormData, tautan_konten: `dokumen|${desc}|${url}` });
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                      fileType === 'dokumen' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-white/10 text-gray-400 hover:border-blue-500/50'
                    }`}
                  >
                    <FaFileAlt />
                    Dokumen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFileType('video');
                      const desc = subBabFormData.tautan_konten.split('|')[1] || '';
                      const url = subBabFormData.tautan_konten.split('|')[2] || '';
                      setSubBabFormData({ ...subBabFormData, tautan_konten: `video|${desc}|${url}` });
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                      fileType === 'video' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-white/10 text-gray-400 hover:border-blue-500/50'
                    }`}
                  >
                    <FaVideo />
                    Video
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFileType('tautan');
                      const desc = subBabFormData.tautan_konten.split('|')[1] || '';
                      const url = subBabFormData.tautan_konten.split('|')[2] || '';
                      setSubBabFormData({ ...subBabFormData, tautan_konten: `tautan|${desc}|${url}` });
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                      fileType === 'tautan' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-white/10 text-gray-400 hover:border-blue-500/50'
                    }`}
                  >
                    <FaLink />
                    Tautan
                  </button>
                </div>

                {fileType === 'dokumen' && (
                  <div>
                    {/* Show current file if exists */}
                    {subBabFormData.tautan_konten.split('|')[2] && !uploadedFile && (
                      <div className="mb-3 p-3 bg-gray-800 rounded-lg border border-white/10">
                        <p className="text-sm text-gray-300">File saat ini:</p>
                        <a
                          href={subBabFormData.tautan_konten.split('|')[2]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline font-medium block truncate"
                        >
                          {subBabFormData.tautan_konten.split('|')[2].split('/').pop()}
                        </a>
                        <p className="text-xs text-gray-500 mt-1">Klik untuk membuka file</p>
                      </div>
                    )}

                    <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-blue-500/50 transition-colors cursor-pointer">
                      <FaCloudUploadAlt className="text-6xl text-gray-400 mb-4 mx-auto" />
                      <p className="text-gray-400 mb-2">{uploadedFile || subBabFormData.tautan_konten.split('|')[2] ? 'Ganti Dokumen' : 'Unggah Dokumen'}</p>
                      <p className="text-xs text-gray-500 mb-4">Format: .docx, .pdf, .xlsx, .pptx (Max 50MB, akan dikompres otomatis)</p>
                      <input
                        type="file"
                        accept=".docx,.pdf,.xlsx,.pptx,.doc,.xls,.ppt"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const compressedFile = await handleFileSelection(file);
                            if (compressedFile) {
                              setUploadedFile(compressedFile);
                              const desc = subBabFormData.tautan_konten.split('|')[1] || '';
                              setSubBabFormData({ ...subBabFormData, tautan_konten: `dokumen|${desc}|${compressedFile.name}` });
                            } else {
                              e.target.value = '';
                            }
                          }
                        }}
                        className="hidden"
                        id="dokumen-upload-edit"
                        disabled={isCompressing}
                      />
                      <label
                        htmlFor="dokumen-upload-edit"
                        className={`inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors ${isCompressing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <FaCloudUploadAlt />
                        {isCompressing ? 'Mengompres...' : 'Pilih File'}
                      </label>
                    </div>

                    {isCompressing && (
                      <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                        <div className="flex items-center mb-2">
                          <FaCompress className="text-blue-400 mr-2 animate-pulse" />
                          <p className="text-sm text-blue-400">{compressionMessage}</p>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${compressionProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {uploadedFile && (
                      <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                        <p className="text-sm text-green-400">File baru terpilih:</p>
                        <p className="text-white font-medium">{uploadedFile.name}</p>
                        <p className="text-xs text-gray-400">Ukuran: {formatFileSize(uploadedFile.size)}</p>
                        {compressionInfo && compressionInfo.reductionPercent > 0 && (
                          <div className="mt-2 pt-2 border-t border-green-500/20">
                            <div className="flex items-center text-xs text-green-400">
                              <FaCompress className="mr-1" />
                              <span>Dikompres {compressionInfo.reductionPercent.toFixed(1)}%</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatFileSize(compressionInfo.originalSize)} → {formatFileSize(compressionInfo.compressedSize)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {fileType === 'video' && (
                  <div>
                    <input
                      type="url"
                      value={subBabFormData.tautan_konten.split('|')[2] || ''}
                      onChange={(e) => {
                        const desc = subBabFormData.tautan_konten.split('|')[1] || '';
                        setSubBabFormData({ ...subBabFormData, tautan_konten: `video|${desc}|${e.target.value}` });
                      }}
                      className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      placeholder="https://youtube.com/... atau https://drive.google.com/..."
                      required
                    />
                    <p className="text-xs text-gray-500 mt-2">Masukkan URL video YouTube, Google Drive, atau platform video lainnya</p>
                  </div>
                )}

                {fileType === 'tautan' && (
                  <div>
                    <input
                      type="url"
                      value={subBabFormData.tautan_konten.split('|')[2] || ''}
                      onChange={(e) => {
                        const desc = subBabFormData.tautan_konten.split('|')[1] || '';
                        setSubBabFormData({ ...subBabFormData, tautan_konten: `tautan|${desc}|${e.target.value}` });
                      }}
                      className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      placeholder="https://example.com..."
                      required
                    />
                    <p className="text-xs text-gray-500 mt-2">Masukkan URL website atau resource eksternal</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSubBabModal(false);
                    setSelectedSubBab(null);
                    setSubBabFormData({ judul_sub_bab: '', tautan_konten: '' });
                    setFileType('dokumen');
                    setUploadedFile(null);
                  }}
                  className="flex flex-1 items-center justify-center gap-2 bg-gray-700 px-6 py-3 font-semibold text-white rounded-lg transition-colors hover:bg-gray-600"
                >
                  <FaTimes />
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex flex-1 items-center justify-center gap-2 bg-blue-600 px-6 py-3 font-semibold text-white rounded-lg transition-colors hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {isUploading ? <FaCloudUploadAlt className="animate-pulse" /> : <FaSave />}
                  {isUploading ? 'Mengupload...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Bab Confirmation Modal */}
      {showDeleteBabModal && deleteTargetBab && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-red-500/50 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-600/20 rounded-full">
                <FaTrash className="text-red-500 text-2xl" />
              </div>
              <h2 className="text-white text-2xl font-bold">Konfirmasi Penghapusan</h2>
            </div>

            <p className="text-gray-300 mb-6">
              Apakah Anda yakin ingin menghapus bab <span className="font-semibold text-white">{deleteTargetBab.judul}</span>?
              <br />
              <span className="text-red-400 text-sm">Semua sub-bab di dalam bab ini juga akan terhapus. Tindakan ini tidak dapat dibatalkan.</span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteBabModal(false);
                  setDeleteTargetBab(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteBab}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Sub-bab Confirmation Modal */}
      {showDeleteSubBabModal && deleteTargetSubBab && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-red-500/50 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-600/20 rounded-full">
                <FaTrash className="text-red-500 text-2xl" />
              </div>
              <h2 className="text-white text-2xl font-bold">Konfirmasi Penghapusan</h2>
            </div>

            <p className="text-gray-300 mb-6">
              Apakah Anda yakin ingin menghapus sub-bab <span className="font-semibold text-white">{deleteTargetSubBab.judul}</span>?
              <br />
              <span className="text-red-400 text-sm">Tindakan ini tidak dapat dibatalkan.</span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteSubBabModal(false);
                  setDeleteTargetSubBab(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteSubBab}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold"
              >
                Hapus
              </button>
            </div>
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
