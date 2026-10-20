import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Compass, Menu, X, PlusCircle, Bookmark, Map, User } from 'lucide-react';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMenu = () => setMobileOpen(false);

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
                Profile & Wishlist
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* CTA & Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/trips/new" className="btn btn-primary btn-sm" style={{ display: 'inline-flex' }}>
            <PlusCircle size={16} />
            <span>Plan a Trip</span>
          </Link>

          <Link to="/profile" title="View Elena Rostova's Profile" aria-label="User Profile">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
              alt="Elena Rostova"
              className="nav-user-avatar"
            />
          </Link>

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
            My Profile & Wishlist
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
        </div>
      )}
    </header>
  );
}
