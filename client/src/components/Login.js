import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const ok = onLogin(username.trim().toLowerCase(), password.trim());

    if (!ok) {
      setError('Invalid credentials. Use the provided role-based username and password.');
      return;
    }

    setError('');
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px', background: 'radial-gradient(circle at 10% 10%, #fde68a 0%, #fee2e2 40%, #dbeafe 100%)' }}>
      <section style={{ width: '100%', maxWidth: '420px', background: 'rgba(255,255,255,0.96)', border: '1px solid #fda4af', borderRadius: '18px', padding: '22px', boxShadow: '0 20px 34px rgba(30, 64, 175, 0.2)' }}>
        <h1 style={{ margin: 0, color: '#1e3a8a', fontSize: '1.6rem' }}>School ERP Secure Login</h1>
        <p style={{ color: '#475569', marginTop: '8px', marginBottom: '18px' }}>Role-based access for admin, parents and teachers.</p>

        <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px', color: '#9a3412', fontSize: '0.86rem', lineHeight: 1.5 }}>
          <strong>Credentials:</strong><br />
          Admin: admin / admin<br />
          Parent: parent / parent<br />
          Teacher: teacher / teacher
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: '7px', color: '#334155', fontWeight: 700 }}>Username</label>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter username"
            style={{ width: '100%', minHeight: '42px', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '0 12px', outline: 'none', marginBottom: '12px', fontSize: '0.92rem' }}
          />

          <label style={{ display: 'block', marginBottom: '7px', color: '#334155', fontWeight: 700 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter password"
            style={{ width: '100%', minHeight: '42px', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '0 12px', outline: 'none', marginBottom: '14px', fontSize: '0.92rem' }}
          />

          {error && <p style={{ color: '#dc2626', fontWeight: 600, marginTop: 0, marginBottom: '12px', fontSize: '0.84rem' }}>{error}</p>}

          <button
            type="submit"
            style={{ width: '100%', minHeight: '44px', border: 'none', borderRadius: '10px', background: 'linear-gradient(135deg, #1d4ed8 0%, #7e22ce 100%)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}
          >
            Login
          </button>
        </form>
      </section>
    </main>
  );
};

export default Login;
