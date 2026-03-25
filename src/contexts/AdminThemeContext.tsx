import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AdminTheme = 'dark' | 'light';

interface AdminThemeContextValue {
  theme: AdminTheme;
  mounted: boolean;
  setTheme: (theme: AdminTheme) => void;
  toggleTheme: () => void;
}

const ADMIN_THEME_STORAGE_KEY = 'admin_theme_preference';

const defaultAdminThemeContext: AdminThemeContextValue = {
  theme: 'dark',
  mounted: false,
  setTheme: () => undefined,
  toggleTheme: () => undefined,
};

const AdminThemeContext = createContext<AdminThemeContextValue>(defaultAdminThemeContext);

interface AdminThemeProviderProps {
  children: ReactNode;
}

export function AdminThemeProvider({ children }: AdminThemeProviderProps) {
  const [theme, setThemeState] = useState<AdminTheme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY) as AdminTheme | null;

    if (savedTheme === 'dark' || savedTheme === 'light') {
      setThemeState(savedTheme);
    }

    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const adminThemeClassNames = ['admin-theme-dark', 'admin-theme-light'];
    const root = document.documentElement;
    const body = document.body;

    root.dataset.adminTheme = theme;
    body.dataset.adminTheme = theme;
    root.classList.remove(...adminThemeClassNames);
    body.classList.remove(...adminThemeClassNames);
    root.classList.add(`admin-theme-${theme}`);
    body.classList.add(`admin-theme-${theme}`);
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme);

    return () => {
      root.classList.remove(...adminThemeClassNames);
      body.classList.remove(...adminThemeClassNames);
      delete root.dataset.adminTheme;
      delete body.dataset.adminTheme;
    };
  }, [mounted, theme]);

  const setTheme = (nextTheme: AdminTheme) => {
    setThemeState(nextTheme);
  };

  const toggleTheme = () => {
    setThemeState((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  const value = useMemo(
    () => ({
      theme,
      mounted,
      setTheme,
      toggleTheme,
    }),
    [mounted, theme],
  );

  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>;
}

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}
