import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function MateriGuruRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Halaman ini cuma jembatan URL lama -> URL baru, query tetap dibawa.
    if (!router.isReady) {
      return;
    }

    router.replace({
      pathname: '/guru/pembelajaran',
      query: router.query,
    });
  }, [router]);

  return null;
}
