import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Search, MapPin, Calendar, ArrowRight, Sparkles, Heart } from 'lucide-react';
import { api } from '../services/api';
import DestinationCard from '../components/common/DestinationCard';
import TripCard from '../components/common/TripCard';
import { GridSkeleton } from '../components/common/LoadingSkeleton';
import ErrorBanner from '../components/common/ErrorBanner';

export default function HomePage() {
  const [destinations, setDestinations] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [destsRes, tripsRes] = await Promise.all([
        api.getDestinations(),
        api.getTrips()
      ]);
      setDestinations(destsRes.data || []);
      setTrips(tripsRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load travel recommendations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/destinations?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/destinations');
    }
  };

  return (
    <div>
      {/* Editorial Hero Section */}
      <section style={{
        backgroundColor: 'var(--color-sand)',
        paddingTop: 'var(--space-16)',
        paddingBottom: 'var(--space-20)',
        borderBottom: '1px solid var(--color-border)',
        position: 'relative'
      }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: 'var(--space-12)', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: 'var(--radius-pill)', background: 'var(--color-ivory)', border: '1px solid var(--color-border)', marginBottom: 'var(--space-4)' }}>
              <Sparkles size={15} color="var(--color-terracotta)" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-ink)' }}>
                Editorial Travel Journal
              </span>
            </div>

            <h1 style={{ marginBottom: 'var(--space-4)', lineHeight: 1.15 }}>
              Slow journeys.<br />
              <span style={{ fontStyle: 'italic', color: 'var(--color-terracotta)' }}>Timeless places.</span>
            </h1>

            <p style={{ fontSize: '1.15rem', color: 'var(--color-ink-muted)', marginBottom: 'var(--space-8)', maxWidth: '540px' }}>
              Discover remarkable worldwide destinations, curate day-by-day itineraries, estimate budgets, and capture travel memories with a community of slow travelers.
            </p>

            {/* Quick Discovery Search Bar */}
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', maxWidth: '520px', background: '#fff', padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-dark)', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '12px', flex: 1 }}>
                <Search size={18} color="var(--color-ink-faint)" />
                <input
                  type="text"
                  placeholder="Where do you wish to wander? (e.g. Kyoto, Amalfi, temples...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.95rem' }}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm">
                <span>Discover</span>
                <ArrowRight size={15} />
              </button>
            </form>
          </div>

          {/* Hero Showcase Photo */}
          <div style={{ position: 'relative' }}>
            <div style={{
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
              border: '4px solid var(--color-ivory)',
              aspectRatio: '4/3'
            }}>
              <img
                src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1000&q=80"
                alt="Autumn in Kyoto"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            {/* Editorial Caption Card */}
            <div style={{
              position: 'absolute',
              bottom: '-24px',
              left: '-24px',
              background: 'var(--color-ivory)',
              padding: '16px 20px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-md)',
              maxWidth: '260px'
            }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-terracotta)', fontWeight: 700, letterSpacing: '0.06em' }}>
                Featured Destination
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-ink)' }}>
                Kyoto, Japan
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)' }}>
                Autumn temples &amp; kaiseki dinners
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="container" style={{ paddingTop: 'var(--space-16)', paddingBottom: 'var(--space-16)' }}>
        <ErrorBanner message={error} onRetry={fetchData} />

        {/* 1. Curated Destinations Section */}
        <section style={{ marginBottom: 'var(--space-20)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
            <div>
              <span className="eyebrow" style={{ color: 'var(--color-terracotta)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>
                Catalog Highlights
              </span>
              <h2>Curated Destinations</h2>
              <p style={{ maxWidth: '560px' }}>
                Handpicked places celebrated for character, artisan heritage, breathtaking landscapes, and distinctive dining.
              </p>
            </div>
            <Link to="/destinations" className="btn btn-outline btn-sm">
              <span>View All 8 Destinations</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          {loading ? (
            <GridSkeleton count={4} />
          ) : (
            <div className="grid-destinations">
              {destinations.slice(0, 4).map((dest) => (
                <DestinationCard key={dest.id} destination={dest} />
              ))}
            </div>
          )}
        </section>

        {/* 2. Editorial Highlight Banner: Kyoto Trip Showcase */}
        {trips.length > 0 && (
          <section style={{
            background: 'var(--color-ink)',
            color: 'var(--color-ivory)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-10) var(--space-12)',
            marginBottom: 'var(--space-20)',
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: 'var(--space-8)',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                <span className="badge badge-ochre" style={{ background: 'rgba(217, 158, 75, 0.25)', color: '#F1C67E', border: '1px solid rgba(217,158,75,0.4)' }}>
                  Editor's Pick Itinerary
                </span>
              </div>
              <h3 style={{ color: 'var(--color-ivory)', fontSize: '2rem', marginBottom: '12px' }}>
                {trips[0].title}
              </h3>
              <p style={{ color: 'rgba(250,247,242,0.8)', fontSize: '1.05rem', marginBottom: '20px' }}>
                {trips[0].notes}
              </p>
              <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', fontSize: '0.9rem', color: 'rgba(250,247,242,0.7)' }}>
                <div>
                  <div style={{ color: 'rgba(250,247,242,0.5)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Author</div>
                  <div style={{ color: '#fff', fontWeight: 600 }}>{trips[0].author_name}</div>
                </div>
                <div>
                  <div style={{ color: 'rgba(250,247,242,0.5)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Budget</div>
                  <div style={{ color: '#fff', fontWeight: 600 }}>${Number(trips[0].estimated_budget).toLocaleString()} USD</div>
                </div>
                <div>
                  <div style={{ color: 'rgba(250,247,242,0.5)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Itinerary Stops</div>
                  <div style={{ color: '#fff', fontWeight: 600 }}>{trips[0].stops_count} places</div>
                </div>
              </div>
              <Link to={`/trips/${trips[0].id}`} className="btn btn-primary">
                <span>Explore Full Itinerary &amp; Timeline</span>
                <ArrowRight size={16} />
              </Link>
            </div>
            <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid rgba(250,247,242,0.2)' }}>
              <img
                src={trips[0].cover_image || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80'}
                alt={trips[0].title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </section>
        )}

        {/* 3. Community Itineraries Section */}
        <section>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
            <div>
              <span className="eyebrow" style={{ color: 'var(--color-terracotta)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>
                Community Plans
              </span>
              <h2>Trending Travel Itineraries</h2>
              <p style={{ maxWidth: '560px' }}>
                Real journeys crafted by travelers with categorized stops, budget estimations, and insider tips.
              </p>
            </div>
            <Link to="/trips" className="btn btn-outline btn-sm">
              <span>View All Itineraries</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          {loading ? (
            <GridSkeleton count={3} />
          ) : (
            <div className="grid-trips">
              {trips.slice(0, 3).map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
