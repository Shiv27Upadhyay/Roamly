import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          {/* Brand info */}
          <div className="footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Compass size={24} color="var(--color-terracotta)" />
              <h3 style={{ margin: 0 }}>Roamly</h3>
            </div>
            <p className="tagline">"Discover. Plan. Remember."</p>
            <p style={{ maxWidth: '380px', fontSize: '0.925rem' }}>
              A curated travel discovery and collaborative trip-planning journal designed with an editorial aesthetic for mindful travelers.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="footer-nav-col">
            <h4>Explore</h4>
            <ul>
              <li><Link to="/destinations">Curated Destinations</Link></li>
              <li><Link to="/trips">Community Itineraries</Link></li>
              <li><Link to="/trips/new">Trip Planner Studio</Link></li>
              <li><Link to="/profile">Saved Wishlist</Link></li>
            </ul>
          </div>

          {/* Architecture / Assignment specs */}
          <div className="footer-nav-col">
            <h4>Technology</h4>
            <ul>
              <li><span style={{ color: 'rgba(250,247,242,0.6)' }}>Frontend:</span> React 19 + Vite</li>
              <li><span style={{ color: 'rgba(250,247,242,0.6)' }}>Backend:</span> Express + Node.js 24</li>
              <li><span style={{ color: 'rgba(250,247,242,0.6)' }}>Database:</span> Native <code>node:sqlite</code></li>
              <li><span style={{ color: 'rgba(250,247,242,0.6)' }}>Storage:</span> Persistent <code>roamly.db</code></li>
            </ul>
          </div>
        </div>

        {/* Footer bottom */}
        <div className="footer-bottom">
          <div>
            &copy; 2026 Roamly Travel Journal. Full Stack Developer Internship Technical Assignment (Rewamp Digital).
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            Crafted with intentionality &amp; care
          </div>
        </div>
      </div>
    </footer>
  );
}
