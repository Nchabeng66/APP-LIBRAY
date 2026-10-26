import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext.jsx';
import { Toast } from './uiComponents.jsx';

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/', end: true },
  { label: 'Book Management', to: '/books', staffOnly: true },
  { label: 'Transactions', to: '/transactions' },
  { label: 'Online Books', to: '/online' },
  { label: 'User Management', to: '/users', staffOnly: true },
  { label: 'Membership', to: '/members' },
];

export default function Layout() {
  const { isAuthenticated, isStaff, logout } = useLibrary();
  const [menuOpen, setMenuOpen] = useState(false);

  const items = !isAuthenticated
    ? NAV_ITEMS.filter((item) => item.to === '/members')
    : NAV_ITEMS.filter((item) => !item.staffOnly || isStaff);

  return (
    <div className="app-shell">
      <nav className="sidebar" aria-label="Main navigation">
        <div className="brand">
          <span className="brand-mark">Community Library</span>
          <span className="brand-sub">
            {isAuthenticated ? 'Catalog & Circulation' : 'Please log in to continue'}
          </span>
        </div>

        <button
          type="button"
          className="menu-toggle"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? 'Close Menu' : 'Menu'}
        </button>

        <ul className={`nav-list${menuOpen ? ' open' : ''}`}>
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
              >
                {!isAuthenticated && item.to === '/members' ? 'Log In / Sign Up' : item.label}
              </NavLink>
            </li>
          ))}
          {isAuthenticated && (
            <li>
              <button type="button" className="nav-tab nav-logout" onClick={logout}>
                Log Out
              </button>
            </li>
          )}
        </ul>

        <div className="sidebar-foot">
          <span>Community Library</span>
        </div>
      </nav>

      <main className="main">
        <Outlet />
      </main>

      <Toast />
    </div>
  );
}