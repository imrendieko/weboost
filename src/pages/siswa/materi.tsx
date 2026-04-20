import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function MateriSiswaRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Route lama diarahkan ke halaman pembelajaran siswa sambil bawa query.
    if (!router.isReady) {
      return;
    }

    router.replace({
      pathname: '/siswa/pembelajaran',
      query: router.query,
    });
  }, [router]);

  return null;
}
