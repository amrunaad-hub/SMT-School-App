import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import schoolLogo from '../assets/logo-source.png';
import { api } from '../api';

const Header = ({ role = 'admin', onLogout, homePath = '/' }) => {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
    const [openGroup, setOpenGroup] = useState(null);
    const [displayName, setDisplayName] = useState('');
    const closeTimer = useRef(null);

    // "Who's logged in on this device" — shown persistently in the header so
    // it's obvious at a glance on a shared device, without digging into a
    // profile page.
    useEffect(() => {
        api.get('/api/auth/me').then((data) => setDisplayName(data.user?.displayName || '')).catch(() => {});
    }, [role]);

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

    // Admin-only: flat links for modules that actually work today, plus a
    // single "Upcoming Features" dropdown for everything else — replaces the
    // old Academics/Operations/People grouping for the admin role specifically
    // (principal keeps groupedNav/principalNav below, unaffected).
    const adminWorkingLinks = [
        { to: '/sis', label: '👥 SIS' },
        { to: '/attendance', label: '✅ Attendance' },
        { to: '/timetable', label: '⏰ Timetable' },
        { to: '/communication', label: '💬 Communication' },
        { to: '/edit-requests', label: '✏️ Edit Requests' },
        { to: '/my-documents', label: '📁 My Documents' },
    ];

    const adminUpcomingGroup = {
        key: 'upcoming',
        label: '🚧 Upcoming Features',
        items: [
            { to: '/command-center', label: '🎛️ Command Center' },
            { to: '/finance', label: '💰 Finance' },
            { to: '/admissions', label: '📝 Admissions' },
            { to: '/hr', label: '👔 HR' },
            { to: '/exams', label: '📊 Exams' },
            { to: '/transport', label: '🚌 Transport' },
            { to: '/inventory', label: '📦 Inventory' },
        ],
    };

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
                { to: '/edit-requests', label: '✅ Edit Requests' },
                { to: '/my-documents', label: '📁 My Documents' },
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
    const isAdmin = role === 'admin';
    const isPrincipal = role === 'principal';

    // Principal gets the same oversight groups as admin, minus the back-office-only
    // items (Transport, Inventory, HR, Teachers-as-admin-view) that stay admin-only
    // in App.js's route guards.
    const principalNav = groupedNav
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => !['/transport', '/inventory', '/hr', '/teachers'].includes(item.to)),
        }))
        .filter((group) => group.items.length > 0);

    const isParent = role === 'parent';

    return (
        <header style={{ background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', color: 'white', padding: isMobile ? '14px 12px' : '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: isParent ? 'nowrap' : 'wrap', gap: '12px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)', position: 'relative', zIndex: 50 }}>
            <Link to={homePath} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: isParent || !isMobile ? 'auto' : '100%', minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                <img src={schoolLogo} alt="SMT English Medium School Logo" style={{ height: isMobile ? '42px' : '60px', width: 'auto', borderRadius: '6px', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                    <h1 style={{ margin: 0, fontSize: isMobile ? '1.05rem' : '1.6rem', fontWeight: '700', whiteSpace: isParent ? 'nowrap' : 'normal', overflow: isParent ? 'hidden' : 'visible', textOverflow: isParent ? 'ellipsis' : 'clip' }}>SMT&apos;s VidyaSetu</h1>
                    <p style={{ margin: '6px 0 0', color: '#dbeafe', fontSize: isMobile ? '0.82rem' : '1rem', fontWeight: '500', whiteSpace: isParent ? 'nowrap' : 'normal', overflow: isParent ? 'hidden' : 'visible', textOverflow: isParent ? 'ellipsis' : 'clip' }}>{displayName ? `Welcome, ${displayName}` : `Smart School Management • ${role.toUpperCase()}`}</p>
                </div>
            </Link>
            {isParent ? (
                <button
                    type="button"
                    onClick={onLogout}
                    style={{ flexShrink: 0, color: 'white', border: '1px solid rgba(248,113,113,0.8)', background: 'rgba(239,68,68,0.25)', borderRadius: '8px', padding: isMobile ? '6px 10px' : '8px 14px', fontSize: isMobile ? '0.78rem' : '0.85rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                >
                    🔒 Logout
                </button>
            ) : (
            <nav style={{ width: isMobile ? '100%' : 'auto', overflow: 'visible' }}>
                <ul style={{ display: 'flex', gap: '10px', listStyle: 'none', margin: 0, padding: 0, flexWrap: 'wrap', overflow: 'visible', scrollbarWidth: 'thin' }}>
                    {(isAdmin || isPrincipal) ? (
                        <>
                            <li style={mobileNavItemStyle}>
                                <Link style={{ ...topLinkStyle, width: isMobile ? '100%' : 'auto', textAlign: 'center', background: 'rgba(16,185,129,0.25)', border: '2px solid rgba(16,185,129,0.55)' }} to={isAdmin ? '/' : '/command-center'}>🏠 Home</Link>
                            </li>
                            {isAdmin && adminWorkingLinks.map((item) => (
                                <li key={item.to} style={mobileNavItemStyle}>
                                    <Link style={{ ...topLinkStyle, width: isMobile ? '100%' : 'auto', textAlign: 'center' }} to={item.to}>{item.label}</Link>
                                </li>
                            ))}
                            {(isAdmin ? [adminUpcomingGroup] : principalNav).map((group) => {
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
                                            style={{ ...topLinkStyle, width: isMobile ? '100%' : 'auto', textAlign: 'center', fontFamily: 'inherit', ...(group.key === 'upcoming' ? { background: 'rgba(255,255,255,0.05)', border: '2px dashed rgba(255,255,255,0.4)' } : {}) }}
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
                                                    {group.key === 'upcoming' && (
                                                        <p style={{ margin: '2px 6px 8px', color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600 }}>Not yet finished — disabled for now.</p>
                                                    )}
                                                    {group.items.map((item) => (
                                                        group.key === 'upcoming' ? (
                                                            <span
                                                                key={item.to}
                                                                style={{ ...dropdownItemStyle, color: '#94a3b8', background: '#f1f5f9', cursor: 'not-allowed' }}
                                                            >
                                                                {item.label}
                                                            </span>
                                                        ) : (
                                                            <Link
                                                                key={item.to}
                                                                to={item.to}
                                                                onClick={() => setOpenGroup(null)}
                                                                style={dropdownItemStyle}
                                                            >
                                                                {item.label}
                                                            </Link>
                                                        )
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </>
                    ) : (
                        // Only teacher reaches here — parent gets the compact
                        // logo-row layout above instead of this nav entirely.
                        <li style={{ ...mobileNavItemStyle, minWidth: '220px' }}>
                            <Link style={{ ...topLinkStyle, width: '100%', textAlign: 'center', background: 'rgba(16,185,129,0.25)', border: '2px solid rgba(16,185,129,0.55)' }} to="/teachers">
                                👩‍🏫 Teachers Portal
                            </Link>
                        </li>
                    )}
                    <li style={mobileNavItemStyle}>
                        <button
                            type="button"
                            onClick={onLogout}
                            style={{ ...topLinkStyle, width: isMobile ? '100%' : 'auto', textAlign: 'center', border: '2px solid rgba(248,113,113,0.8)', background: 'rgba(239,68,68,0.25)', fontFamily: 'inherit' }}
                        >
                            🔒 Logout
                        </button>
                    </li>
                </ul>
            </nav>
            )}
        </header>
    );
};

export default Header;