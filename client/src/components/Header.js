import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
    const [openGroup, setOpenGroup] = useState(null);
    const closeTimer = useRef(null);

    const openDropdown = (key) => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        setOpenGroup(key);
    };

    const scheduleClose = () => {
        closeTimer.current = setTimeout(() => setOpenGroup(null), 180);
    };

    const cancelClose = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
    };

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 900);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const groupedNav = [
        {
            key: 'academics',
            label: 'Academics',
            items: [
                { to: '/sis', label: '👥 SIS' },
                { to: '/timetable', label: '⏰ Timetable' },
                { to: '/exams', label: '📊 Exams' },
                { to: '/attendance', label: '✅ Attendance' },
            ],
        },
        {
            key: 'operations',
            label: 'Operations',
            items: [
                { to: '/finance', label: '💰 Finance' },
                { to: '/admissions', label: '📝 Admissions' },
                { to: '/transport', label: '🚌 Transport' },
                { to: '/inventory', label: '📦 Inventory' },
            ],
        },
        {
            key: 'people',
            label: 'People',
            items: [
                { to: '/teachers', label: '👩‍🏫 Teachers' },
                { to: '/hr', label: '👔 HR' },
                { to: '/parents', label: '👨‍👩‍👧 Parents' },
                { to: '/communication', label: '💬 Communication' },
            ],
        },
    ];

    const topLinkStyle = {
        color: 'white',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        padding: '8px 14px',
        border: '2px solid rgba(255,255,255,0.3)',
        borderRadius: '8px',
        display: 'inline-block',
        fontSize: '0.85rem',
        fontWeight: '600',
        background: 'rgba(255,255,255,0.1)',
        cursor: 'pointer',
    };

    const dropdownItemStyle = {
        display: 'block',
        padding: '8px 10px',
        borderRadius: '8px',
        textDecoration: 'none',
        color: '#0f172a',
        fontSize: '0.82rem',
        fontWeight: '600',
        background: '#ffffff',
    };

    const mobileNavItemStyle = isMobile ? { flex: '1 1 calc(50% - 10px)', minWidth: '140px' } : {};

    return (
        <header style={{ background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', color: 'white', padding: isMobile ? '14px 12px' : '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)', position: 'relative', zIndex: 50 }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', width: isMobile ? '100%' : 'auto', textDecoration: 'none', color: 'inherit' }}>
                <img src="https://static.wixstatic.com/media/a4fde5_f372ba74431941a685e117d2257b701f~mv2.png/v1/fill/w_308,h_324,al_c,lg_1,q_85,enc_avif,quality_auto/a4fde5_f372ba74431941a685e117d2257b701f~mv2.png" alt="SMT English Medium School Logo" style={{ height: isMobile ? '42px' : '60px', width: 'auto', borderRadius: '6px' }} />
                <div>
                    <h1 style={{ margin: 0, fontSize: isMobile ? '1.05rem' : '1.6rem', fontWeight: '700' }}>📚 School ERP</h1>
                    <p style={{ margin: '6px 0 0', color: '#dbeafe', fontSize: isMobile ? '0.82rem' : '1rem', fontWeight: '500' }}>Professional Educational Administration System</p>
                </div>
            </Link>
            <nav style={{ width: isMobile ? '100%' : 'auto', overflow: 'visible' }}>
                <ul style={{ display: 'flex', gap: '10px', listStyle: 'none', margin: 0, padding: 0, flexWrap: isMobile ? 'wrap' : 'nowrap', overflow: 'visible', scrollbarWidth: 'thin' }}>
                    <li style={mobileNavItemStyle}>
                        <Link style={{ ...topLinkStyle, width: isMobile ? '100%' : 'auto', textAlign: 'center', background: 'rgba(16,185,129,0.25)', border: '2px solid rgba(16,185,129,0.55)' }} to="/">🏠 Home</Link>
                    </li>
                    <li style={mobileNavItemStyle}>
                        <Link style={{ ...topLinkStyle, width: isMobile ? '100%' : 'auto', textAlign: 'center' }} to="/command-center">🎛️ Command</Link>
                    </li>
                    {groupedNav.map((group) => {
                        const isOpen = openGroup === group.key;
                        return (
                            <li
                                key={group.key}
                                style={{ ...mobileNavItemStyle, position: 'relative' }}
                                onMouseEnter={() => { if (!isMobile) { cancelClose(); openDropdown(group.key); } }}
                                onMouseLeave={() => { if (!isMobile) scheduleClose(); }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setOpenGroup(isOpen ? null : group.key)}
                                    style={{ ...topLinkStyle, width: isMobile ? '100%' : 'auto', textAlign: 'center', fontFamily: 'inherit' }}
                                >
                                    {group.label} ▾
                                </button>
                                {isOpen && (
                                    <div
                                        onMouseEnter={cancelClose}
                                        onMouseLeave={scheduleClose}
                                        style={{ position: isMobile ? 'static' : 'absolute', top: isMobile ? 'auto' : '100%', left: 0, paddingTop: isMobile ? '8px' : '6px', minWidth: isMobile ? '100%' : '220px', width: isMobile ? '100%' : 'auto', zIndex: 30 }}
                                    >
                                        <div style={{ background: '#f8fafc', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '8px', boxShadow: '0 12px 24px rgba(15, 23, 42, 0.2)' }}>
                                            {group.items.map((item) => (
                                                <Link
                                                    key={item.to}
                                                    to={item.to}
                                                    onClick={() => setOpenGroup(null)}
                                                    style={dropdownItemStyle}
                                                >
                                                    {item.label}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </header>
    );
};

export default Header;