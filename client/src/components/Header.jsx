import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import schoolLogo from '../assets/logo-source.png';
import { api } from '../api';
import FontSizeControl from './FontSizeControl';

// Base pill-button look shared by every top-level nav link/button —
// equivalent to the old `topLinkStyle` object, now a Tailwind class string.
// bg-white/10 + border-white/30 reproduce the original
// rgba(255,255,255,0.1)/rgba(255,255,255,0.3) translucent overlays exactly.
const NAV_LINK_BASE = 'text-white no-underline whitespace-nowrap px-3.5 py-2 border-2 border-white/30 rounded-lg inline-block text-[0.85rem] font-semibold bg-white/10 cursor-pointer text-center font-sans';

// Equivalent to the old `dropdownItemStyle` object.
const DROPDOWN_ITEM = 'block px-2.5 py-2 rounded-lg no-underline text-ink text-[0.82rem] font-semibold bg-white';

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
        { to: '/attendance-register', label: '📖 Attendance Register' },
        { to: '/forms', label: '📝 Forms' },
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
                { to: '/attendance-register', label: '📖 Attendance Register' },
                { to: '/forms', label: '📝 Forms' },
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

    const isAdmin = role === 'admin';
    const isPrincipal = role === 'principal';
    // Unfettered access: gets the full admin nav, plus the "upcoming"
    // features actually clickable instead of disabled placeholders (they
    // work, they're just not admin-polished yet), plus the exclusive
    // Server Logs page.
    const isSuperuser = role === 'superuser';
    const superuserExtraLinks = [{ to: '/audit-logs', label: '🛡️ Server Logs' }];

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
        <header className={`bg-gradient-to-br from-primary to-primaryDark text-white flex justify-between items-center gap-3 shadow-lg relative z-50 font-sans ${isMobile ? 'px-3 py-3.5' : 'px-6 py-5'} ${isParent ? 'flex-nowrap' : 'flex-wrap'}`}>
            <Link to={homePath} className={`flex items-center gap-3 no-underline text-inherit min-w-0 ${isParent || !isMobile ? 'w-auto' : 'w-full'}`}>
                <img src={schoolLogo} alt="SMT English Medium School Logo" className={`${isMobile ? 'h-[42px]' : 'h-[60px]'} w-auto rounded-md flex-shrink-0`} />
                <div className="min-w-0">
                    <h1 className={`m-0 font-bold ${isMobile ? 'text-[1.05rem]' : 'text-[1.6rem]'} ${isParent ? 'whitespace-nowrap overflow-hidden text-ellipsis' : 'whitespace-normal overflow-visible text-clip'}`}>SMT&apos;s VidyaSetu</h1>
                    <p className={`mt-1.5 text-blue-100 font-medium ${isMobile ? 'text-[0.82rem]' : 'text-base'} ${isParent ? 'whitespace-nowrap overflow-hidden text-ellipsis' : 'whitespace-normal overflow-visible text-clip'}`}>{displayName ? `Welcome, ${displayName}` : `Smart School Management • ${role.toUpperCase()}`}</p>
                </div>
            </Link>
            {isParent ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                    <FontSizeControl variant="dark" />
                    <button
                        type="button"
                        onClick={onLogout}
                        className={`flex-shrink-0 text-white border border-red-400/80 bg-red-500/25 rounded-lg font-semibold cursor-pointer font-sans whitespace-nowrap ${isMobile ? 'px-2.5 py-1.5 text-[0.78rem]' : 'px-3.5 py-2 text-[0.85rem]'}`}
                    >
                        🔒 Logout
                    </button>
                </div>
            ) : (
            <nav className={isMobile ? 'w-full overflow-visible' : 'w-auto overflow-visible'}>
                {/* Mobile: real CSS grid (1 col below Tailwind's sm breakpoint, 2 cols
                    from sm up) instead of the old flex-wrap + `flex-basis: calc(50% - 10px)`
                    layout. That fixed 2-column split ignored how narrow the viewport
                    actually was, so on real small phones (~360px) two pill buttons plus
                    their gap didn't fit and both the buttons and their nowrap text got
                    clipped. A grid_cols-1 default means every button gets the full
                    width on narrow phones — no forced second column until there's
                    actually room for it. */}
                <ul className={isMobile
                    ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5 list-none m-0 p-0'
                    : 'flex flex-wrap gap-2.5 list-none m-0 p-0'}>
                    {(isAdmin || isPrincipal || isSuperuser) ? (
                        <>
                            <li>
                                <Link className={`${NAV_LINK_BASE} ${isMobile ? 'w-full' : 'w-auto'} bg-emerald-500/25 border-emerald-500/55`} to={(isAdmin || isSuperuser) ? '/' : '/command-center'}>🏠 home</Link>
                            </li>
                            {(isAdmin || isSuperuser) && adminWorkingLinks.map((item) => (
                                <li key={item.to}>
                                    <Link className={`${NAV_LINK_BASE} ${isMobile ? 'w-full' : 'w-auto'}`} to={item.to}>{item.label}</Link>
                                </li>
                            ))}
                            {isSuperuser && superuserExtraLinks.map((item) => (
                                <li key={item.to}>
                                    <Link className={`${NAV_LINK_BASE} ${isMobile ? 'w-full' : 'w-auto'} bg-yellow-400/20 border-yellow-400/55`} to={item.to}>{item.label}</Link>
                                </li>
                            ))}
                            {(isAdmin || isSuperuser ? [adminUpcomingGroup] : principalNav).map((group) => {
                                const isOpen = openGroup === group.key;
                                const isUpcomingDisabled = group.key === 'upcoming' && !isSuperuser;
                                return (
                                    <li
                                        key={group.key}
                                        className="relative"
                                        onMouseEnter={() => { if (!isMobile) { cancelClose(); openDropdown(group.key); } }}
                                        onMouseLeave={() => { if (!isMobile) scheduleClose(); }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setOpenGroup(isOpen ? null : group.key)}
                                            className={`${NAV_LINK_BASE} ${isMobile ? 'w-full' : 'w-auto'} ${isUpcomingDisabled ? 'bg-white/5 border-2 border-dashed border-white/40' : ''}`}
                                        >
                                            {group.label} ▾
                                        </button>
                                        {isOpen && (
                                            <div
                                                onMouseEnter={cancelClose}
                                                onMouseLeave={scheduleClose}
                                                className={`z-30 ${isMobile ? 'static pt-2 w-full' : 'absolute top-full left-0 pt-1.5 min-w-[220px] w-auto'}`}
                                            >
                                                <div className="bg-slate-50 border border-blue-200 rounded-card p-2 shadow-[0_12px_24px_rgba(15,23,42,0.2)]">
                                                    {isUpcomingDisabled && (
                                                        <p className="mx-1.5 mt-0.5 mb-2 text-subtle text-[0.72rem] font-semibold">Not yet finished — disabled for now.</p>
                                                    )}
                                                    {group.items.map((item) => (
                                                        isUpcomingDisabled ? (
                                                            <span
                                                                key={item.to}
                                                                className={`${DROPDOWN_ITEM} text-subtle bg-slate-100 cursor-not-allowed`}
                                                            >
                                                                {item.label}
                                                            </span>
                                                        ) : (
                                                            <Link
                                                                key={item.to}
                                                                to={item.to}
                                                                onClick={() => setOpenGroup(null)}
                                                                className={DROPDOWN_ITEM}
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
                        <li className="min-w-[220px]">
                            <Link className={`${NAV_LINK_BASE} w-full bg-emerald-500/25 border-emerald-500/55`} to="/teachers">
                                👩‍🏫 Teachers Portal
                            </Link>
                        </li>
                    )}
                    <li className={`flex items-center ${isMobile ? 'justify-center' : 'justify-start'}`}>
                        <FontSizeControl variant="dark" />
                    </li>
                    <li>
                        <button
                            type="button"
                            onClick={onLogout}
                            className={`${NAV_LINK_BASE} ${isMobile ? 'w-full' : 'w-auto'} border-2 border-red-400/80 bg-red-500/25`}
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
