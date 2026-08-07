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

// NOTE: an earlier version of this file also force-reloaded on the
// service worker's `controllerchange` event, to pick up fresh JS the
// moment a new worker took control. Reverted — if that event fires more
// than once in a row (plausible right after a burst of rapid deploys, or
// with any update-detection quirk), each firing reloads the page, which
// re-registers the SW and can refire `controllerchange` again: an infinite
// reload loop, which is a harder failure than the stale-cache problem it
// was meant to fix (a user can always manually refresh a stale page; they
// can't do anything with a page that never stops reloading). Do not re-add
// without a hard cap on reload count.

// A lazy-loaded chunk (Vite's dynamic import(), used for the exceljs
// export in AttendanceRegister.jsx/Forms.jsx) 404s with this specific
// error if the file it wants no longer exists on the server — exactly what
// happens to a tab left open across a deploy. Surface it as a single reload
// instead of an unhandled rejection with no visible effect — guarded to
// fire at most once, for the same reason the controllerchange listener
// above was removed rather than merely reworded.
let reloadedForStaleChunk = false;
window.addEventListener('unhandledrejection', (event) => {
  if (reloadedForStaleChunk) return;
  const msg = String(event.reason?.message || '');
  if (/Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg)) {
    reloadedForStaleChunk = true;
    window.location.reload();
  }
});
