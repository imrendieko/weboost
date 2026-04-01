import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import GuruNavbar from '@/components/GuruNavbar';
import StarBackground from '@/components/StarBackground';
import supabase from '@/lib/db';
import { FaArrowLeft, FaPlus, FaGripVertical, FaTrash, FaCopy, FaImage, FaCheck, FaTimes, FaExclamationTriangle, FaSave, FaCode, FaAlignLeft, FaListUl, FaChevronDown, FaBold, FaItalic, FaUnderline, FaRandom } from 'react-icons/fa';
import { Asesmen, SoalAsesmen, PilihanGandaEditor, EditorSoalState, TujuanPembelajaran, GuruData } from '@/types/asesmen.d';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { compressFile } from '@/lib/fileCompression';

type TipeSoal = 'pilihan_ganda' | 'uraian' | 'baris_kode';
type NotificationType = 'success' | 'error';

interface NotificationState {
  show: boolean;
  message: string;
  type: NotificationType;
}

const PILIHAN_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;

const PILIHAN_CARD_STYLES: Record<string, string> = {
  A: 'border-fuchsia-400/50 bg-fuchsia-500/10',
  B: 'border-violet-400/50 bg-violet-500/10',
  C: 'border-cyan-400/50 bg-cyan-500/10',
  D: 'border-emerald-400/50 bg-emerald-500/10',
  E: 'border-amber-400/50 bg-amber-500/10',
};

const TIPE_SOAL_OPTIONS = [
  { value: 'pilihan_ganda' as TipeSoal, label: 'Pilihan Ganda', Icon: FaListUl },
  { value: 'uraian' as TipeSoal, label: 'Uraian', Icon: FaAlignLeft },
  { value: 'baris_kode' as TipeSoal, label: 'Baris Kode Program', Icon: FaCode },
];

function RichTextEditorSoal({ value, onChange }: { value: string; onChange: (value: string) => void }) {
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
    <div className="rounded-2xl border border-white/10 bg-white/5">
      <div className="flex flex-wrap gap-2 border-b border-white/10 px-4 py-3">
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
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-gray-200 transition hover:border-[#0080FF]/60 hover:text-white"
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
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        className="min-h-[120px] px-4 py-4 text-sm leading-7 text-white focus:outline-none"
        style={{ whiteSpace: 'pre-wrap' }}
      />
    </div>
  );
}

const buildPilihanGandaEditor = (pilihan: PilihanGandaEditor[] = []): PilihanGandaEditor[] => {
  return PILIHAN_LABELS.map((opsi, index) => {
    const existing = pilihan.find((item) => item.opsi_pilgan === opsi);
    return {
      id_pilgan: existing?.id_pilgan || 0,
      opsi_pilgan: opsi,
      urutan_pilgan: index + 1,
      teks_pilgan: existing?.teks_pilgan || '',
      gambar_pilgan: existing?.gambar_pilgan || '',
      kunci_pilgan: existing?.kunci_pilgan || false,
    };
  });
};

export default function KelolaSoalAsesmen() {
  const router = useRouter();
  const { id: idAsesmenStr } = router.query;
  const idAsesmen = idAsesmenStr ? parseInt(idAsesmenStr as string, 10) : null;

  const [loading, setLoading] = useState(true);
  const [guruData, setGuruData] = useState<GuruData | null>(null);
  const [asesmenData, setAsesmenData] = useState<Asesmen | null>(null);
  const [soalList, setSoalList] = useState<SoalAsesmen[]>([]);
  const [tujuanList, setTujuanList] = useState<TujuanPembelajaran[]>([]);
  const [selectedSoalId, setSelectedSoalId] = useState<number | null>(null);
  const [draggedSoalId, setDraggedSoalId] = useState<number | null>(null);
  const [editorState, setEditorState] = useState<EditorSoalState | null>(null);
  const [saving, setSaving] = useState(false);
  const [isSoalRandomized, setIsSoalRandomized] = useState(false);
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    message: '',
    type: 'success',
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; text: string } | null>(null);
  const [showTipeSoalMenu, setShowTipeSoalMenu] = useState(false);

  const showNotification = (message: string, type: NotificationType) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3500);
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

        if (idAsesmen) {
          await Promise.all([fetchAsesmenData(idAsesmen), fetchSoalByAsesmen(idAsesmen)]);
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
  }, [router.isReady, idAsesmen]);

  useEffect(() => {
    const handleClickOutsideMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-tipe-soal-menu]')) {
        setShowTipeSoalMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutsideMenu);

    return () => {
      document.removeEventListener('mousedown', handleClickOutsideMenu);
    };
  }, []);

  const fetchAsesmenData = async (idAsesmen: number) => {
    try {
      console.log('📥 Fetching asesmen data for ID:', idAsesmen);

      const res = await fetch(`/api/asesmen/${idAsesmen}`);
      if (!res.ok) {
        const errorData = await res.json();
        console.error('❌ Error fetching asesmen:', res.status, errorData);
        showNotification(`Asesmen tidak ditemukan. ID: ${idAsesmen}`, 'error');
        router.push('/guru/asesmen');
        return;
      }

      const data = await res.json();
      console.log('✅ Asesmen data loaded:', data);
      setAsesmenData(data);

      // Set randomization status from database
      if (data.acak_soal !== undefined) {
        setIsSoalRandomized(data.acak_soal);
      }

      // Fetch tujuan pembelajaran untuk elemen ini
      if (data.id_elemen) {
        await fetchTujuanByElemen(data.id_elemen);
      }
    } catch (error) {
      console.error('Error fetching asesmen:', error);
      showNotification('Gagal memuat data asesmen', 'error');
      router.push('/guru/asesmen');
    }
  };

  const fetchTujuanByElemen = async (idElemen: number) => {
    try {
      const { data, error } = await supabase.from('tujuan_pembelajaran').select('*').eq('elemen_tp', idElemen).order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tujuan:', error);
        return;
      }

      setTujuanList(data || []);
    } catch (error) {
      console.error('Error fetching tujuan:', error);
    }
  };

  const fetchSoalByAsesmen = async (idAsesmen: number, selectedId?: number) => {
    try {
      const res = await fetch(`/api/asesmen/soal?id_asesmen=${idAsesmen}`);
      if (!res.ok) {
        console.error('Error fetching soal:', res.status);
        return;
      }

      const data = await res.json();
      setSoalList(data || []);

      // Keep current selection if requested, otherwise select first soal.
      if (data && data.length > 0) {
        const preferred = selectedId ? data.find((item: SoalAsesmen) => item.id_soal === selectedId) : null;
        handleSelectSoal(preferred || data[0]);
      }
    } catch (error) {
      console.error('Error fetching soal:', error);
    }
  };

  // Helper function to save current editor state without showing notification
  const autoSaveCurrentSoal = async (): Promise<boolean> => {
    if (!editorState || !idAsesmen) return true;

    // For autosave: Only skip if soal text is completely empty, but allow empty pilihan
    if (editorState.teks_soal?.trim() === '') {
      console.warn('⚠️ Autosave skipped: Soal text is empty');
      return false;
    }

    try {
      let gambarSoalUrl = editorState.gambar_soal_preview || '';
      let pilihanGandaPayload = editorState.tipe_soal === 'pilihan_ganda' ? [...(editorState.pilihan_ganda || [])] : [];

      // Handle gambar soal upload if needed
      if (editorState.gambar_soal_file) {
        const reader = new FileReader();
        const base64File = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(editorState.gambar_soal_file as File);
        });

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: base64File,
            fileName: editorState.gambar_soal_file.name,
            fileType: editorState.gambar_soal_file.type,
          }),
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          gambarSoalUrl = uploadData.url;
        }
      }

      // Handle pilihan ganda images
      if (editorState.tipe_soal === 'pilihan_ganda' && pilihanGandaPayload.length > 0) {
        pilihanGandaPayload = await Promise.all(
          pilihanGandaPayload.map(async (pilihan) => {
            let gambarPilihanUrl = pilihan.gambar_pilgan || '';

            if (pilihan.gambar_file) {
              let fileToUpload = pilihan.gambar_file;
              if (fileToUpload.size > 500 * 1024) {
                const compression = await compressFile(fileToUpload);
                fileToUpload = compression.compressedFile;
              }

              const reader = new FileReader();
              const base64File = await new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(fileToUpload);
              });

              const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fileData: base64File,
                  fileName: fileToUpload.name,
                  fileType: fileToUpload.type,
                }),
              });

              if (uploadRes.ok) {
                const uploadData = await uploadRes.json();
                gambarPilihanUrl = uploadData.url;
              }
            }

            if (gambarPilihanUrl.startsWith('data:')) {
              gambarPilihanUrl = '';
            }

            return {
              ...pilihan,
              gambar_pilgan: gambarPilihanUrl,
              gambar_file: undefined,
            };
          }),
        );
      }

      // Save to API
      const res = await fetch(`/api/asesmen/soal/${editorState.id_soal}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teks_soal: editorState.teks_soal,
          teks_jawaban: editorState.teks_jawaban,
          gambar_soal: gambarSoalUrl,
          nilai_soal: editorState.nilai_soal,
          id_tp: editorState.id_tp,
          kunci_teks: editorState.kunci_teks,
          tipe_soal: editorState.tipe_soal,
          pilihan_ganda:
            editorState.tipe_soal === 'pilihan_ganda'
              ? pilihanGandaPayload.map((pilihan) => ({
                  id_pilgan: pilihan.id_pilgan,
                  opsi_pilgan: pilihan.opsi_pilgan,
                  urutan_pilgan: pilihan.urutan_pilgan,
                  teks_pilgan: pilihan.teks_pilgan,
                  gambar_pilgan: pilihan.gambar_pilgan,
                  kunci_pilgan: pilihan.kunci_pilgan,
                }))
              : [],
        }),
      });

      if (res.ok) {
        setEditorState((current) =>
          current
            ? {
                ...current,
                gambar_soal_preview: gambarSoalUrl,
                gambar_soal_file: undefined,
                pilihan_ganda: current.tipe_soal === 'pilihan_ganda' ? pilihanGandaPayload : current.pilihan_ganda,
              }
            : current,
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error auto-saving soal:', error);
      return false;
    }
  };

  const handleSelectSoal = async (soal: SoalAsesmen) => {
    // Auto-save current soal before switching
    if (editorState && selectedSoalId !== soal.id_soal) {
      await autoSaveCurrentSoal();
    }

    setSelectedSoalId(soal.id_soal);

    // Initialize editor state
    const pilihan = (soal.pilihan_ganda || []).sort((a, b) => a.urutan_pilgan - b.urutan_pilgan);

    // For pilihan_ganda type, ensure we have all 5 options (A-E) with proper data
    let pilihan_ganda_editor: PilihanGandaEditor[];
    if (soal.tipe_soal === 'pilihan_ganda') {
      // Build complete A-E options, preserving existing data
      pilihan_ganda_editor = buildPilihanGandaEditor(
        pilihan.map((p) => ({
          id_pilgan: p.id_pilgan,
          opsi_pilgan: p.opsi_pilgan,
          urutan_pilgan: p.urutan_pilgan,
          teks_pilgan: p.teks_pilgan || '',
          gambar_pilgan: p.gambar_pilgan || '',
          kunci_pilgan: p.kunci_pilgan,
        }))
      );
    } else {
      // For non-pilihan_ganda types, just map the data
      pilihan_ganda_editor = pilihan.map((p) => ({
        id_pilgan: p.id_pilgan,
        opsi_pilgan: p.opsi_pilgan,
        urutan_pilgan: p.urutan_pilgan,
        teks_pilgan: p.teks_pilgan || '',
        gambar_pilgan: p.gambar_pilgan || '',
        kunci_pilgan: p.kunci_pilgan,
      }));
    }

    console.log('📝 Loading soal with pilihan_ganda:', pilihan_ganda_editor);

    setEditorState({
      id_soal: soal.id_soal,
      teks_soal: soal.teks_soal,
      teks_jawaban: soal.teks_jawaban || '',
      gambar_soal_preview: soal.gambar_soal || '',
      nilai_soal: soal.nilai_soal,
      urutan_soal: soal.urutan_soal,
      id_tp: soal.id_tp,
      tipe_soal: soal.tipe_soal as TipeSoal,
      kunci_teks: soal.kunci_teks,
      pilihan_ganda: pilihan_ganda_editor,
    });
  };

  const handleAddSoal = async () => {
    if (!idAsesmen) return;

    try {
      // Get max urutan_soal
      const maxUrutan = soalList.length > 0 ? Math.max(...soalList.map((s) => s.urutan_soal)) + 1 : 1;

      const res = await fetch('/api/asesmen/soal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_asesmen: idAsesmen,
          teks_soal: '',
          teks_jawaban: '',
          nilai_soal: 10,
          kunci_teks: '',
          urutan_soal: maxUrutan,
          id_tp: tujuanList[0]?.id_tp || 1,
          tipe_soal: 'pilihan_ganda',
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error('Error adding soal:', error);
        showNotification(`Gagal menambah soal: ${error.error}`, 'error');
        return;
      }

      const newSoal = await res.json();

      // Add default pilihan ganda via API
      await fetch('/api/asesmen/soal/pilihan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_soal: newSoal.id_soal,
          pilihan_list: [
            { opsi_pilgan: 'A', urutan_pilgan: 1, teks_pilgan: '', gambar_pilgan: '', kunci_pilgan: false },
            { opsi_pilgan: 'B', urutan_pilgan: 2, teks_pilgan: '', gambar_pilgan: '', kunci_pilgan: false },
            { opsi_pilgan: 'C', urutan_pilgan: 3, teks_pilgan: '', gambar_pilgan: '', kunci_pilgan: true },
            { opsi_pilgan: 'D', urutan_pilgan: 4, teks_pilgan: '', gambar_pilgan: '', kunci_pilgan: false },
            { opsi_pilgan: 'E', urutan_pilgan: 5, teks_pilgan: '', gambar_pilgan: '', kunci_pilgan: false },
          ],
        }),
      });

      await fetchSoalByAsesmen(idAsesmen);
      showNotification('Soal baru berhasil ditambahkan', 'success');
    } catch (error) {
      console.error('Error adding soal:', error);
      showNotification('Gagal menambah soal', 'error');
    }
  };

  const handleDuplicateSoal = async (soal: SoalAsesmen) => {
    if (!idAsesmen) return;

    try {
      const maxUrutan = Math.max(...soalList.map((s) => s.urutan_soal)) + 1;

      const res = await fetch('/api/asesmen/soal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_asesmen: idAsesmen,
          teks_soal: soal.teks_soal + ' (Copy)',
          teks_jawaban: soal.teks_jawaban,
          nilai_soal: soal.nilai_soal,
          kunci_teks: soal.kunci_teks,
          urutan_soal: maxUrutan,
          id_tp: soal.id_tp,
          tipe_soal: soal.tipe_soal,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error('Error duplicating soal:', error);
        showNotification(`Gagal menduplikat soal: ${error.error}`, 'error');
        return;
      }

      const newSoal = await res.json();

      // Duplicate pilihan ganda if exists
      if (soal.tipe_soal === 'pilihan_ganda' && soal.pilihan_ganda) {
        const pilihan_copies = soal.pilihan_ganda.map((p) => ({
          id_soal: newSoal.id_soal,
          opsi_pilgan: p.opsi_pilgan,
          urutan_pilgan: p.urutan_pilgan,
          teks_pilgan: p.teks_pilgan,
          gambar_pilgan: p.gambar_pilgan,
          kunci_pilgan: p.kunci_pilgan,
        }));

        // Create pilihan ganda records
        for (const pilihan of pilihan_copies) {
          await fetch('/api/asesmen/soal/pilihan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pilihan),
          });
        }
      }

      await fetchSoalByAsesmen(idAsesmen);
      showNotification('Soal berhasil diduplikat!', 'success');
    } catch (error) {
      console.error('Error duplicating soal:', error);
      showNotification('Gagal menduplikat soal', 'error');
    }
  };

  const handleDeleteSoal = (idSoal: number) => {
    const target = soalList.find((soal) => soal.id_soal === idSoal);
    setDeleteTarget({
      id: idSoal,
      text: target?.teks_soal || 'Soal ini',
    });
    setShowDeleteModal(true);
  };

  const confirmDeleteSoal = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`/api/asesmen/soal/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        console.error('Error deleting soal:', error);
        showNotification('Gagal menghapus soal', 'error');
        return;
      }

      if (idAsesmen) {
        await fetchSoalByAsesmen(idAsesmen);
      }
      setSelectedSoalId(null);
      setEditorState(null);
      showNotification('Soal berhasil dihapus', 'success');
    } catch (error) {
      console.error('Error deleting soal:', error);
      showNotification('Gagal menghapus soal', 'error');
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const handleSaveSoal = async () => {
    if (!editorState || !idAsesmen) return;

    if (editorState.tipe_soal === 'pilihan_ganda' && editorState.pilihan_ganda) {
      const invalidOption = editorState.pilihan_ganda.find((item) => !item.teks_pilgan?.trim() && !item.gambar_pilgan?.trim());
      if (invalidOption) {
        showNotification(`Pilihan ${invalidOption.opsi_pilgan} harus diisi teks atau gambar.`, 'error');
        return;
      }
    }

    setSaving(true);

    try {
      let gambarSoalUrl = editorState.gambar_soal_preview || '';
      let pilihanGandaPayload = editorState.tipe_soal === 'pilihan_ganda' ? [...(editorState.pilihan_ganda || [])] : [];

      if (editorState.gambar_soal_file) {
        const reader = new FileReader();
        const base64File = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(editorState.gambar_soal_file as File);
        });

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: base64File,
            fileName: editorState.gambar_soal_file.name,
            fileType: editorState.gambar_soal_file.type,
          }),
        });

        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json();
          console.error('Error uploading gambar soal:', uploadErr);
          showNotification('Gagal upload gambar soal', 'error');
          setSaving(false);
          return;
        }

        const uploadData = await uploadRes.json();
        gambarSoalUrl = uploadData.url;
      }

      if (editorState.tipe_soal === 'pilihan_ganda' && pilihanGandaPayload.length > 0) {
        pilihanGandaPayload = await Promise.all(
          pilihanGandaPayload.map(async (pilihan) => {
            let gambarPilihanUrl = pilihan.gambar_pilgan || '';

            if (pilihan.gambar_file) {
              let fileToUpload = pilihan.gambar_file;
              if (fileToUpload.size > 500 * 1024) {
                const compression = await compressFile(fileToUpload);
                fileToUpload = compression.compressedFile;
              }

              const reader = new FileReader();
              const base64File = await new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(fileToUpload);
              });

              const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fileData: base64File,
                  fileName: fileToUpload.name,
                  fileType: fileToUpload.type,
                }),
              });

              if (!uploadRes.ok) {
                const uploadErr = await uploadRes.json();
                throw new Error(uploadErr?.error || `Gagal upload gambar pada pilihan ${pilihan.opsi_pilgan}`);
              }

              const uploadData = await uploadRes.json();
              gambarPilihanUrl = uploadData.url;
            }

            // Never send data URL previews to API payload.
            if (gambarPilihanUrl.startsWith('data:')) {
              gambarPilihanUrl = '';
            }

            return {
              ...pilihan,
              gambar_pilgan: gambarPilihanUrl,
              gambar_file: undefined,
            };
          }),
        );
      }

      const res = await fetch(`/api/asesmen/soal/${editorState.id_soal}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teks_soal: editorState.teks_soal,
          teks_jawaban: editorState.teks_jawaban,
          gambar_soal: gambarSoalUrl,
          nilai_soal: editorState.nilai_soal,
          id_tp: editorState.id_tp,
          kunci_teks: editorState.kunci_teks,
          tipe_soal: editorState.tipe_soal,
          pilihan_ganda:
            editorState.tipe_soal === 'pilihan_ganda'
              ? pilihanGandaPayload.map((pilihan) => ({
                  id_pilgan: pilihan.id_pilgan,
                  opsi_pilgan: pilihan.opsi_pilgan,
                  urutan_pilgan: pilihan.urutan_pilgan,
                  teks_pilgan: pilihan.teks_pilgan,
                  gambar_pilgan: pilihan.gambar_pilgan,
                  kunci_pilgan: pilihan.kunci_pilgan,
                }))
              : [],
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error('Error updating soal:', error);
        showNotification('Gagal menyimpan soal', 'error');
        setSaving(false);
        return;
      }

      setEditorState((current) =>
        current
          ? {
              ...current,
              gambar_soal_preview: gambarSoalUrl,
              gambar_soal_file: undefined,
              pilihan_ganda: current.tipe_soal === 'pilihan_ganda' ? pilihanGandaPayload : current.pilihan_ganda,
            }
          : current,
      );

      await fetchSoalByAsesmen(idAsesmen, editorState.id_soal);

      showNotification('Soal berhasil disimpan!', 'success');
      setSaving(false);
    } catch (error) {
      console.error('Error saving soal:', error);
      showNotification('Gagal menyimpan soal', 'error');
      setSaving(false);
    }
  };

  const handleImageUpload = async (index: number, file: File) => {
    if (!editorState || editorState.tipe_soal !== 'pilihan_ganda' || !editorState.pilihan_ganda) return;

    try {
      let fileToUse = file;
      if (file.size > 500 * 1024) {
        const compression = await compressFile(file);
        fileToUse = compression.compressedFile;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        const updatedPilihan = [...(editorState.pilihan_ganda as PilihanGandaEditor[])];
        updatedPilihan[index].gambar_pilgan = preview;
        updatedPilihan[index].teks_pilgan = '';
        updatedPilihan[index].gambar_file = fileToUse;

        setEditorState({
          ...editorState,
          pilihan_ganda: updatedPilihan,
        });
      };
      reader.readAsDataURL(fileToUse);
    } catch (error) {
      console.error('Error handling pilihan image upload:', error);
      showNotification('Gagal memproses gambar pilihan', 'error');
    }
  };

  const handleSoalImageUpload = async (file: File) => {
    if (!editorState) return;

    let fileToUse = file;
    if (file.size > 500 * 1024) {
      const compression = await compressFile(file);
      fileToUse = compression.compressedFile;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      setEditorState({
        ...editorState,
        gambar_soal_preview: preview,
        gambar_soal_file: fileToUse,
      });
    };
    reader.readAsDataURL(fileToUse);
  };

  const handleDragStart = (soalId: number) => {
    setDraggedSoalId(soalId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetSoalId: number) => {
    if (!draggedSoalId || draggedSoalId === targetSoalId || !idAsesmen) return;

    // Auto-save before reordering
    await autoSaveCurrentSoal();

    try {
      const draggedIndex = soalList.findIndex((s) => s.id_soal === draggedSoalId);
      const targetIndex = soalList.findIndex((s) => s.id_soal === targetSoalId);

      if (draggedIndex === -1 || targetIndex === -1) return;

      const newList = [...soalList];
      [newList[draggedIndex], newList[targetIndex]] = [newList[targetIndex], newList[draggedIndex]];

      // Update urutan_soal for both
      const draggedSoal = newList[draggedIndex];
      const targetSoal = newList[targetIndex];

      await Promise.all([
        fetch(`/api/asesmen/soal/${draggedSoal.id_soal}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            urutan_soal: draggedIndex + 1,
            teks_soal: draggedSoal.teks_soal,
            nilai_soal: draggedSoal.nilai_soal,
            tipe_soal: draggedSoal.tipe_soal,
          }),
        }),
        fetch(`/api/asesmen/soal/${targetSoal.id_soal}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            urutan_soal: targetIndex + 1,
            teks_soal: targetSoal.teks_soal,
            nilai_soal: targetSoal.nilai_soal,
            tipe_soal: targetSoal.tipe_soal,
          }),
        }),
      ]);

      setSoalList(newList);
    } catch (error) {
      console.error('Error reordering soal:', error);
    } finally {
      setDraggedSoalId(null);
    }
  };

  const handleRandomizeSoal = async () => {
    if (!soalList || soalList.length === 0 || !idAsesmen) return;

    try {
      let updatedList: SoalAsesmen[];
      let newRandomizedStatus = false;

      if (isSoalRandomized) {
        // Cancel randomize - restore original order
        updatedList = soalList.map((soal, index) => ({
          ...soal,
          urutan_soal: index + 1,
        }));

        await Promise.all(
          updatedList.map((soal) =>
            fetch(`/api/asesmen/soal/${soal.id_soal}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                urutan_soal: soal.urutan_soal,
                teks_soal: soal.teks_soal,
                nilai_soal: soal.nilai_soal,
                tipe_soal: soal.tipe_soal,
              }),
            }),
          ),
        );

        // Save randomization status to database
        await fetch(`/api/asesmen/${idAsesmen}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            judul_asesmen: asesmenData?.judul_asesmen,
            sampul_asesmen: asesmenData?.sampul_asesmen,
            waktu_mulai: asesmenData?.waktu_mulai,
            waktu_terakhir: asesmenData?.waktu_terakhir,
            nilai_asesmen: asesmenData?.nilai_asesmen,
            durasi_asesmen: asesmenData?.durasi_asesmen,
            acak_soal: false,
          }),
        });

        setSoalList(updatedList);
        setIsSoalRandomized(false);
        showNotification('Pengacakan soal dibatalkan!', 'success');
      } else {
        // Randomize order
        const indices = Array.from({ length: soalList.length }, (_, i) => i);
        const shuffled = indices.sort(() => Math.random() - 0.5);

        updatedList = soalList.map((soal, currentIndex) => ({
          ...soal,
          urutan_soal: shuffled[currentIndex] + 1,
        }));

        await Promise.all(
          updatedList.map((soal) =>
            fetch(`/api/asesmen/soal/${soal.id_soal}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                urutan_soal: soal.urutan_soal,
                teks_soal: soal.teks_soal,
                nilai_soal: soal.nilai_soal,
                tipe_soal: soal.tipe_soal,
              }),
            }),
          ),
        );

        // Save randomization status to database
        await fetch(`/api/asesmen/${idAsesmen}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            judul_asesmen: asesmenData?.judul_asesmen,
            sampul_asesmen: asesmenData?.sampul_asesmen,
            waktu_mulai: asesmenData?.waktu_mulai,
            waktu_terakhir: asesmenData?.waktu_terakhir,
            nilai_asesmen: asesmenData?.nilai_asesmen,
            durasi_asesmen: asesmenData?.durasi_asesmen,
            acak_soal: true,
          }),
        });

        const sortedList = updatedList.sort((a, b) => a.urutan_soal - b.urutan_soal);
        setSoalList(sortedList);
        setIsSoalRandomized(true);
        showNotification('Soal berhasil diacak!', 'success');
      }
    } catch (error) {
      console.error('Error randomizing soal:', error);
      showNotification(isSoalRandomized ? 'Gagal membatalkan pengacakan' : 'Gagal mengacak soal', 'error');
    }
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

      <div className="relative z-10 pt-24 pb-12 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => router.back()}
                className="mb-6 flex items-center gap-2 rounded-lg border border-white/10 bg-gray-800/50 px-3 sm:px-4 py-1.5 sm:py-2 text-gray-300 transition-all hover:bg-gray-700/50 hover:text-white"
              >
                <FaArrowLeft />
                Kembali
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Kelola Soal</h1>
                <p className="text-xs sm:text-sm text-gray-400">{asesmenData?.judul_asesmen || 'Asesmen'}</p>
              </div>
            </div>
          </div>

          {/* Main Content: 3-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 h-auto lg:h-[calc(100vh-280px)]">
            {/* Sidebar Kiri: Daftar Soal */}
            <div className="soal-sidebar lg:col-span-1 bg-gray-900/50 border border-white/10 rounded-xl overflow-hidden flex flex-col max-h-96 sm:max-h-[500px] lg:max-h-none">
              <div className="bg-gray-800/50 border-b border-white/10 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
                <h3 className="font-bold text-sm sm:text-base">Daftar Soal</h3>
                <button
                  onClick={handleAddSoal}
                  className="p-1 hover:bg-gray-700 rounded transition-all"
                  title="Tambah soal"
                >
                  <FaPlus size={14} />
                </button>
              </div>

              {soalList.length > 0 && (
                <div className="bg-gray-800/30 border-b border-white/10 px-3 sm:px-4 py-2 flex items-center gap-2">
                  <button
                    onClick={handleRandomizeSoal}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm rounded transition-all whitespace-nowrap ${
                      isSoalRandomized
                        ? 'bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-400 hover:text-emerald-300'
                        : 'bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-400 hover:text-blue-300'
                    }`}
                    title={isSoalRandomized ? 'Batalkan pengacakan soal' : 'Acak urutan soal untuk siswa'}
                  >
                    <FaRandom size={12} />
                    {isSoalRandomized ? 'Soal Teracak ✓' : 'Acak Soal'}
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto">
                {soalList.length === 0 ? (
                  <div className="p-3 sm:p-4 text-center text-gray-400 text-xs sm:text-sm">Belum ada soal. Klik + untuk menambah.</div>
                ) : (
                  <div className="p-2 sm:p-3 space-y-2">
                    {soalList.map((soal, idx) => (
                      <div
                        key={soal.id_soal}
                        draggable
                        onDragStart={() => handleDragStart(soal.id_soal)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(soal.id_soal)}
                        onClick={() => {
                          handleSelectSoal(soal);
                        }}
                        className={`p-2 sm:p-3 rounded-lg cursor-move transition-all border ${selectedSoalId === soal.id_soal ? 'bg-blue-600/30 border-blue-500' : 'bg-gray-800/50 border-white/10 hover:border-blue-500/50'}`}
                      >
                        <div className="flex items-start gap-2">
                          <FaGripVertical
                            className="text-gray-500 mt-0.5 flex-shrink-0"
                            size={11}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-400 mb-0.5">Soal {idx + 1}</p>
                            <p className="text-xs sm:text-sm font-medium truncate">{(soal.teks_soal || '').trim() ? `${soal.teks_soal.substring(0, 40)}${soal.teks_soal.length > 40 ? '...' : ''}` : 'Buat soal'}</p>
                            <p className="text-xs text-gray-500">{soal.nilai_soal} poin</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Area Tengah: Editor Soal */}
            {editorState ? (
              <div className="lg:col-span-2 bg-gray-900/50 border border-white/10 rounded-xl overflow-hidden flex flex-col">
                <div className="bg-gray-800/50 border-b border-white/10 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
                  <h3 className="font-bold text-base sm:text-lg md:text-xl">Editor Soal</h3>
                  <div className="flex gap-1 sm:gap-2">
                    <button
                      onClick={() => {
                        const soal = soalList.find((s) => s.id_soal === selectedSoalId);
                        if (soal) handleDuplicateSoal(soal);
                      }}
                      className="p-1.5 sm:p-2 hover:bg-gray-700 rounded transition-all"
                      title="Duplikat soal"
                    >
                      <FaCopy size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteSoal(editorState.id_soal)}
                      className="p-1.5 sm:p-2 hover:bg-red-600/20 rounded transition-all text-red-400"
                      title="Hapus soal"
                    >
                      <FaTrash size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  {/* Teks Soal */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Teks Soal</label>
                    <RichTextEditorSoal
                      value={editorState.teks_soal}
                      onChange={(value) =>
                        setEditorState({
                          ...editorState,
                          teks_soal: value,
                        })
                      }
                    />
                  </div>

                  {editorState.tipe_soal === 'baris_kode' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Soal Kode Program (Dapat diedit Siswa)</label>
                      <div className="border border-white/10 rounded-lg overflow-hidden bg-gray-800">
                        <CodeMirror
                          value={editorState.teks_jawaban}
                          extensions={[javascript()]}
                          onChange={(value) =>
                            setEditorState({
                              ...editorState,
                              teks_jawaban: value,
                            })
                          }
                          theme="dark"
                          height="220px"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Kode ini menjadi template jawaban siswa saat mulai mengerjakan.</p>
                    </div>
                  )}

                  {/* Gambar Soal */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Gambar Soal (Opsional)</label>
                    {editorState.gambar_soal_preview ? (
                      <div className="mb-2 w-full rounded-lg overflow-hidden bg-gray-800 border border-white/10 p-2">
                        <img
                          src={editorState.gambar_soal_preview}
                          alt="Gambar Soal"
                          className="w-full h-auto max-h-[420px] object-contain mx-auto"
                        />
                      </div>
                    ) : (
                      <div className="mb-2 w-full h-40 rounded-lg bg-gray-800/60 border border-dashed border-white/20 flex items-center justify-center text-sm text-gray-400">Belum ada gambar soal</div>
                    )}

                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 hover:text-white cursor-pointer transition-all border border-white/10 hover:border-blue-500/50">
                        <FaImage size={12} />
                        {editorState.gambar_soal_preview ? 'Ganti Gambar Soal' : 'Upload Gambar Soal'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleSoalImageUpload(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      {editorState.gambar_soal_preview && (
                        <button
                          onClick={() =>
                            setEditorState({
                              ...editorState,
                              gambar_soal_preview: '',
                              gambar_soal_file: undefined,
                            })
                          }
                          className="inline-flex items-center gap-1 px-3 py-2 bg-red-500/15 hover:bg-red-500/25 border border-red-400/40 rounded text-xs text-red-300 hover:text-red-200 transition-all"
                        >
                          <FaTimes size={11} />
                          Hapus Gambar
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">Gambar otomatis dikompres jika ukuran di atas 500KB.</p>
                  </div>

                  {/* Tipe Soal Specific Editor */}
                  {editorState.tipe_soal === 'pilihan_ganda' && editorState.pilihan_ganda && (
                    <div>
                      <label className="block text-sm font-medium mb-3">Opsi Jawaban</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {editorState.pilihan_ganda.map((pilihan, idx) => (
                          <div
                            key={idx}
                            className={`p-4 border rounded-lg ${PILIHAN_CARD_STYLES[pilihan.opsi_pilgan] || 'border-white/10 bg-gray-800/50'}`}
                          >
                            {/* Header dengan opsi label dan kunci jawaban */}
                            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
                              <span className="font-bold text-blue-400 text-lg min-w-[40px]">{pilihan.opsi_pilgan}</span>
                              <span className="text-xs text-gray-500 flex-1">Pilihan {pilihan.opsi_pilgan}</span>
                              <button
                                onClick={() => {
                                  const updated = [...editorState.pilihan_ganda!];
                                  updated[idx].kunci_pilgan = !updated[idx].kunci_pilgan;
                                  setEditorState({
                                    ...editorState,
                                    pilihan_ganda: updated,
                                  });
                                }}
                                className={`px-3 py-1 rounded text-xs font-medium transition-all ${pilihan.kunci_pilgan ? 'bg-green-600/30 text-green-400 border border-green-500/50' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}
                                title="Tandai sebagai jawaban benar"
                              >
                                {pilihan.kunci_pilgan ? '✓ Kunci' : 'Jawaban'}
                              </button>
                            </div>

                            {/* Isian Teks Pilihan */}
                            {!pilihan.gambar_pilgan && (
                              <div className="mb-3">
                                <label className="text-xs text-gray-400 mb-1 block">Teks Jawaban</label>
                                <input
                                  type="text"
                                  placeholder={`Masukkan teks jawaban pilihan ${pilihan.opsi_pilgan}...`}
                                  value={pilihan.teks_pilgan || ''}
                                  onChange={(e) => {
                                    const updated = [...editorState.pilihan_ganda!];
                                    updated[idx].teks_pilgan = e.target.value;
                                    setEditorState({
                                      ...editorState,
                                      pilihan_ganda: updated,
                                    });
                                  }}
                                  className="w-full bg-gray-700 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                />
                              </div>
                            )}

                            {/* Preview dan Upload Gambar */}
                            <div>
                              <label className="text-xs text-gray-400 mb-2 block">Jawaban bisa teks atau gambar (salah satu)</label>
                              {pilihan.gambar_pilgan && !pilihan.gambar_pilgan.startsWith('data:') && (
                                <div className="mb-2 w-full rounded-lg overflow-hidden bg-gray-700 border border-white/10 p-2">
                                  <img
                                    src={pilihan.gambar_pilgan}
                                    alt={`Gambar ${pilihan.opsi_pilgan}`}
                                    className="w-full h-auto max-h-36 object-contain mx-auto"
                                  />
                                </div>
                              )}
                              {pilihan.gambar_pilgan && pilihan.gambar_pilgan.startsWith('data:') && (
                                <div className="mb-2 w-full rounded-lg overflow-hidden bg-gray-700 border border-white/10 p-2">
                                  <img
                                    src={pilihan.gambar_pilgan}
                                    alt={`Preview ${pilihan.opsi_pilgan}`}
                                    className="w-full h-auto max-h-36 object-contain mx-auto"
                                  />
                                </div>
                              )}
                              <label className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 hover:text-white cursor-pointer transition-all border border-white/10 hover:border-blue-500/50">
                                <FaImage size={12} />
                                {pilihan.gambar_pilgan ? 'Ganti Gambar' : 'Pilih Gambar'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleImageUpload(idx, file);
                                    }
                                  }}
                                  className="hidden"
                                />
                              </label>
                              {pilihan.gambar_pilgan && (
                                <button
                                  onClick={() => {
                                    const updated = [...editorState.pilihan_ganda!];
                                    updated[idx].gambar_pilgan = '';
                                    updated[idx].gambar_file = undefined;
                                    setEditorState({
                                      ...editorState,
                                      pilihan_ganda: updated,
                                    });
                                  }}
                                  className="ml-2 inline-flex items-center gap-1 px-2 py-1 bg-red-500/15 hover:bg-red-500/25 border border-red-400/40 rounded text-xs text-red-300 hover:text-red-200"
                                >
                                  <FaTimes size={10} />
                                  Hapus Gambar
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Uraian & Baris Kode: Kunci Jawaban */}
                  {(editorState.tipe_soal === 'uraian' || editorState.tipe_soal === 'baris_kode') && (
                    <div>
                      <label className="block text-sm font-medium mb-2">{editorState.tipe_soal === 'baris_kode' ? 'Kunci Jawaban Kode (Case Sensitive)' : 'Kunci Jawaban'}</label>
                      {editorState.tipe_soal === 'baris_kode' ? (
                        <div className="border border-white/10 rounded-lg overflow-hidden bg-gray-800">
                          <CodeMirror
                            value={editorState.kunci_teks}
                            extensions={[javascript()]}
                            onChange={(value) =>
                              setEditorState({
                                ...editorState,
                                kunci_teks: value,
                              })
                            }
                            theme="dark"
                            height="200px"
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={editorState.kunci_teks}
                          onChange={(e) =>
                            setEditorState({
                              ...editorState,
                              kunci_teks: e.target.value,
                            })
                          }
                          placeholder="Masukkan jawaban yang benar (tidak case sensitive)..."
                          className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <div className="bg-gray-800/50 border-t border-white/10 px-4 py-3">
                  <button
                    onClick={handleSaveSoal}
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg py-2 font-medium transition-all inline-flex items-center justify-center gap-2"
                  >
                    <FaSave size={13} />
                    {saving ? 'Menyimpan...' : 'Simpan Soal'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="lg:col-span-2 bg-gray-900/50 border border-white/10 rounded-xl flex items-center justify-center">
                <p className="text-gray-400">Pilih soal dari daftar untuk mengedit</p>
              </div>
            )}

            {/* Sidebar Kanan: Properti */}
            {editorState ? (
              <div className="properti-sidebar lg:col-span-1 bg-gray-900/50 border border-white/10 rounded-xl overflow-hidden flex flex-col max-h-96 sm:max-h-[500px] lg:max-h-none">
                <div className="bg-gray-800/50 border-b border-white/10 px-3 sm:px-4 py-2 sm:py-3">
                  <h3 className="font-bold text-sm sm:text-base">Properti Soal</h3>
                </div>

                <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 space-y-4">
                  {/* Tipe Soal */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Tipe Soal</label>
                    <div
                      className="relative"
                      data-tipe-soal-menu
                    >
                      <button
                        type="button"
                        onClick={() => setShowTipeSoalMenu((prev) => !prev)}
                        className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white flex items-center justify-between hover:border-blue-500/70 transition-all"
                      >
                        <span className="inline-flex items-center gap-2">
                          {(() => {
                            const selected = TIPE_SOAL_OPTIONS.find((opt) => opt.value === editorState.tipe_soal);
                            if (!selected) return null;
                            const SelectedIcon = selected.Icon;
                            return (
                              <>
                                <SelectedIcon
                                  size={12}
                                  className="text-gray-300"
                                />
                                <span>{selected.label}</span>
                              </>
                            );
                          })()}
                        </span>
                        <FaChevronDown
                          size={11}
                          className={`text-gray-400 transition-transform ${showTipeSoalMenu ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {showTipeSoalMenu && (
                        <div className="absolute z-30 mt-1 w-full bg-gray-900 border border-white/15 rounded-lg overflow-hidden shadow-xl">
                          {TIPE_SOAL_OPTIONS.map((option) => {
                            const OptionIcon = option.Icon;
                            const isActive = option.value === editorState.tipe_soal;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  const isCodeToEssay = editorState.tipe_soal === 'baris_kode' && option.value === 'uraian';
                                  setEditorState({
                                    ...editorState,
                                    tipe_soal: option.value,
                                    kunci_teks: isCodeToEssay ? '' : editorState.kunci_teks,
                                    pilihan_ganda: option.value === 'pilihan_ganda' ? buildPilihanGandaEditor(editorState.pilihan_ganda || []) : editorState.pilihan_ganda,
                                  });
                                  setShowTipeSoalMenu(false);
                                }}
                                className={`w-full px-3 py-2 text-left flex items-center gap-2 text-sm transition-all ${isActive ? 'bg-blue-600/40 text-white' : 'text-gray-200 hover:bg-gray-800'}`}
                              >
                                <OptionIcon
                                  size={12}
                                  className={isActive ? 'text-white' : 'text-gray-400'}
                                />
                                <span>{option.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tujuan Pembelajaran */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Tujuan Pembelajaran</label>
                    <select
                      value={editorState.id_tp}
                      onChange={(e) =>
                        setEditorState({
                          ...editorState,
                          id_tp: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      {tujuanList.map((tp) => (
                        <option
                          key={tp.id_tp}
                          value={tp.id_tp}
                        >
                          {tp.nama_tp}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Nilai Soal */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Nilai/Poin Soal</label>
                    <input
                      type="number"
                      value={editorState.nilai_soal}
                      onChange={(e) =>
                        setEditorState({
                          ...editorState,
                          nilai_soal: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      min="0"
                      step="1"
                      className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="properti-sidebar lg:col-span-1 bg-gray-900/50 border border-white/10 rounded-xl flex items-center justify-center">
                <p className="text-gray-400 text-sm text-center px-4">Pilih soal untuk melihat propertinya</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative py-6 sm:py-8 px-3 sm:px-6 border-t border-white/10 mt-8">
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

      <style
        jsx
        global
      >{`
        .soal-sidebar p,
        .soal-sidebar span,
        .soal-sidebar label,
        .soal-sidebar button,
        .soal-sidebar input,
        .soal-sidebar select,
        .soal-sidebar textarea,
        .properti-sidebar p,
        .properti-sidebar span,
        .properti-sidebar label,
        .properti-sidebar button,
        .properti-sidebar input,
        .properti-sidebar select,
        .properti-sidebar textarea {
          font-size: 17px;
          line-height: 1.5;
        }

        .soal-sidebar h3,
        .properti-sidebar h3 {
          font-size: 1.45rem;
          line-height: 1.35;
        }

        .soal-sidebar .text-xs,
        .properti-sidebar .text-xs {
          font-size: 0.98rem !important;
        }

        .soal-sidebar .text-sm,
        .properti-sidebar .text-sm {
          font-size: 1.06rem !important;
        }

        .soal-sidebar .text-\[11px\],
        .properti-sidebar .text-\[11px\] {
          font-size: 0.95rem !important;
        }
      `}</style>

      {notification.show && (
        <div className="fixed top-24 right-6 z-[70]">
          <div className={`px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm max-w-sm ${notification.type === 'success' ? 'bg-green-900/80 border-green-500 text-green-100' : 'bg-red-900/80 border-red-500 text-red-100'}`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? <FaCheck size={14} /> : <FaTimes size={14} />}
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-white/15 rounded-xl shadow-2xl">
            <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-500/20 text-red-300 flex items-center justify-center">
                <FaExclamationTriangle size={14} />
              </div>
              <div>
                <h3 className="font-semibold text-white">Konfirmasi Hapus Soal</h3>
                <p className="text-xs text-gray-400">Aksi ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="px-5 py-4">
              <p className="text-sm text-gray-300 mb-2">Yakin ingin menghapus soal berikut?</p>
              <p className="text-sm font-medium text-white bg-gray-800/70 rounded-md px-3 py-2">{deleteTarget.text}</p>
            </div>

            <div className="px-5 py-4 border-t border-white/10 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 rounded-md border border-white/15 bg-gray-800 hover:bg-gray-700 text-sm text-gray-200"
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteSoal}
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-sm text-white inline-flex items-center gap-2"
              >
                <FaTrash size={12} />
                Hapus Soal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
