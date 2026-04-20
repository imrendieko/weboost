import { useRouter } from 'next/router';
import { useAdminTheme } from '@/contexts/AdminThemeContext';
import { useGuruTheme } from '@/contexts/GuruThemeContext';

export function useRoleTheme() {
  const router = useRouter();
  const adminTheme = useAdminTheme();
  const guruTheme = useGuruTheme();
  const isGuruOrSiswaRoute = router.pathname === '/dashboard-guru' || router.pathname.startsWith('/guru/') || router.pathname === '/dashboard' || router.pathname.startsWith('/siswa/');

  return isGuruOrSiswaRoute ? guruTheme : adminTheme;
}
