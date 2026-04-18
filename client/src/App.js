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
import Parents from './components/Parents';
import Teachers from './components/Teachers';
import Login from './components/Login';

const CREDENTIALS = {
  admin: 'admin',
  parent: 'parent',
  teacher: 'teacher',
};

const getHomePath = (role) => {
  if (role === 'parent') return '/parents';
  if (role === 'teacher') return '/teachers';
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
    return CREDENTIALS[savedRole] ? savedRole : '';
  });

  const handleLogin = (username, password) => {
    if (!CREDENTIALS[username] || CREDENTIALS[username] !== password) {
      return false;
    }

    setAuthRole(username);
    window.localStorage.setItem('smt-school-role', username);
    return true;
  };

  const handleLogout = () => {
    setAuthRole('');
    window.localStorage.removeItem('smt-school-role');
  };

  return (
    <Router>
      <div className="App" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #f3f4f6 50%, #faf5ff 100%)', minHeight: '100vh', color: '#1f2937', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {authRole && <Header role={authRole} onLogout={handleLogout} homePath={getHomePath(authRole)} />}
        <Routes>
          <Route path="/login" element={authRole ? <Navigate to={getHomePath(authRole)} replace /> : <Login onLogin={handleLogin} />} />

          <Route
            path="/"
            element={
              <ProtectedRoute authRole={authRole} allowedRoles={['admin', 'parent', 'teacher']}>
                {authRole === 'admin' ? <Dashboard /> : <Navigate to={getHomePath(authRole)} replace />}
              </ProtectedRoute>
            }
          />
          <Route path="/parents" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'parent']}><Parents /></ProtectedRoute>} />
          <Route path="/teachers" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin', 'teacher']}><Teachers /></ProtectedRoute>} />

          <Route path="/command-center" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><CommandCenter /></ProtectedRoute>} />
          <Route path="/sis" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><SIS /></ProtectedRoute>} />
          <Route path="/sis/grade/:grade" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><GradeDivisions /></ProtectedRoute>} />
          <Route path="/sis/grade/:grade/:division" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><DivisionStudents /></ProtectedRoute>} />
          <Route path="/sis/student/:id" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><StudentProfile /></ProtectedRoute>} />
          <Route path="/finance" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><Finance /></ProtectedRoute>} />
          <Route path="/admissions" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><Admissions /></ProtectedRoute>} />
          <Route path="/timetable" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><Timetable /></ProtectedRoute>} />
          <Route path="/timetable/period/:id" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><PeriodDetails /></ProtectedRoute>} />
          <Route path="/hr" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><HR /></ProtectedRoute>} />
          <Route path="/exams" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><Exams /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><Attendance /></ProtectedRoute>} />
          <Route path="/transport" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><Transport /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><Inventory /></ProtectedRoute>} />
          <Route path="/communication" element={<ProtectedRoute authRole={authRole} allowedRoles={['admin']}><Communication /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to={authRole ? getHomePath(authRole) : '/login'} replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;