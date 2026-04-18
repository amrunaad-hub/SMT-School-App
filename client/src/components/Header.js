import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
    return (
        <header style={{ background: '#1f2937', color: 'white', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img src="https://static.wixstatic.com/media/a4fde5_f372ba74431941a685e117d2257b701f~mv2.png/v1/fill/w_308,h_324,al_c,lg_1,q_85,enc_avif,quality_auto/a4fde5_f372ba74431941a685e117d2257b701f~mv2.png" alt="SMT English Medium School Logo" style={{ height: '60px', width: 'auto' }} />
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.6rem' }}>School ERP Admin</h1>
                    <p style={{ margin: '6px 0 0', color: '#cbd5e1' }}>Administrative control panel for attendance, teachers, students, and operations.</p>
                </div>
            </div>
            <nav>
                <ul style={{ display: 'flex', gap: '18px', listStyle: 'none', margin: 0, padding: 0, flexWrap: 'wrap' }}>
                    <li><Link style={{ color: 'white', textDecoration: 'none' }} to="/command-center">Command Center</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none' }} to="/sis">SIS</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none' }} to="/finance">Finance</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none' }} to="/admissions">Admissions</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none' }} to="/timetable">Timetable</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none' }} to="/hr">HR</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none' }} to="/exams">Exams</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none' }} to="/attendance">Attendance</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none' }} to="/transport">Transport</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none' }} to="/inventory">Inventory</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none' }} to="/communication">Communication</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', background: '#3b82f6', padding: '5px 10px', borderRadius: '5px' }} to="/parents">Parents Portal</Link></li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;