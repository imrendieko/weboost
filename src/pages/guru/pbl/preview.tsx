import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import GuruNavbar from '@/components/GuruNavbar';
import CountdownTimer from '@/components/CountdownTimer';
import StarBackground from '@/components/StarBackground';
import { FaArrowLeft, FaDownload, FaExternalLinkAlt, FaFileAlt, FaLink, FaVideo } from 'react-icons/fa';
import { buildDocumentPreviewCandidates, getFileExtensionFromUrl } from '@/lib/documentPreview';

interface GuruData {
  id_guru: number;
  nama_guru: string;
  email_guru: string;
}

function convertYouTubeUrl(url: string): string {
  if (url.includes('youtube.com/watch')) {
    const videoId = url.split('v=')[1]?.split('&')[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }

  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }

  return url;
}

function getCurrentDate() {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const now = new Date();
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

export default function PblPreviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [guruData, setGuruData] = useState<GuruData | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);

  const url = typeof router.query.url === 'string' ? router.query.url : '';
  const fileType = typeof router.query.type === 'string' ? router.query.type : 'dokumen';
  const fileName = typeof router.query.name === 'string' ? router.query.name : 'File Pengumpulan';

  useEffect(() => {
    try {
      const guruSession = localStorage.getItem('guru_session');
      if (!guruSession) {
        router.push('/login');
        return;
      }

      setGuruData(JSON.parse(guruSession));
      setLoading(false);
    } catch (error) {
      console.error('Error checking guru auth:', error);
      router.push('/login');
    }
  }, [router]);

  const extension = useMemo(() => getFileExtensionFromUrl(url), [url]);
  const documentPreviewCandidates = useMemo(() => buildDocumentPreviewCandidates(url), [url]);
  const activeDocumentPreview = documentPreviewCandidates[viewerIndex] || null;

  useEffect(() => {
    setViewerIndex(0);
  }, [url]);

  const switchToNextViewer = () => {
    setViewerIndex((current) => {
      if (documentPreviewCandidates.length <= 1) {
        return current;
      }

      return (current + 1) % documentPreviewCandidates.length;
    });
  };

  const handleDownload = async () => {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
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

      <div className="relative z-10 px-6 pb-12 pt-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold">Preview File Pengumpulan</h1>
              <p className="text-gray-400">{getCurrentDate()}</p>
            </div>
            <CountdownTimer showDate={false} />
          </div>

          <button
            type="button"
            onClick={() => router.back()}
            className="mana-btn mana-btn--neutral mb-6 flex items-center gap-2 rounded-lg px-4 py-2 transition-all"
          >
            <FaArrowLeft />
            Kembali
          </button>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                {fileType === 'video' ? <FaVideo className="text-xl text-[#0080FF]" /> : fileType === 'tautan' ? <FaLink className="text-xl text-[#0080FF]" /> : <FaFileAlt className="text-xl text-[#0080FF]" />}
                <div>
                  <h2 className="text-2xl font-bold">{fileName}</h2>
                  <p className="text-sm text-gray-400">Tipe file: {fileType}</p>
                  {fileType !== 'video' && fileType !== 'tautan' && activeDocumentPreview && (
                    <p className="text-xs text-gray-400">Viewer aktif: {activeDocumentPreview.label}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="mana-btn mana-btn--success inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition"
                >
                  <FaDownload />
                  Download
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mana-btn mana-btn--primary inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition"
                >
                  <FaExternalLinkAlt />
                  Buka Tab Baru
                </a>
                {fileType !== 'video' && fileType !== 'tautan' && documentPreviewCandidates.length > 1 && (
                  <button
                    type="button"
                    onClick={switchToNextViewer}
                    className="mana-btn mana-btn--neutral inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition"
                  >
                    Coba Viewer Lain
                  </button>
                )}
              </div>
            </div>

            <div
              className="overflow-hidden rounded-2xl border border-white/10 bg-black/30"
              suppressHydrationWarning
            >
              {fileType === 'video' ? (
                <div className="aspect-video w-full">
                  {url.includes('youtube.com') || url.includes('youtu.be') ? (
                    <iframe
                      src={convertYouTubeUrl(url)}
                      className="h-full w-full"
                      title={fileName}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"
                    />
                  ) : (
                    <video
                      src={url}
                      controls
                      className="h-full w-full"
                    />
                  )}
                </div>
              ) : fileType === 'tautan' ? (
                <div className="p-10 text-center">
                  <FaLink className="mx-auto mb-4 text-5xl text-[#0080FF]" />
                  <p className="mb-4 text-gray-300">Tautan eksternal hasil pengumpulan siswa.</p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-[#7fb6ff] hover:underline"
                  >
                    {url}
                  </a>
                </div>
              ) : extension === 'pdf' ? (
                <iframe
                  src={activeDocumentPreview?.url || url}
                  className="h-[780px] w-full"
                  title={fileName}
                  onError={switchToNextViewer}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"
                />
              ) : (
                <iframe
                  src={activeDocumentPreview?.url || url}
                  className="h-[780px] w-full"
                  title={fileName}
                  onError={switchToNextViewer}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="relative border-t border-white/10 px-6 py-8">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm text-gray-400">
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
