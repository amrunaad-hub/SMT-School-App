import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import Transport from './components/Transport';
import Inventory from './components/Inventory';
import Communication from './components/Communication';
import EditRequests from './components/EditRequests';
import Washrooms from './components/Washrooms';
import Parents from './components/Parents';
import Teachers from './components/Teachers';
import Login from './components/Login';
import PublicAdmissionForm from './components/PublicAdmissionForm';

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

  if (!allowedRoles.includes(authRole)) {
    return <Navigate to={getHomePath(authRole)} replace />;
  }

  return children;
};

function App() {
  const [authRole, setAuthRole] = useState(() => {
    const savedRole = window.localStorage.getItem('smt-school-role');
    const savedToken = window.localStorage.getItem('smt-school-token');
    return savedRole && savedToken ? savedRole : '';
  });

  const handleLogin = async (username, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        return false;
      }

      const payload = await response.json();
      if (!payload || !payload.token || !payload.user || !payload.user.role) {
        return false;
      }

      setAuthRole(payload.user.role);
      window.localStorage.setItem('smt-school-role', payload.user.role);
      window.localStorage.setItem('smt-school-token', payload.token);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleLogout = () => {
    setAuthRole('');
    window.localStorage.removeItem('smt-school-role');
    window.localStorage.removeItem('smt-school-token');
  };

  return (
    <Router>
      <div className="App" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #f3f4f6 50%, #faf5ff 100%)', minHeight: '100vh', color: '#1f2937', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {authRole && <Header role={authRole} onLogout={handleLogout} homePath={getHomePath(authRole)} />}
        <Routes>
          <Route path="/login" element={authRole ? <Navigate to={getHomePath(authRole)} replace /> : <Login onLogin={handleLogin} />} />
          {/* Public, unauthenticated online admission application — no login required. */}
          <Route path="/apply" element={<PublicAdmissionForm />} />

          <Route
            path="/"
            element={
              <ProtectedRoute authRole={authRole} allowedRoles={['admin', 'parent', 'teacher', 'principal']}>
                {authRole === 'admin' ? <Dashboard /> : <Navigate to={getHomePath(authRole)} replace />}
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
          <Route path="/transport" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><Transport /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><Inventory /></ProtectedRoute>} />
          <Route path="/washrooms" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><Washrooms /></ProtectedRoute>} />
          <Route path="/washrooms/:washroomId" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><Washrooms /></ProtectedRoute>} />
          <Route path="/communication" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'principal', 'teacher']}><Communication /></ProtectedRoute>} />
          <Route path="/edit-requests" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'principal']}><EditRequests /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to={authRole ? getHomePath(authRole) : '/login'} replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;