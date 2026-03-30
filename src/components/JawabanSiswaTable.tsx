import React, { useState } from 'react';
import { FaCheck, FaExclamationCircle, FaPencilAlt, FaCheckDouble, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

type ToastType = 'success' | 'error';
type ConfirmAction = 'single' | 'all';

interface Jawaban {
  id_soal: string;
  urutan_soal: number;
  teks_soal: string;
  tipe_soal: string;
  nilai_soal: number;
  jawaban_siswa: string | null;
  kunci_jawaban: string | null; // For display purposes (either opsi_pilgan or kunci_teks)
  skor_asli: number;
  skor_tervalidasi: number | null;
  status_validasi: string | null;
}

interface JawabanTableProps {
  jawabanList: Jawaban[];
  isGuru: boolean;
  onValidasi?: (jawaban: Jawaban, skor: number) => Promise<void>;
  onValidasiSemua?: () => Promise<void>;
  isLoading?: boolean;
}

const JawabanSiswaTable: React.FC<JawabanTableProps> = ({ jawabanList, isGuru, onValidasi, onValidasiSemua, isLoading = false }) => {
  const [editingValues, setEditingValues] = useState<{ [key: string]: number }>({});
  const [validatingIds, setValidatingIds] = useState<Set<string>>(new Set());
  const [editingNilaiIds, setEditingNilaiIds] = useState<Set<string>>(new Set());

  // Toast notification state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: ToastType }>({
    show: false,
    message: '',
    type: 'success',
  });

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: ConfirmAction;
    jawaban: Jawaban | null;
    skor?: number;
  }>({
    isOpen: false,
    action: 'single',
    jawaban: null,
    skor: 0,
  });

  const showToast = (message: string, type: ToastType) => {
    setToast({ show: true, message, type });
    const timer = window.setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3500);
    return timer;
  };

  const getStatusBadge = (status: string | null) => {
    if (status === 'validated') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-900 text-green-200">
          <FaCheck className="text-xs" />
          Divalidasi
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-900 text-yellow-200">
        <FaExclamationCircle className="text-xs" />
        Pending
      </span>
    );
  };

  const getNilaiDisplay = (jawaban: Jawaban) => {
    if (jawaban.status_validasi === 'validated') {
      return `${jawaban.skor_tervalidasi}/${jawaban.nilai_soal}`;
    }
    return `${jawaban.skor_asli || 0}/${jawaban.nilai_soal}`;
  };

  const handleNilaiChange = (soalId: string, value: string) => {
    const num = parseFloat(value) || 0;
    setEditingValues((prev) => ({
      ...prev,
      [soalId]: num,
    }));
  };

  const toggleEditNilai = (soalId: string, currentValue: number) => {
    if (editingNilaiIds.has(soalId)) {
      setEditingNilaiIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(soalId);
        return newSet;
      });
    } else {
      setEditingNilaiIds((prev) => new Set([...prev, soalId]));
      setEditingValues((prev) => ({
        ...prev,
        [soalId]: currentValue,
      }));
    }
  };

  const handleValidasi = async (jawaban: Jawaban) => {
    const skor = editingValues[jawaban.id_soal] !== undefined ? editingValues[jawaban.id_soal] : jawaban.skor_asli || 0;

    // Validate score range
    if (skor < 0 || skor > jawaban.nilai_soal) {
      showToast(`Nilai harus antara 0 dan ${jawaban.nilai_soal}`, 'error');
      return;
    }

    // Open confirmation modal
    setConfirmModal({
      isOpen: true,
      action: 'single',
      jawaban,
      skor,
    });
  };

  const handleValidasiConfirm = async () => {
    const { jawaban, skor } = confirmModal;
    if (!jawaban || skor === undefined) return;

    try {
      setValidatingIds((prev) => new Set([...prev, jawaban.id_soal]));
      setConfirmModal({ isOpen: false, action: 'single', jawaban: null });

      await onValidasi?.(jawaban, skor);

      showToast(`Soal ${jawaban.urutan_soal} berhasil divalidasi`, 'success');

      setEditingValues((prev) => {
        const newValues = { ...prev };
        delete newValues[jawaban.id_soal];
        return newValues;
      });
      setEditingNilaiIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(jawaban.id_soal);
        return newSet;
      });
    } catch (error: any) {
      console.error('Error validating:', error);
      showToast(`Gagal memvalidasi soal ${jawaban.urutan_soal}: ${error.message}`, 'error');
    } finally {
      setValidatingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(jawaban.id_soal);
        return newSet;
      });
    }
  };

  const handleValidasiSemuaClick = () => {
    setConfirmModal({
      isOpen: true,
      action: 'all',
      jawaban: null,
    });
  };

  const handleValidasiSemuaConfirm = async () => {
    setConfirmModal({ isOpen: false, action: 'single', jawaban: null });
    try {
      await onValidasiSemua?.();
      const count = jawabanList.filter((j) => j.status_validasi !== 'validated').length;
      showToast(`Semua ${count} jawaban berhasil divalidasi`, 'success');
    } catch (error: any) {
      console.error('Error validasi semua:', error);
      showToast(`Gagal validasi semua: ${error.message}`, 'error');
    }
  };

  if (!jawabanList || jawabanList.length === 0) {
    return <div className="text-center py-8 text-gray-400">Belum ada jawaban untuk asesmen ini</div>;
  }

  // Check if all are validated
  const allValidated = jawabanList.every((j) => j.status_validasi === 'validated');
  const hasOnValidasiSemua = onValidasiSemua && isGuru && !allValidated && jawabanList.some((j) => j.status_validasi !== 'validated');

  return (
    <div>
      {hasOnValidasiSemua && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleValidasiSemuaClick}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaCheckDouble className="text-sm" />
            {isLoading ? 'Memvalidasi...' : 'Validasi Semua'}
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-800">
              <th className="border border-gray-700 px-4 py-3 text-left text-sm font-semibold text-gray-200 w-12">No</th>
              <th className="border border-gray-700 px-4 py-3 text-left text-sm font-semibold text-gray-200">Soal</th>
              <th className="border border-gray-700 px-4 py-3 text-left text-sm font-semibold text-gray-200">Jawaban Siswa</th>
              {isGuru && <th className="border border-gray-700 px-4 py-3 text-left text-sm font-semibold text-gray-200">Kunci Jawaban</th>}
              <th className="border border-gray-700 px-4 py-3 text-left text-sm font-semibold text-gray-200">Status</th>
              <th className="border border-gray-700 px-4 py-3 text-left text-sm font-semibold text-gray-200">Nilai</th>
              {isGuru && <th className="border border-gray-700 px-4 py-3 text-center text-sm font-semibold text-gray-200">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {jawabanList.map((jawaban) => {
              const isEditing = editingNilaiIds.has(jawaban.id_soal);
              const displayValue = editingValues[jawaban.id_soal] !== undefined ? editingValues[jawaban.id_soal] : jawaban.skor_asli || 0;
              const isValidating = validatingIds.has(jawaban.id_soal);

              return (
                <React.Fragment key={jawaban.id_soal}>
                  <tr className="hover:bg-gray-800/50 transition-colors">
                    <td className="border border-gray-700 px-4 py-3 text-sm text-gray-300">{jawaban.urutan_soal}</td>
                    <td className="border border-gray-700 px-4 py-3 text-sm text-gray-300">
                      <p className="font-medium">{jawaban.teks_soal}</p>
                      <p className="text-xs text-gray-400 mt-1">({jawaban.tipe_soal})</p>
                    </td>
                    <td className="border border-gray-700 px-4 py-3 text-sm text-gray-300">{jawaban.jawaban_siswa || <span className="text-gray-500">-</span>}</td>
                    {isGuru && <td className="border border-gray-700 px-4 py-3 text-sm text-blue-300 font-medium">{jawaban.kunci_jawaban || <span className="text-gray-500">-</span>}</td>}
                    <td className="border border-gray-700 px-4 py-3 text-sm">{getStatusBadge(jawaban.status_validasi)}</td>
                    <td className="border border-gray-700 px-4 py-3 text-sm text-gray-300 font-medium">
                      {jawaban.status_validasi === 'validated' ? (
                        <span>{getNilaiDisplay(jawaban)}</span>
                      ) : isGuru ? (
                        isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max={jawaban.nilai_soal}
                              value={displayValue}
                              onChange={(e) => handleNilaiChange(jawaban.id_soal, e.target.value)}
                              disabled={isValidating || isLoading}
                              className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
                              autoFocus
                            />
                            <span className="text-gray-400">/ {jawaban.nilai_soal}</span>
                          </div>
                        ) : (
                          <span
                            className="cursor-pointer hover:text-blue-400 transition-colors"
                            onClick={() => toggleEditNilai(jawaban.id_soal, jawaban.skor_asli || 0)}
                          >
                            {getNilaiDisplay(jawaban)}
                          </span>
                        )
                      ) : (
                        <span>Nilai belum divalidasi</span>
                      )}
                    </td>
                    {isGuru && (
                      <td className="border border-gray-700 px-4 py-3 text-center">
                        {jawaban.status_validasi === 'validated' ? (
                          <span className="text-xs text-green-300 font-medium">Selesai</span>
                        ) : isEditing ? (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => handleValidasi(jawaban)}
                              disabled={isValidating || isLoading}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <FaCheck className="text-xs" />
                              {isValidating ? '...' : 'Simpan'}
                            </button>
                            <button
                              onClick={() => toggleEditNilai(jawaban.id_soal, jawaban.skor_asli || 0)}
                              disabled={isValidating || isLoading}
                              className="px-2 py-1 rounded bg-gray-600 hover:bg-gray-700 text-white text-xs transition-colors disabled:opacity-50"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => toggleEditNilai(jawaban.id_soal, jawaban.skor_asli || 0)}
                              disabled={isValidating || isLoading}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-600 hover:bg-gray-700 text-white text-xs transition-colors disabled:opacity-50"
                            >
                              <FaPencilAlt className="text-xs" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleValidasi(jawaban)}
                              disabled={isValidating || isLoading}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <FaCheck className="text-xs" />
                              {isValidating ? '...' : 'Validasi'}
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-24 right-6 z-[70] rounded-lg border px-5 py-3 shadow-lg flex items-center gap-3 ${toast.type === 'success' ? 'bg-green-500/90 border-green-300/40' : 'bg-red-500/90 border-red-300/40'}`}>
          {toast.type === 'success' ? <FaCheckCircle className="text-xl flex-shrink-0" /> : <FaExclamationCircle className="text-xl flex-shrink-0" />}
          <p className="text-sm font-semibold flex-1">{toast.message}</p>
          <button
            onClick={() => setToast({ show: false, message: '', type: 'success' })}
            className="text-white hover:opacity-70 transition-opacity"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80]">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl border border-white/10 shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-blue-500/20 rounded-full p-4">
                <FaExclamationTriangle className="text-4xl text-blue-400" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white text-center mb-2">Konfirmasi Validasi</h2>
            <p className="text-gray-300 text-center mb-6">
              {confirmModal.action === 'single' ? `Validasi jawaban soal ${confirmModal.jawaban?.urutan_soal} dengan nilai ${confirmModal.skor}?` : 'Validasi semua jawaban yang belum divalidasi? Tindakan ini tidak dapat dibatalkan.'}
            </p>

            {confirmModal.action === 'single' && confirmModal.jawaban && (
              <div className="bg-gray-700/50 rounded-lg p-4 mb-6 border border-gray-600">
                <p className="text-sm text-gray-300 mb-2">
                  <span className="font-semibold">Jawaban Siswa:</span> {confirmModal.jawaban.jawaban_siswa || '-'}
                </p>
                <p className="text-sm text-gray-300">
                  <span className="font-semibold">Kunci:</span> {confirmModal.jawaban.kunci_jawaban || '-'}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal({ isOpen: false, action: 'single', jawaban: null })}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmModal.action === 'single' ? handleValidasiConfirm : handleValidasiSemuaConfirm}
                disabled={isLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Memproses...' : 'Validasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JawabanSiswaTable;
