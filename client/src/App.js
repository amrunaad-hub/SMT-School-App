import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <div className="App" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #f3f4f6 50%, #faf5ff 100%)', minHeight: '100vh', color: '#1f2937', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <Header />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/command-center" element={<CommandCenter />} />
          <Route path="/sis" element={<SIS />} />
          <Route path="/sis/grade/:grade" element={<GradeDivisions />} />
          <Route path="/sis/grade/:grade/:division" element={<DivisionStudents />} />
          <Route path="/sis/student/:id" element={<StudentProfile />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/admissions" element={<Admissions />} />
          <Route path="/timetable" element={<Timetable />} />
          <Route path="/timetable/period/:id" element={<PeriodDetails />} />
          <Route path="/hr" element={<HR />} />
          <Route path="/exams" element={<Exams />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/transport" element={<Transport />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/communication" element={<Communication />} />
          <Route path="/parents" element={<Parents />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;