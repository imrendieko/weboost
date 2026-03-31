import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '@/lib/db';

type UserRole = 'admin' | 'guru' | 'siswa';

interface AuthSession {
  id_admin?: number;
  id_guru?: number;
  id_siswa?: number;
  nama_admin?: string;
  nama_guru?: string;
  nama_siswa?: string;
  email_admin?: string;
  email_guru?: string;
  email_siswa?: string;
}

/**
 * Custom hook for authentication checking
 * Redirects to landing page (/) if user is not authenticated
 * @param role - The user role to check (admin, guru, or siswa)
 * @returns { loading: boolean, user: AuthSession | null, isAuthenticated: boolean }
 */
export function useAuth(role: UserRole) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const sessionKey = `${role}_session`;
        const sessionData = localStorage.getItem(sessionKey);

        if (!sessionData) {
          // Redirect to landing page if not authenticated
          router.push('/');
          return;
        }

        const parsedSession = JSON.parse(sessionData) as AuthSession;

        // Verify session with database based on role
        if (role === 'admin') {
          const { data: admin, error } = await supabase.from('admin').select('*').eq('id_admin', parsedSession.id_admin).single();

          if (error || !admin) {
            localStorage.removeItem(sessionKey);
            router.push('/');
            return;
          }

          setUser(parsedSession);
          setIsAuthenticated(true);
          setLoading(false);
        } else if (role === 'guru') {
          const { data: guru, error } = await supabase.from('guru').select('*').eq('id_guru', parsedSession.id_guru).single();

          if (error || !guru) {
            localStorage.removeItem(sessionKey);
            router.push('/');
            return;
          }

          setUser(parsedSession);
          setIsAuthenticated(true);
          setLoading(false);
        } else if (role === 'siswa') {
          const { data: siswa, error } = await supabase.from('siswa').select('*').eq('id_siswa', parsedSession.id_siswa).single();

          if (error || !siswa) {
            localStorage.removeItem(sessionKey);
            router.push('/');
            return;
          }

          setUser(parsedSession);
          setIsAuthenticated(true);
          setLoading(false);
        }
      } catch (error) {
        console.error(`Error checking ${role} auth:`, error);
        router.push('/');
      }
    };

    if (router.isReady) {
      checkAuth();
    }
  }, [router, role]);

  return { loading, user, isAuthenticated };
}

/**
 * Simple check without database verification (faster)
 * Use this when you don't need to verify session with database
 */
export function useSimpleAuth(role: UserRole) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const sessionKey = `${role}_session`;
    const sessionData = localStorage.getItem(sessionKey);

    if (!sessionData) {
      router.push('/');
      return;
    }

    setIsAuthenticated(true);
    setLoading(false);
  }, [router, role]);

  return { loading, isAuthenticated };
}
