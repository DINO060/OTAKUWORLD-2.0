import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from './contexts';
import App from './App.tsx';
import './styles/globals.css';
import './index.css';

// Apply saved theme before React renders — prevents flash of wrong theme
;(function () {
  try {
    const saved = JSON.parse(localStorage.getItem('user_settings') || '{}');
    const theme: string = saved.theme ?? 'dark';
    const html = document.documentElement;
    if (theme === 'system') {
      html.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
    } else {
      html.classList.toggle('dark', theme === 'dark');
    }
  } catch (_) {
    document.documentElement.classList.add('dark'); // safe fallback
  }
})();

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>
);
