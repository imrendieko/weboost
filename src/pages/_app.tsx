import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { AdminThemeProvider, useAdminTheme } from '@/contexts/AdminThemeContext';
import { GuruThemeProvider, useGuruTheme } from '@/contexts/GuruThemeContext';

const ADMIN_SESSION_KEY = 'admin_session';
const GURU_SESSION_KEY = 'guru_session';
const SISWA_SESSION_KEY = 'siswa_session';
const SESSION_LOCK_KEY = 'weboost_active_session';
const TAB_SESSION_TOKEN_KEY = 'weboost_tab_session_token';

type SessionRole = 'admin' | 'guru' | 'siswa';

interface SessionLock {
  role: SessionRole;
  userId: number;
  token: string;
  createdAt: number;
}

function createSessionToken() {
  // Token random sederhana buat nandain identitas sesi di tab ini.
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `${Date.now()}_${randomPart}`;
}

function hardNavigate(url: string) {
  // Hard redirect biar browser reload beneran (bukan pindah route client-side).
  if (typeof window === 'undefined') {
    return;
  }

  window.location.replace(url || '/');
}

function isRootRoute(url: unknown) {
  // Ngecek apakah target route itu halaman root (/).
  if (typeof url === 'string') {
    return url === '/' || url.startsWith('/?');
  }

  if (url && typeof url === 'object' && 'pathname' in (url as Record<string, unknown>)) {
    const pathname = (url as { pathname?: unknown }).pathname;
    return pathname === '/';
  }

  return false;
}

function safeJsonParse<T>(rawValue: string | null): T | null {
  // Parser aman supaya app gak crash kalau isi storage ternyata invalid JSON.
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

function readCurrentSession() {
  // Ambil session aktif dari localStorage, urutan cek: admin -> guru -> siswa.
  if (typeof window === 'undefined') {
    return null;
  }

  const admin = safeJsonParse<Record<string, any>>(window.localStorage.getItem(ADMIN_SESSION_KEY));
  if (admin?.id_admin) {
    return {
      role: 'admin' as const,
      storageKey: ADMIN_SESSION_KEY,
      userId: Number(admin.id_admin),
      token: typeof admin.__session_token === 'string' ? admin.__session_token : null,
      session: admin,
    };
  }

  const guru = safeJsonParse<Record<string, any>>(window.localStorage.getItem(GURU_SESSION_KEY));
  if (guru?.id_guru) {
    return {
      role: 'guru' as const,
      storageKey: GURU_SESSION_KEY,
      userId: Number(guru.id_guru),
      token: typeof guru.__session_token === 'string' ? guru.__session_token : null,
      session: guru,
    };
  }

  const siswa = safeJsonParse<Record<string, any>>(window.localStorage.getItem(SISWA_SESSION_KEY));
  if (siswa?.id_siswa) {
    return {
      role: 'siswa' as const,
      storageKey: SISWA_SESSION_KEY,
      userId: Number(siswa.id_siswa),
      token: typeof siswa.__session_token === 'string' ? siswa.__session_token : null,
      session: siswa,
    };
  }

  return null;
}

function clearAllSessions() {
  // Bersihin semua jejak sesi saat memang perlu reset total.
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ADMIN_SESSION_KEY);
  window.localStorage.removeItem(GURU_SESSION_KEY);
  window.localStorage.removeItem(SISWA_SESSION_KEY);
  window.localStorage.removeItem(SESSION_LOCK_KEY);
  window.sessionStorage.removeItem(TAB_SESSION_TOKEN_KEY);
}

function AdminThemeShell({ children }: { children: ReactNode }) {
  const { theme, mounted } = useAdminTheme();
  const resolvedTheme = mounted ? theme : 'dark';

  return (
    <div
      className={`admin-theme-scope admin-theme-${resolvedTheme}`}
      data-admin-theme={resolvedTheme}
    >
      {children}
    </div>
  );
}

function GuruThemeShell({ children }: { children: ReactNode }) {
  const { theme, mounted } = useGuruTheme();
  const resolvedTheme = mounted ? theme : 'dark';

  return (
    <div
      className={`guru-theme-scope guru-theme-${resolvedTheme}`}
      data-guru-theme={resolvedTheme}
    >
      {children}
    </div>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const pathname = router.pathname;
  const isAdminPage = router.pathname === '/admin' || router.pathname.startsWith('/admin/');
  const isPublicThemePage = router.pathname === '/' || router.pathname === '/login' || router.pathname === '/register' || router.pathname === '/forgot-password';
  const isGuruPage = router.pathname === '/dashboard-guru' || router.pathname.startsWith('/guru/');
  const isSiswaPage = router.pathname === '/dashboard' || router.pathname.startsWith('/siswa/');
  const shouldUseThemeShell = isAdminPage || isPublicThemePage || isGuruPage || isSiswaPage;

  useEffect(() => {
    const roleClasses = ['role-admin-ui', 'role-guru-ui', 'role-siswa-ui'];
    document.body.classList.remove(...roleClasses);

    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      document.body.classList.add('role-admin-ui');
    } else if (pathname === '/dashboard-guru' || pathname.startsWith('/guru/')) {
      document.body.classList.add('role-guru-ui');
    } else if (pathname === '/dashboard' || pathname.startsWith('/siswa/')) {
      document.body.classList.add('role-siswa-ui');
    } else if (pathname.startsWith('/guru')) {
      document.body.classList.add('role-guru-ui');
    } else if (pathname.startsWith('/siswa')) {
      document.body.classList.add('role-siswa-ui');
    }
  }, [pathname]);

  useEffect(() => {
    const publicPaths = ['/', '/login', '/register', '/forgot-password'];
    const isPublicPage = publicPaths.includes(router.pathname);

    const enforceSessionLock = () => {
      // Ambil data sesi yang lagi aktif + lock global + token khusus tab ini.
      const currentSession = readCurrentSession();
      const lock = safeJsonParse<SessionLock>(window.localStorage.getItem(SESSION_LOCK_KEY));
      const tabToken = window.sessionStorage.getItem(TAB_SESSION_TOKEN_KEY);

      // Di halaman publik/auth jangan utak-atik lock, biar flow login gak balapan antar tab.
      if (isPublicPage) {
        return;
      }

      if (!currentSession) {
        // Gak ada sesi aktif di halaman private -> balik ke login.
        window.sessionStorage.removeItem(TAB_SESSION_TOKEN_KEY);
        router.push('/login');
        return;
      }

      if (!lock) {
        // Kalau lock global belum ada, bikin lock baru dari sesi saat ini.
        const lockToken = tabToken || currentSession.token || createSessionToken();
        const patchedSession = {
          ...currentSession.session,
          __session_token: lockToken,
        };
        window.localStorage.setItem(currentSession.storageKey, JSON.stringify(patchedSession));
        window.sessionStorage.setItem(TAB_SESSION_TOKEN_KEY, lockToken);
        window.localStorage.setItem(
          SESSION_LOCK_KEY,
          JSON.stringify({
            role: currentSession.role,
            userId: currentSession.userId,
            token: lockToken,
            createdAt: Date.now(),
          }),
        );
        return;
      }

      const isRoleMismatch = lock.role !== currentSession.role;
      const isUserMismatch = lock.userId !== currentSession.userId;
      const hasToken = Boolean(currentSession.token);
      const isTokenMismatch = hasToken && lock.token !== currentSession.token;

      if (isRoleMismatch || isUserMismatch) {
        // Akun beda terdeteksi aktif, tab ini diarahkan ke login.
        window.sessionStorage.removeItem(TAB_SESSION_TOKEN_KEY);
        router.push('/login');
        return;
      }

      if (!tabToken) {
        // Token tab hilang = tab ini dianggap gak valid untuk lanjut.
        window.sessionStorage.removeItem(TAB_SESSION_TOKEN_KEY);
        router.push('/login');
        return;
      }

      if (tabToken !== lock.token || isTokenMismatch) {
        // Mode strict: kalau akun sama login di tab lain, tab lama otomatis ditolak.
        window.sessionStorage.removeItem(TAB_SESSION_TOKEN_KEY);
        router.push('/login');
        return;
      }

      if (!currentSession.token && lock.token) {
        const patchedSession = {
          ...currentSession.session,
          __session_token: lock.token,
        };
        window.localStorage.setItem(currentSession.storageKey, JSON.stringify(patchedSession));
      }

      if (tabToken !== lock.token) {
        window.sessionStorage.setItem(TAB_SESSION_TOKEN_KEY, lock.token);
      }
    };

    enforceSessionLock();

    const onStorage = (event: StorageEvent) => {
      // Kalau ada perubahan session/lock dari tab lain, cek ulang validitas tab ini.
      if (
        event.key === SESSION_LOCK_KEY ||
        event.key === ADMIN_SESSION_KEY ||
        event.key === GURU_SESSION_KEY ||
        event.key === SISWA_SESSION_KEY
      ) {
        enforceSessionLock();
      }
    };

    const onFocus = () => {
      enforceSessionLock();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, [router, router.pathname]);

  useEffect(() => {
    // Guard routing root supaya gak nyangkut request stale _next/data.
    const originalPrefetch = router.prefetch.bind(router);
    const originalPush = router.push.bind(router);
    const originalReplace = router.replace.bind(router);

    router.prefetch = ((url, asPath, options) => {
      if (isRootRoute(url)) {
        return Promise.resolve();
      }

      return originalPrefetch(url, asPath, options);
    }) as typeof router.prefetch;

    router.push = ((url, asPath, options) => {
      if (isRootRoute(url)) {
        hardNavigate('/');
        return Promise.resolve(true);
      }

      return originalPush(url, asPath, options);
    }) as typeof router.push;

    router.replace = ((url, asPath, options) => {
      if (isRootRoute(url)) {
        hardNavigate('/');
        return Promise.resolve(true);
      }

      return originalReplace(url, asPath, options);
    }) as typeof router.replace;

    const onRouteError = (_error: unknown, url: string) => {
      if (url === '/' || url.startsWith('/?')) {
        hardNavigate('/');
      }
    };

    const onAnchorClickCapture = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute('href');
      if (href !== '/') {
        return;
      }

      event.preventDefault();
      hardNavigate('/');
    };

    router.events.on('routeChangeError', onRouteError);
    document.addEventListener('click', onAnchorClickCapture, true);

    return () => {
      router.prefetch = originalPrefetch;
      router.push = originalPush;
      router.replace = originalReplace;
      router.events.off('routeChangeError', onRouteError);
      document.removeEventListener('click', onAnchorClickCapture, true);
    };
  }, [router]);

  const appContent = (
    <>
      <Component {...pageProps} />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        version="1.1"
        style={{ display: 'block', width: 0, height: 0 }}
        aria-hidden="true"
      >
        <defs>
          <filter id="goo-mana">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="10"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="goo"
            />
            <feBlend
              in="SourceGraphic"
              in2="goo"
            />
          </filter>
        </defs>
      </svg>
    </>
  );

  if (!shouldUseThemeShell) {
    return appContent;
  }

  if (isGuruPage || isSiswaPage) {
    return (
      <GuruThemeProvider>
        <GuruThemeShell>{appContent}</GuruThemeShell>
      </GuruThemeProvider>
    );
  }

  return (
    <AdminThemeProvider>
      <AdminThemeShell>{appContent}</AdminThemeShell>
    </AdminThemeProvider>
  );
}
