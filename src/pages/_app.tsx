import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { AdminThemeProvider, useAdminTheme } from '@/contexts/AdminThemeContext';

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

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const pathname = router.pathname;
  const isAdminPage = router.pathname === '/admin' || router.pathname.startsWith('/admin/');
  const isPublicThemePage = router.pathname === '/' || router.pathname === '/login' || router.pathname === '/register';
  const shouldUseThemeShell = isAdminPage || isPublicThemePage;

  useEffect(() => {
    const roleClasses = ['role-admin-ui', 'role-guru-ui', 'role-siswa-ui'];
    document.body.classList.remove(...roleClasses);

    if (pathname.startsWith('/admin')) {
      document.body.classList.add('role-admin-ui');
    } else if (pathname.startsWith('/guru')) {
      document.body.classList.add('role-guru-ui');
    } else if (pathname.startsWith('/siswa')) {
      document.body.classList.add('role-siswa-ui');
    }
  }, [pathname]);

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

  return (
    <AdminThemeProvider>
      <AdminThemeShell>{appContent}</AdminThemeShell>
    </AdminThemeProvider>
  );
}
