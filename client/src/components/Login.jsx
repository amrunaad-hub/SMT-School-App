import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import schoolLogo from '../assets/logo-source.png';
import FontSizeControl from './FontSizeControl';

// Maps handleLogin's failure reason to an accurate, actionable message —
// previously every failure (wrong password, rate-limited, dead network)
// showed the same "Invalid credentials or server unavailable" text, which
// made a real rate-limit report look indistinguishable from a typo.
const ERROR_MESSAGES = {
  invalid: 'Incorrect username or password. Please check and try again.',
  'rate-limited': 'Too many login attempts. Please wait a few minutes and try again.',
  network: 'Could not reach the server. Check your internet connection and try again.',
};

const Login = ({ onLogin, sessionExpired }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    const result = await onLogin(username.trim().toLowerCase(), password.trim());
    setIsSubmitting(false);

    if (!result.ok) {
      setError((result.reason === 'rate-limited' && result.message) || ERROR_MESSAGES[result.reason] || ERROR_MESSAGES.invalid);
      return;
    }

    setError('');
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px', background: '#f1f5f9' }}>
      <section style={{ width: '100%', maxWidth: '400px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px 28px', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
          <FontSizeControl variant="light" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '26px' }}>
          <img src={schoolLogo} alt="Saraswati English Medium School" style={{ height: '64px', width: 'auto', borderRadius: '8px', marginBottom: '14px' }} />
          <h1 style={{ margin: 0, color: '#1e3a8a', fontSize: '1.4rem', fontWeight: 800 }}>VidyaSetu</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Login</p>
        </div>

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
            style={{ width: '100%', minHeight: '44px', border: 'none', borderRadius: '10px', background: '#1e3a8a', color: '#fff', fontWeight: 700, cursor: isSubmitting ? 'default' : 'pointer', fontSize: '0.95rem', opacity: isSubmitting ? 0.75 : 1 }}
          >
            {isSubmitting ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '16px', marginBottom: 0, fontSize: '0.86rem', color: '#64748b' }}>
          New family? <Link to="/apply" style={{ color: '#1e3a8a', fontWeight: 700 }}>Apply for admission</Link>
        </p>
      </section>
    </main>
  );
};

export default Login;
