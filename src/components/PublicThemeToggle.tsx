'use client';

import { useAdminTheme } from '@/contexts/AdminThemeContext';

interface PublicThemeToggleProps {
  mobile?: boolean;
  className?: string;
}

export default function PublicThemeToggle({ mobile = false, className = '' }: PublicThemeToggleProps) {
  const { theme, mounted, toggleTheme } = useAdminTheme();
  const resolvedTheme = mounted ? theme : 'dark';
  const isLightTheme = resolvedTheme === 'light';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`admin-theme-toggle admin-theme-toggle-bb8 ${mobile ? 'admin-theme-toggle-bb8-mobile' : ''} ${className}`.trim()}
      aria-label={`Aktifkan ${isLightTheme ? 'mode gelap' : 'mode terang'}`}
      title={`Aktifkan ${isLightTheme ? 'mode gelap' : 'mode terang'}`}
    >
      <input
        className="slider"
        type="checkbox"
        checked={isLightTheme}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
      />
      <div
        className="switch"
        aria-hidden="true"
      >
        <div className="suns" />
        <div className="moons">
          <div className="star star-1" />
          <div className="star star-2" />
          <div className="star star-3" />
          <div className="star star-4" />
          <div className="star star-5" />
          <div className="first-moon" />
        </div>
        <div className="sand" />
        <div className="bb8">
          <div className="antennas">
            <div className="antenna short" />
            <div className="antenna long" />
          </div>
          <div className="head">
            <div className="stripe one" />
            <div className="stripe two" />
            <div className="eyes">
              <div className="eye one" />
              <div className="eye two" />
            </div>
            <div className="stripe detail">
              <div className="detail zero" />
              <div className="detail zero" />
              <div className="detail one" />
              <div className="detail two" />
              <div className="detail three" />
              <div className="detail four" />
              <div className="detail five" />
              <div className="detail five" />
            </div>
            <div className="stripe three" />
          </div>
          <div className="ball">
            <div className="lines one" />
            <div className="lines two" />
            <div className="ring one" />
            <div className="ring two" />
            <div className="ring three" />
          </div>
          <div className="shadow" />
        </div>
      </div>
      <span className="sr-only">{isLightTheme ? 'Mode terang aktif' : 'Mode gelap aktif'}</span>
    </button>
  );
}
