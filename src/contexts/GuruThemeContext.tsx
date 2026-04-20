import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';

export type GuruTheme = 'dark' | 'light';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface GuruThemeContextValue {
  theme: GuruTheme;
  mounted: boolean;
  setTheme: (theme: GuruTheme) => void;
  toggleTheme: () => void;
}

const GURU_THEME_STORAGE_KEY = 'guru_theme_preference';
const SHARED_THEME_STORAGE_KEY = 'app_theme_preference';

const defaultGuruThemeContext: GuruThemeContextValue = {
  theme: 'light',
  mounted: false,
  setTheme: () => undefined,
  toggleTheme: () => undefined,
};

const GuruThemeContext = createContext<GuruThemeContextValue>(defaultGuruThemeContext);

interface GuruThemeProviderProps {
  children: ReactNode;
}

export function GuruThemeProvider({ children }: GuruThemeProviderProps) {
  const [theme, setThemeState] = useState<GuruTheme>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }

    const savedTheme = window.localStorage.getItem(SHARED_THEME_STORAGE_KEY) ?? window.localStorage.getItem(GURU_THEME_STORAGE_KEY);
    return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light';
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useIsomorphicLayoutEffect(() => {
    const themeClassNames = ['guru-theme-dark', 'guru-theme-light'];
    const appThemeClassNames = ['app-theme-dark', 'app-theme-light'];
    const root = document.documentElement;
    const body = document.body;
    const isLightTheme = theme === 'light';

    root.dataset.guruTheme = theme;
    body.dataset.guruTheme = theme;
    root.classList.remove(...themeClassNames);
    root.classList.remove(...appThemeClassNames);
    body.classList.remove(...themeClassNames);
    body.classList.remove(...appThemeClassNames);
    root.classList.add(`guru-theme-${theme}`);
    root.classList.add(`app-theme-${theme}`);
    body.classList.add(`guru-theme-${theme}`);
    body.classList.add(`app-theme-${theme}`);
    root.style.setProperty('--background', isLightTheme ? '#ffffff' : '#0a0a0a');
    root.style.setProperty('--foreground', isLightTheme ? '#0f172a' : '#ededed');
    body.style.backgroundColor = isLightTheme ? '#ffffff' : '#0a0a0a';
    body.style.color = isLightTheme ? '#0f172a' : '#ededed';
    root.style.colorScheme = isLightTheme ? 'light' : 'dark';
    body.style.colorScheme = isLightTheme ? 'light' : 'dark';
    window.localStorage.setItem(GURU_THEME_STORAGE_KEY, theme);
    window.localStorage.setItem(SHARED_THEME_STORAGE_KEY, theme);

    return () => {
      root.classList.remove(...themeClassNames);
      root.classList.remove(...appThemeClassNames);
      body.classList.remove(...themeClassNames);
      body.classList.remove(...appThemeClassNames);
      root.style.removeProperty('--background');
      root.style.removeProperty('--foreground');
      body.style.backgroundColor = '';
      body.style.color = '';
      root.style.colorScheme = '';
      body.style.colorScheme = '';
      delete root.dataset.guruTheme;
      delete body.dataset.guruTheme;
    };
  }, [theme]);

  const setTheme = (nextTheme: GuruTheme) => {
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

  return <GuruThemeContext.Provider value={value}>{children}</GuruThemeContext.Provider>;
}

export function useGuruTheme() {
  return useContext(GuruThemeContext);
}
