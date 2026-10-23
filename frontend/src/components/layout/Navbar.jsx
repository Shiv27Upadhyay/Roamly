import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Compass, Menu, X, PlusCircle, User, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Navbar() {
  const { user, logout, openAuthModal } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const closeMenu = () => setMobileOpen(false);

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    addToast('Logged out successfully.', 'info');
    navigate('/');
  };

  const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';

  return (
    <header className="site-navbar">
      <div className="container nav-inner">
        {/* Brand */}
        <Link to="/" className="nav-brand" onClick={closeMenu}>
          <Compass size={28} color="var(--color-terracotta)" strokeWidth={2.2} />
          <span>Roamly<span className="brand-dot">.</span></span>
        </Link>

        {/* Desktop Links */}
        <nav>
          <ul className="nav-links">
            <li>
              <NavLink to="/destinations" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Discover
              </NavLink>
            </li>
            <li>
              <NavLink to="/trips" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Itineraries
              </NavLink>
            </li>
            <li>
              <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Profile &amp; Wishlist
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* CTA & Profile/Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <Link to="/trips/new" className="btn btn-primary btn-sm" style={{ display: 'inline-flex' }}>
            <PlusCircle size={16} />
            <span>Plan a Trip</span>
          </Link>

          {user ? (
            <div className="nav-user-wrapper" ref={dropdownRef}>
              <button
                className="nav-user-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="User Account Menu"
                aria-expanded={dropdownOpen}
                title={user.name}
              >
                <img
                  src={user.avatar_url || defaultAvatar}
                  alt={user.name}
                  className="nav-user-avatar"
                  onError={(e) => { e.target.src = defaultAvatar; }}
                />
              </button>

              {dropdownOpen && (
                <div className="nav-user-dropdown" role="menu">
                  <div className="user-header">
                    <div className="user-name">{user.name}</div>
                    <div className="user-email">{user.email}</div>
                  </div>

                  <Link
                    to="/profile"
                    className="nav-dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                    role="menuitem"
                  >
                    <User size={16} color="var(--color-terracotta)" />
                    <span>My Profile &amp; Wishlist</span>
                  </Link>

                  <Link
                    to="/trips/new"
                    className="nav-dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                    role="menuitem"
                  >
                    <PlusCircle size={16} color="var(--color-sage)" />
                    <span>Plan a Trip</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="nav-dropdown-item logout"
                    role="menuitem"
                  >
                    <LogOut size={16} />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => openAuthModal('Sign in with Google to explore, plan, and save itineraries.')}
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', gap: '6px' }}
              aria-label="Sign In with Google"
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            className="nav-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="mobile-nav-menu open">
          {user ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--color-border)',
              marginBottom: '4px'
            }}>
              <img
                src={user.avatar_url || defaultAvatar}
                alt={user.name}
                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-border)' }}
                onError={(e) => { e.target.src = defaultAvatar; }}
              />
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-ink)' }}>{user.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                closeMenu();
                openAuthModal('Sign in with Google to explore, plan, and save itineraries.');
              }}
              className="btn btn-outline"
              style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <LogIn size={18} />
              <span>Sign in with Google</span>
            </button>
          )}

          <NavLink
            to="/destinations"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Discover Destinations
          </NavLink>
          <NavLink
            to="/trips"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Trip Itineraries
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMenu}
          >
            My Profile &amp; Wishlist
          </NavLink>

          <Link
            to="/trips/new"
            className="btn btn-primary"
            onClick={closeMenu}
            style={{ marginTop: '0.5rem' }}
          >
            <PlusCircle size={18} />
            <span>Plan a New Trip</span>
          </Link>

          {user && (
            <button
              onClick={() => {
                closeMenu();
                handleLogout();
              }}
              className="btn btn-danger btn-sm"
              style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <LogOut size={16} />
              <span>Log Out</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
}
