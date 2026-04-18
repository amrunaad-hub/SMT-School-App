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
        <header style={{ background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', color: 'white', padding: isMobile ? '14px 12px' : '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', width: isMobile ? '100%' : 'auto', textDecoration: 'none', color: 'inherit' }}>
                <img src="https://static.wixstatic.com/media/a4fde5_f372ba74431941a685e117d2257b701f~mv2.png/v1/fill/w_308,h_324,al_c,lg_1,q_85,enc_avif,quality_auto/a4fde5_f372ba74431941a685e117d2257b701f~mv2.png" alt="SMT English Medium School Logo" style={{ height: isMobile ? '42px' : '60px', width: 'auto', borderRadius: '6px' }} />
                <div>
                    <h1 style={{ margin: 0, fontSize: isMobile ? '1.05rem' : '1.6rem', fontWeight: '700' }}>📚 School ERP</h1>
                    <p style={{ margin: '6px 0 0', color: '#dbeafe', fontSize: isMobile ? '0.82rem' : '1rem', fontWeight: '500' }}>Professional Educational Administration System</p>
                    <p style={{ margin: '6px 0 0', fontSize: isMobile ? '0.75rem' : '0.85rem', display: 'inline-block', padding: '3px 9px', borderRadius: '999px', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)' }}>🏠 Home</p>
                </div>
            </Link>
            <nav style={{ width: isMobile ? '100%' : 'auto' }}>
                <ul style={{ display: 'flex', gap: '10px', listStyle: 'none', margin: 0, padding: 0, flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'thin' }}>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '8px 14px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '8px', display: 'inline-block', fontSize: '0.85rem', fontWeight: '600', background: 'rgba(16,185,129,0.2)', transition: 'all 0.3s', cursor: 'pointer' }} to="/">🏠 Home</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '8px 14px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '8px', display: 'inline-block', fontSize: '0.85rem', fontWeight: '500', background: 'rgba(255,255,255,0.1)', transition: 'all 0.3s', cursor: 'pointer' }} to="/command-center">🎛️ Command</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '8px 14px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '8px', display: 'inline-block', fontSize: '0.85rem', fontWeight: '500', background: 'rgba(255,255,255,0.1)', transition: 'all 0.3s', cursor: 'pointer' }} to="/sis">👥 SIS</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '8px 14px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '8px', display: 'inline-block', fontSize: '0.85rem', fontWeight: '500', background: 'rgba(255,255,255,0.1)', transition: 'all 0.3s', cursor: 'pointer' }} to="/finance">💰 Finance</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '8px 14px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '8px', display: 'inline-block', fontSize: '0.85rem', fontWeight: '500', background: 'rgba(255,255,255,0.1)', transition: 'all 0.3s', cursor: 'pointer' }} to="/admissions">📝 Admissions</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '8px 14px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '8px', display: 'inline-block', fontSize: '0.85rem', fontWeight: '500', background: 'rgba(255,255,255,0.1)', transition: 'all 0.3s', cursor: 'pointer' }} to="/timetable">⏰ Timetable</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '8px 14px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '8px', display: 'inline-block', fontSize: '0.85rem', fontWeight: '500', background: 'rgba(255,255,255,0.1)', transition: 'all 0.3s', cursor: 'pointer' }} to="/hr">👔 HR</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '8px 14px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '8px', display: 'inline-block', fontSize: '0.85rem', fontWeight: '500', background: 'rgba(255,255,255,0.1)', transition: 'all 0.3s', cursor: 'pointer' }} to="/exams">📊 Exams</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '8px 14px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '8px', display: 'inline-block', fontSize: '0.85rem', fontWeight: '500', background: 'rgba(255,255,255,0.1)', transition: 'all 0.3s', cursor: 'pointer' }} to="/attendance">✅ Attendance</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '8px 14px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '8px', display: 'inline-block', fontSize: '0.85rem', fontWeight: '500', background: 'rgba(255,255,255,0.1)', transition: 'all 0.3s', cursor: 'pointer' }} to="/transport">🚌 Transport</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '8px 14px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '8px', display: 'inline-block', fontSize: '0.85rem', fontWeight: '500', background: 'rgba(255,255,255,0.1)', transition: 'all 0.3s', cursor: 'pointer' }} to="/inventory">📦 Inventory</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', padding: '8px 14px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '8px', display: 'inline-block', fontSize: '0.85rem', fontWeight: '500', background: 'rgba(255,255,255,0.1)', transition: 'all 0.3s', cursor: 'pointer' }} to="/communication">💬 Communication</Link></li>
                    <li><Link style={{ color: 'white', textDecoration: 'none', background: '#10b981', whiteSpace: 'nowrap', padding: '8px 14px', borderRadius: '8px', display: 'inline-block', fontSize: '0.85rem', fontWeight: '600', border: '2px solid #059669', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)' }} to="/parents">👨‍👩‍👧 Parents</Link></li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;