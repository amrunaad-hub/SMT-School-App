import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

ReactDOM.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
  document.getElementById('root')
);

// Auto-updates the installed PWA in the background when a new deploy ships —
// no "please refresh" prompt needed for this size of app.
registerSW({ immediate: true });

// registerSW's autoUpdate mode gets a new service worker to activate itself
// (self.skipWaiting() + clients.claim() in src/sw.js) without a "new version
// available" prompt, but activating the new worker alone doesn't refresh an
// already-open tab's already-loaded JS — a page that was open across a
// deploy could keep running old code that now references deleted chunk
// files. This is the standard fix: reload once, the moment a new worker
// actually takes control (fires at most once per page life, since the
// reload itself immediately hands control to whatever's now current).
if ('serviceWorker' in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

// A lazy-loaded chunk (Vite's dynamic import(), used for the exceljs
// export in AttendanceRegister.jsx/Forms.jsx) 404s with this specific
// error if the file it wants no longer exists on the server — exactly what
// happens to a tab left open across a deploy. Surface it as a reload
// instead of an unhandled rejection with no visible effect.
window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event.reason?.message || '');
  if (/Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg)) {
    window.location.reload();
  }
});
