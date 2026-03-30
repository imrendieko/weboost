import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

interface Jawaban {
  id_soal: string;
  urutan_soal: number;
  teks_soal: string;
  tipe_soal: string;
  nilai_soal: number;
  jawaban_siswa: string | null;
  skor_asli: number | null;
  skor_tervalidasi: number | null;
  status_validasi: string | null;
  catatan_validasi: string | null;
}

interface ValidasiNilaiModalProps {
  jawaban: Jawaban | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (skor: number, catatan: string) => Promise<void>;
  isLoading?: boolean;
}

const ValidasiNilaiModal: React.FC<ValidasiNilaiModalProps> = ({ jawaban, isOpen, onClose, onSave, isLoading = false }) => {
  const [skor, setSkor] = useState<number>(0);
  const [catatan, setCatatan] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (jawaban) {
      setSkor(jawaban.skor_tervalidasi || jawaban.skor_asli || 0);
      setCatatan(jawaban.catatan_validasi || '');
      setError('');
    }
  }, [jawaban, isOpen]);

  const handleSave = async () => {
    setError('');

    // Validation
    if (skor < 0 || skor > (jawaban?.nilai_soal || 0)) {
      setError(`Nilai harus antara 0 dan ${jawaban?.nilai_soal || 0}`);
      return;
    }

    try {
      setSaving(true);
      await onSave(skor, catatan);
      setSaving(false);
      onClose();
    } catch (err: any) {
      setSaving(false);
      setError(err.message || 'Gagal menyimpan validasi');
    }
  };

  if (!isOpen || !jawaban) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-md border border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Validasi Nilai</h2>
          <button
            onClick={onClose}
            disabled={saving || isLoading}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Soal Info */}
          <div className="bg-gray-800 rounded p-4">
            <p className="text-sm text-gray-400 mb-1">Soal #{jawaban.urutan_soal}</p>
            <p className="text-white font-medium">{jawaban.teks_soal}</p>
          </div>

          {/* Jawaban Siswa */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Jawaban Siswa</label>
            <div className="bg-gray-800 rounded p-3 text-gray-300 text-sm">{jawaban.jawaban_siswa || <span className="text-gray-500">-</span>}</div>
          </div>

          {/* Skor Asli */}
          {jawaban.skor_asli !== null && (
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Skor Asli</label>
              <input
                type="number"
                value={jawaban.skor_asli}
                disabled
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-400 cursor-not-allowed"
              />
            </div>
          )}

          {/* Nilai Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Nilai Validasi <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max={jawaban.nilai_soal}
                value={skor}
                onChange={(e) => setSkor(parseFloat(e.target.value) || 0)}
                disabled={saving || isLoading}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
              />
              <span className="text-gray-400">/ {jawaban.nilai_soal}</span>
            </div>
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Catatan Validasi</label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              disabled={saving || isLoading}
              placeholder="Tuliskan feedback atau alasan validasi..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500 transition-colors resize-none disabled:opacity-50"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded p-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-700 bg-gray-800/50">
          <button
            onClick={onClose}
            disabled={saving || isLoading}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving || isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving || isLoading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ValidasiNilaiModal;
