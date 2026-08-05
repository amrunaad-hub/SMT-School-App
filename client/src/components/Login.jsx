import React, { useState } from 'react';

const Login = ({ onLogin, sessionExpired }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    const ok = await onLogin(username.trim().toLowerCase(), password.trim());
    setIsSubmitting(false);

    if (!ok) {
      setError('Invalid credentials or server unavailable. Check username/password and try again.');
      return;
    }

    setError('');
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px', background: 'radial-gradient(circle at 10% 10%, #fde68a 0%, #fee2e2 40%, #dbeafe 100%)' }}>
      <section style={{ width: '100%', maxWidth: '420px', background: 'rgba(255,255,255,0.96)', border: '1px solid #fda4af', borderRadius: '18px', padding: '22px', boxShadow: '0 20px 34px rgba(30, 64, 175, 0.2)' }}>
        <h1 style={{ margin: '0 0 18px', color: '#1e3a8a', fontSize: '1.6rem' }}>VidyaSetu Secure Login</h1>

        {sessionExpired && (
          <p style={{ background: '#eff6ff', border: '1px solid #93c5fd', color: '#1e3a8a', fontWeight: 600, borderRadius: '10px', padding: '10px 12px', marginTop: 0, marginBottom: '14px', fontSize: '0.85rem' }}>
            Your session ended — please log in again.
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: '7px', color: '#334155', fontWeight: 700 }}>Username</label>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter username"
            style={{ width: '100%', minHeight: '42px', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '0 12px', outline: 'none', marginBottom: '12px', fontSize: '0.92rem' }}
          />

          <label style={{ display: 'block', marginBottom: '7px', color: '#334155', fontWeight: 700 }}>Password</label>
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              style={{ width: '100%', minHeight: '42px', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '0 44px 0 12px', outline: 'none', fontSize: '0.92rem', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', padding: '8px', color: '#64748b', fontSize: '1rem', lineHeight: 1 }}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          {error && <p style={{ color: '#dc2626', fontWeight: 600, marginTop: 0, marginBottom: '12px', fontSize: '0.84rem' }}>{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{ width: '100%', minHeight: '44px', border: 'none', borderRadius: '10px', background: 'linear-gradient(135deg, #1d4ed8 0%, #7e22ce 100%)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}
          >
            {isSubmitting ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  );
};

export default Login;
