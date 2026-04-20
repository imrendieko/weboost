'use client';

import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useRoleTheme } from '@/lib/useRoleTheme';

interface PublicThemeToggleProps {
  mobile?: boolean;
  className?: string;
}

const StyledWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 12px;

  svg {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
  }

  .switch-container {
    position: relative;
    width: 140px;
    height: 30px;
    background: #e5e7eb;
    border-radius: 26px;
    overflow: hidden;
    cursor: pointer;
    transition: background-color 0.2s ease;
    display: flex;
    align-items: center;
    padding: 2px;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.12);
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    border: 0;
  }

  .switch-container.dark {
    background: #d1d5db;
  }

  .switch-track {
    position: absolute;
    width: 70px;
    height: 26px;
    background: #2563eb;
    border-radius: 24px;
    transition:
      left 0.2s ease,
      background-color 0.2s ease;
    left: 2px;
    z-index: 1;
    box-shadow: 0px 8px 18px rgba(37, 99, 235, 0.28);
    will-change: left;
  }

  .switch-container.dark .switch-track {
    background: #111827;
    left: 68px;
  }

  .label-text {
    position: absolute;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 500;
    width: 50%;
    height: 100%;
    text-align: center;
    transition: color 0.2s ease;
    color: #111827;
    user-select: none;
    pointer-events: none;
  }

  .label-left {
    left: 0;
  }

  .label-right {
    right: 0;
  }

  .switch-container.dark .label-text {
    color: #111827;
  }

  .switch-container.dark .label-left {
    color: #111827;
  }

  .switch-container.dark .label-right {
    color: #fff;
  }

  .label-text.active {
    color: #fff;
  }
`;

export default function PublicThemeToggle({ mobile = false, className = '' }: PublicThemeToggleProps) {
  const { theme, mounted, toggleTheme } = useRoleTheme();
  const [domTheme, setDomTheme] = useState<'dark' | 'light' | null>(null);

  const applyDomTheme = (nextTheme: 'dark' | 'light') => {
    const root = document.documentElement;
    const body = document.body;
    const isLight = nextTheme === 'light';

    root.classList.remove('app-theme-dark', 'app-theme-light');
    body.classList.remove('app-theme-dark', 'app-theme-light');
    root.classList.add(`app-theme-${nextTheme}`);
    body.classList.add(`app-theme-${nextTheme}`);
    root.style.setProperty('--background', isLight ? '#ffffff' : '#0a0a0a');
    root.style.setProperty('--foreground', isLight ? '#0f172a' : '#ededed');
    body.style.backgroundColor = isLight ? '#ffffff' : '#0a0a0a';
    body.style.color = isLight ? '#0f172a' : '#ededed';
    root.style.colorScheme = isLight ? 'light' : 'dark';
    body.style.colorScheme = isLight ? 'light' : 'dark';
  };

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const hasAppDarkClass = root.classList.contains('app-theme-dark') || body.classList.contains('app-theme-dark');
    const hasAppLightClass = root.classList.contains('app-theme-light') || body.classList.contains('app-theme-light');
    const nextTheme = hasAppDarkClass ? 'dark' : hasAppLightClass ? 'light' : mounted && theme === 'dark' ? 'dark' : 'light';

    applyDomTheme(nextTheme);
    setDomTheme(nextTheme);
  }, [mounted, theme]);

  const handleToggleTheme = () => {
    const nextTheme = (domTheme ?? (mounted && theme === 'dark' ? 'dark' : 'light')) === 'dark' ? 'light' : 'dark';
    applyDomTheme(nextTheme);
    setDomTheme(nextTheme);
    toggleTheme();
  };

  const resolvedTheme = domTheme ?? (mounted ? theme : 'light');
  const isDarkTheme = resolvedTheme === 'dark';

  return (
    <StyledWrapper className={className}>
      {/* Sun Icon */}
      <svg
        viewBox="0 0 16 16"
        className="bi bi-sun-fill"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z" />
      </svg>

      {/* Toggle Switch */}
      <button
        type="button"
        className={`switch-container ${isDarkTheme ? 'dark' : ''}`}
        onClick={handleToggleTheme}
        role="switch"
        aria-checked={isDarkTheme}
        aria-label={`Aktifkan mode ${isDarkTheme ? 'terang' : 'gelap'}`}
      >
        <div className="switch-track" />
        <span className={`label-text label-left ${!isDarkTheme ? 'active' : ''}`}>Terang</span>
        <span className={`label-text label-right ${isDarkTheme ? 'active' : ''}`}>Gelap</span>
      </button>

      {/* Moon Icon */}
      <svg
        viewBox="0 0 16 16"
        className="bi bi-moon-stars-fill"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z" />
        <path d="M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.734 1.734 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.734 1.734 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.734 1.734 0 0 0 1.097-1.097l.387-1.162zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.156 1.156 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.156 1.156 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732L13.863.1z" />
      </svg>
    </StyledWrapper>
  );
}
