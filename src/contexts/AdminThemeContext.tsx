import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';

export type AdminTheme = 'dark' | 'light';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface AdminThemeContextValue {
  theme: AdminTheme;
  mounted: boolean;
  setTheme: (theme: AdminTheme) => void;
  toggleTheme: () => void;
}

const ADMIN_THEME_STORAGE_KEY = 'admin_theme_preference';
const SHARED_THEME_STORAGE_KEY = 'app_theme_preference';

const defaultAdminThemeContext: AdminThemeContextValue = {
  theme: 'light',
  mounted: false,
  setTheme: () => undefined,
  toggleTheme: () => undefined,
};

const AdminThemeContext = createContext<AdminThemeContextValue>(defaultAdminThemeContext);

interface AdminThemeProviderProps {
  children: ReactNode;
}

export function AdminThemeProvider({ children }: AdminThemeProviderProps) {
  const [theme, setThemeState] = useState<AdminTheme>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }

    const savedTheme = window.localStorage.getItem(SHARED_THEME_STORAGE_KEY) ?? window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
    return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light';
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useIsomorphicLayoutEffect(() => {
    const adminThemeClassNames = ['admin-theme-dark', 'admin-theme-light'];
    const appThemeClassNames = ['app-theme-dark', 'app-theme-light'];
    const root = document.documentElement;
    const body = document.body;
    const isLightTheme = theme === 'light';

    root.dataset.adminTheme = theme;
    body.dataset.adminTheme = theme;
    root.classList.remove(...adminThemeClassNames);
    root.classList.remove(...appThemeClassNames);
    body.classList.remove(...adminThemeClassNames);
    body.classList.remove(...appThemeClassNames);
    root.classList.add(`admin-theme-${theme}`);
    root.classList.add(`app-theme-${theme}`);
    body.classList.add(`admin-theme-${theme}`);
    body.classList.add(`app-theme-${theme}`);
    root.style.setProperty('--background', isLightTheme ? '#ffffff' : '#0a0a0a');
    root.style.setProperty('--foreground', isLightTheme ? '#0f172a' : '#ededed');
    body.style.backgroundColor = isLightTheme ? '#ffffff' : '#0a0a0a';
    body.style.color = isLightTheme ? '#0f172a' : '#ededed';
    root.style.colorScheme = isLightTheme ? 'light' : 'dark';
    body.style.colorScheme = isLightTheme ? 'light' : 'dark';
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme);
    window.localStorage.setItem(SHARED_THEME_STORAGE_KEY, theme);

    return () => {
      root.classList.remove(...adminThemeClassNames);
      root.classList.remove(...appThemeClassNames);
      body.classList.remove(...adminThemeClassNames);
      body.classList.remove(...appThemeClassNames);
      root.style.removeProperty('--background');
      root.style.removeProperty('--foreground');
      body.style.backgroundColor = '';
      body.style.color = '';
      root.style.colorScheme = '';
      body.style.colorScheme = '';
      delete root.dataset.adminTheme;
      delete body.dataset.adminTheme;
    };
  }, [theme]);

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
