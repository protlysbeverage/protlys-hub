'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'protlys-theme';

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('protlys-dark', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  document.querySelector('.protlys-app')?.classList.toggle('theme-dark', isDark);
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [position, setPosition] = useState(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const preferred = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    setDark(preferred === 'dark');
    applyTheme(preferred);

    const alignWithHeader = () => {
      const header = document.querySelector('.protlys-app .app-header');
      if (!header) return;
      const rect = header.getBoundingClientRect();
      setPosition({
        left: rect.left + 36,
        top: rect.top + rect.height / 2,
      });
    };

    alignWithHeader();
    window.addEventListener('resize', alignWithHeader);
    window.addEventListener('scroll', alignWithHeader, { passive: true });
    return () => {
      window.removeEventListener('resize', alignWithHeader);
      window.removeEventListener('scroll', alignWithHeader);
    };
  }, []);

  function toggle() {
    const next = dark ? 'light' : 'dark';
    setDark(next === 'dark');
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  const positionStyle = position
    ? { left: position.left, top: position.top, transform: 'translate(-50%, -50%)' }
    : undefined;

  return (
    <button
      className={`theme-toggle${dark ? ' is-dark' : ' is-light'}`}
      style={positionStyle}
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {dark ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 15.5A9 9 0 0 1 8.5 3 9 9 0 1 0 21 15.5Z" />
          </svg>
        )}
      </span>
    </button>
  );
}
