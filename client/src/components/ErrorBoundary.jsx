import React from 'react';

// Top-level safety net for the whole app — without this, any uncaught
// render error (a real bug, or a stale service-worker cache serving JS that
// references a chunk deleted by a later deploy) unmounts the React tree
// with nothing shown, which reads to the user as a blank white screen and
// no way to recover short of knowing to manually clear the app's cache.
// This at least gives them a visible message and a one-tap way out.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('[ErrorBoundary] caught:', error);
  }

  handleReload = () => {
    // A stale cache is the most common real-world cause here — bypass it
    // rather than reloading straight back into the same broken state.
    if ('caches' in window) {
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).finally(() => window.location.reload());
    } else {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f1f5f9', fontFamily: 'inherit' }}>
        <div style={{ maxWidth: '380px', textAlign: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px 24px', boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚠️</div>
          <h2 style={{ margin: '0 0 8px', color: '#1e3a8a', fontSize: '1.15rem' }}>Something went wrong</h2>
          <p style={{ margin: '0 0 18px', color: '#64748b', fontSize: '0.9rem' }}>
            This is usually fixed by reloading. If it keeps happening, remove and re-add the app from your home screen.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{ width: '100%', minHeight: '44px', border: 'none', borderRadius: '10px', background: '#1e3a8a', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}
          >
            Reload
          </button>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
