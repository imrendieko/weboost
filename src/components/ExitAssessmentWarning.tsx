import { FaExclamationTriangle } from 'react-icons/fa';

interface ExitAssessmentWarningProps {
  show: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ExitAssessmentWarning({ show, onConfirm, onCancel, isLoading = false }: ExitAssessmentWarningProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-yellow-400/40 bg-gradient-to-b from-yellow-500/20 to-yellow-500/10 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 text-4xl text-yellow-300">
            <FaExclamationTriangle />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-yellow-100 mb-2">Keluar dari Asesmen?</h2>
            <p className="text-sm text-yellow-50 mb-6">Asesmen akan dikumpulkan secara otomatis jika Anda meninggalkan pengerjaan. Jawaban Anda saat ini akan dikumpulkan.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 rounded-lg border border-yellow-400/40 bg-yellow-600/20 px-4 py-2.5 font-semibold text-yellow-100 transition hover:bg-yellow-600/30 disabled:opacity-50"
              >
                Tetap Mengerjakan
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className="flex-1 rounded-lg bg-yellow-600 px-4 py-2.5 font-semibold text-white transition hover:bg-yellow-700 disabled:opacity-50"
              >
                {isLoading ? 'Mengumpulkan...' : 'Ya, Tetap Keluar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
