import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { api, markLoggingOut, clearLoggingOut } from './api';
import { applyStoredFontScale } from './components/FontSizeControl';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CommandCenter from './components/CommandCenter';
import SIS from './components/SIS';
import GradeDivisions from './components/GradeDivisions';
import DivisionStudents from './components/DivisionStudents';
import StudentProfile from './components/StudentProfile';
import Finance from './components/Finance';
import Admissions from './components/Admissions';
import Timetable from './components/Timetable';
import PeriodDetails from './components/PeriodDetails';
import HR from './components/HR';
import Exams from './components/Exams';
import Attendance from './components/Attendance';
import AttendanceRegister from './components/AttendanceRegister';
import Forms from './components/Forms';
import Transport from './components/Transport';
import Inventory from './components/Inventory';
import Communication from './components/Communication';
import EditRequests from './components/EditRequests';
import Washrooms from './components/Washrooms';
import Parents from './components/Parents';
import Teachers from './components/Teachers';
import Login from './components/Login';
import MyDocuments from './components/MyDocuments';
import PublicAdmissionForm from './components/PublicAdmissionForm';
import AuditLogs from './components/AuditLogs';

const getHomePath = (role) => {
  if (role === 'parent') return '/parents';
  if (role === 'teacher') return '/teachers';
  if (role === 'principal') return '/command-center';
  return '/';
};

const ProtectedRoute = ({ authRole, allowedRoles, children }) => {
  if (!authRole) {
    return <Navigate to="/login" replace />;
  }

  // Unfettered access by design — every module in the app, no allowlist
  // needed per-route.
  if (authRole !== 'superuser' && !allowedRoles.includes(authRole)) {
    return <Navigate to={getHomePath(authRole)} replace />;
  }

  return children;
};

function App() {
  const [authRole, setAuthRole] = useState(() => {
    // localStorage (not sessionStorage) — a session must survive a mobile
    // PWA being minimized/backgrounded, which can tear down and recreate
    // the page context (wiping sessionStorage entirely) well before the
    // user ever explicitly logs out. sessionStorage was tried briefly for
    // easier multi-account testing in separate tabs, but persistent login
    // (so push notifications keep working) is the higher-priority
    // requirement for real parents/teachers — use separate Chrome profiles
    // for multi-account testing instead.
    const savedRole = window.localStorage.getItem('smt-school-role');
    const savedToken = window.localStorage.getItem('smt-school-token');
    return savedRole && savedToken ? savedRole : '';
  });
  const [sessionExpired, setSessionExpired] = useState(false);

  // Applies the saved text-size preference on every route, including the
  // login page — FontSizeControl (rendered in Header/Login) only mounts once
  // authenticated or on the login form itself, but the preference needs to
  // already be in effect the instant App mounts, everywhere.
  useEffect(() => {
    applyStoredFontScale();
  }, []);

  // Any API call returning 401 (dead/expired token) fires this — see api.js.
  // Without it, the app kept looking logged in while every request quietly
  // failed, and each screen showed its own misleading story (e.g. Parents
  // Portal reading "no student linked" hours after a real login, when the
  // actual problem was an expired session). Force a clean, honest logout
  // instead, with a message explaining why.
  useEffect(() => {
    const onExpired = () => {
      setAuthRole('');
      window.localStorage.removeItem('smt-school-role');
      window.localStorage.removeItem('smt-school-token');
      setSessionExpired(true);
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  // Returns { ok: true } or { ok: false, reason, message } rather than a
  // bare boolean — a wrong password, a rate limit, and a dead network were
  // all previously collapsed into the same "Invalid credentials or server
  // unavailable" text on the login screen, which is genuinely three
  // different problems with three different fixes (retype it / wait a few
  // minutes / check your connection) and made real reports (e.g. a rate
  // limit hit) look identical to a typo.
  const handleLogin = async (username, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.status === 429) {
        const payload = await response.json().catch(() => ({}));
        return { ok: false, reason: 'rate-limited', message: payload.message };
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        return { ok: false, reason: 'invalid', message: payload.message };
      }

      const payload = await response.json();
      if (!payload || !payload.token || !payload.user || !payload.user.role) {
        return { ok: false, reason: 'invalid' };
      }

      // Write storage BEFORE flipping React state. This app is on React 17,
      // which (unlike 18) doesn't auto-batch state updates made after an
      // `await` — setAuthRole here can trigger an immediate, synchronous
      // remount of <Header>, whose effect reads the token from localStorage
      // right then. Setting state first meant that effect could fire before
      // the token/role were actually written, sending `Bearer null` and
      // getting 401'd on the very first request after every login.
      window.localStorage.setItem('smt-school-role', payload.user.role);
      window.localStorage.setItem('smt-school-token', payload.token);
      clearLoggingOut();
      setAuthRole(payload.user.role);
      setSessionExpired(false);
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: 'network' };
    }
  };

  const handleLogout = () => {
    // Mark this as intentional before anything else fires — the push-
    // unsubscribe call below (or any other request already in flight) could
    // otherwise return a 401 mid-logout and get misread by api.js as a
    // surprise session death.
    markLoggingOut();
    api.post('/api/auth/logout').catch(() => {});
    const clearLocal = () => {
      setAuthRole('');
      setSessionExpired(false);
      window.localStorage.removeItem('smt-school-role');
      window.localStorage.removeItem('smt-school-token');
    };

    // Push subscriptions live at the browser/device level, not per-login —
    // on a shared device a stale subscription would otherwise keep sending
    // whoever logs in next the previous user's notifications. Unsubscribe
    // fully (server row + browser) before wiping the token that authorizes
    // the delete call, so the next login starts clean and has to opt in
    // again explicitly.
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => (sub
          ? api.delete('/api/push/subscribe', { endpoint: sub.endpoint }).catch(() => {}).then(() => sub.unsubscribe().catch(() => {}))
          : null))
        .catch(() => {})
        .finally(clearLocal);
    } else {
      clearLocal();
    }
  };

  return (
    <Router>
      <div className="App" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #f3f4f6 50%, #faf5ff 100%)', minHeight: '100vh', color: '#1f2937', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {authRole && <Header role={authRole} onLogout={handleLogout} homePath={getHomePath(authRole)} />}
        <Routes>
          <Route path="/login" element={authRole ? <Navigate to={getHomePath(authRole)} replace /> : <Login onLogin={handleLogin} sessionExpired={sessionExpired} />} />
          {/* Public, unauthenticated online admission application — no login required. */}
          <Route path="/apply" element={<PublicAdmissionForm />} />

          <Route
            path="/"
            element={
              <ProtectedRoute authRole={authRole} allowedRoles={['admin', 'parent', 'teacher', 'principal']}>
                {(authRole === 'admin' || authRole === 'superuser') ? <Dashboard /> : <Navigate to={getHomePath(authRole)} replace />}
              </ProtectedRoute>
            }
          />
          <Route path="/parents" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'parent']}><Parents /></ProtectedRoute>} />
          <Route path="/teachers" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'teacher']}><Teachers /></ProtectedRoute>} />

          {/* Principal: same school-wide oversight access as admin (command center,
              SIS, attendance, finance, exams, admissions, communication/notices).
              HR/Transport/Inventory/Washrooms stay admin-only back-office operations. */}
          <Route path="/command-center" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'principal']}><CommandCenter /></ProtectedRoute>} />
          <Route path="/sis" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'principal']}><SIS /></ProtectedRoute>} />
          <Route path="/sis/grade/:grade" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'principal']}><GradeDivisions /></ProtectedRoute>} />
          <Route path="/sis/grade/:grade/:division" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'principal']}><DivisionStudents /></ProtectedRoute>} />
          <Route path="/sis/student/:id" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'principal']}><StudentProfile /></ProtectedRoute>} />
          <Route path="/finance" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'principal']}><Finance /></ProtectedRoute>} />
          <Route path="/admissions" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'principal']}><Admissions /></ProtectedRoute>} />
          <Route path="/timetable" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'principal', 'teacher']}><Timetable /></ProtectedRoute>} />
          <Route path="/timetable/period/:grade/:division/:periodIndex/:date" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'principal', 'teacher']}><PeriodDetails /></ProtectedRoute>} />
          <Route path="/hr" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><HR /></ProtectedRoute>} />
          <Route path="/exams" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'principal']}><Exams /></ProtectedRoute>} />
          {/* Teachers mark their own class's attendance — this route previously excluded
              them entirely despite Attendance.js already supporting it. */}
          <Route path="/attendance" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'principal', 'teacher']}><Attendance /></ProtectedRoute>} />
          <Route path="/attendance-register" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'principal', 'teacher']}><AttendanceRegister /></ProtectedRoute>} />
          <Route path="/forms" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'principal', 'teacher', 'parent']}><Forms /></ProtectedRoute>} />
          <Route path="/transport" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><Transport /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><Inventory /></ProtectedRoute>} />
          <Route path="/washrooms" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><Washrooms /></ProtectedRoute>} />
          <Route path="/washrooms/:washroomId" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><Washrooms /></ProtectedRoute>} />
          <Route path="/communication" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'principal', 'teacher']}><Communication /></ProtectedRoute>} />
          <Route path="/edit-requests" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'principal']}><EditRequests /></ProtectedRoute>} />
          <Route path="/my-documents" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'principal', 'teacher', 'parent']}><MyDocuments /></ProtectedRoute>} />
          <Route path="/audit-logs" element={<ProtectedRoute authRole={authRole} allowedRoles={['superuser']}><AuditLogs /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to={authRole ? getHomePath(authRole) : '/login'} replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;