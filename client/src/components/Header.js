import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 900);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    return (
        <header style={{ background: '#1f2937', color: 'white', padding: isMobile ? '14px 12px' : '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
                <img src="https://static.wixstatic.com/media/a4fde5_f372ba74431941a685e117d2257b701f~mv2.png/v1/fill/w_308,h_324,al_c,lg_1,q_85,enc_avif,quality_auto/a4fde5_f372ba74431941a685e117d2257b701f~mv2.png" alt="SMT English Medium School Logo" style={{ height: isMobile ? '42px' : '60px', width: 'auto' }} />
                <div>
                    <h1 style={{ margin: 0, fontSize: isMobile ? '1.05rem' : '1.6rem' }}>School ERP Admin</h1>
                    <p style={{ margin: '6px 0 0', color: '#cbd5e1', fontSize: isMobile ? '0.82rem' : '1rem' }}>Administrative control panel for attendance, teachers, students, and operations.</p>
                </div>
            </div>
            <nav style={{ width: isMobile ? '100%' : 'auto' }}>
                <ul style={{ display: 'flex', gap: '10px', listStyle: 'none', margin: 0, padding: 0, flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'thin' }}>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '6px 10px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '999px', display: 'inline-block', fontSize: '0.88rem' }} to="/command-center">Command Center</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '6px 10px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '999px', display: 'inline-block', fontSize: '0.88rem' }} to="/sis">SIS</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '6px 10px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '999px', display: 'inline-block', fontSize: '0.88rem' }} to="/finance">Finance</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '6px 10px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '999px', display: 'inline-block', fontSize: '0.88rem' }} to="/admissions">Admissions</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '6px 10px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '999px', display: 'inline-block', fontSize: '0.88rem' }} to="/timetable">Timetable</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '6px 10px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '999px', display: 'inline-block', fontSize: '0.88rem' }} to="/hr">HR</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '6px 10px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '999px', display: 'inline-block', fontSize: '0.88rem' }} to="/exams">Exams</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '6px 10px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '999px', display: 'inline-block', fontSize: '0.88rem' }} to="/attendance">Attendance</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '6px 10px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '999px', display: 'inline-block', fontSize: '0.88rem' }} to="/transport">Transport</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '6px 10px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '999px', display: 'inline-block', fontSize: '0.88rem' }} to="/inventory">Inventory</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '6px 10px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '999px', display: 'inline-block', fontSize: '0.88rem' }} to="/communication">Communication</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', background: '#3b82f6', whiteSpace: 'nowrap', padding: '6px 10px', borderRadius: '999px', display: 'inline-block', fontSize: '0.88rem' }} to="/parents">Parents Portal</Link></li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;