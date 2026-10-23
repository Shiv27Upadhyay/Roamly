import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Sparkles, Heart } from 'lucide-react';
import { api } from '../services/api';
import DestinationCard from '../components/common/DestinationCard';
import TripCard from '../components/common/TripCard';
import { GridSkeleton } from '../components/common/LoadingSkeleton';
import ErrorBanner from '../components/common/ErrorBanner';
import heroImage from '../assets/hero.png';

export default function HomePage() {
  const [destinations, setDestinations] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [isHeroFading, setIsHeroFading] = useState(false);
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

  // Task 3: Cycle featured destination every 6 seconds unless hovered or keyboard-focused
  useEffect(() => {
    if (!destinations || destinations.length <= 1 || isHeroPaused) return;

    const timer = setInterval(() => {
      setIsHeroFading(true);
      setTimeout(() => {
        setFeaturedIndex((prev) => (prev + 1) % destinations.length);
        setIsHeroFading(false);
      }, 240);
    }, 6000);

    return () => clearInterval(timer);
  }, [destinations, isHeroPaused]);

  // Current featured destination from real API data
  const currentFeatured = useMemo(() => {
    if (!destinations || destinations.length === 0) return null;
    return destinations[featuredIndex % destinations.length] || destinations[0];
  }, [destinations, featuredIndex]);

  // Task 4 & Task 5: Dynamic Most-Liked Editor's Pick with deterministic tie-breaking
  const editorTrip = useMemo(() => {
    if (!trips || trips.length === 0) return null;
    return [...trips].sort((a, b) => {
      // 1. Primary: highest likes_count
      const likesDiff = (Number(b.likes_count) || 0) - (Number(a.likes_count) || 0);
      if (likesDiff !== 0) return likesDiff;

      // 2. Deterministic Tie-Breaker 1: highest stops_count (more complete itinerary)
      const stopsDiff = (Number(b.stops_count) || 0) - (Number(a.stops_count) || 0);
      if (stopsDiff !== 0) return stopsDiff;

      // 3. Deterministic Tie-Breaker 2: lowest ID (earliest curated itinerary)
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    })[0];
  }, [trips]);

  // Related destination for the Editor's Pick
  const editorDestination = useMemo(() => {
    if (!editorTrip || !destinations) return null;
    return destinations.find((d) => d.id === editorTrip.destination_id) || null;
  }, [editorTrip, destinations]);

  // Task 4: Resolve notes cleanly without displaying literal "na" or leaving empty
  const editorTripNotes = useMemo(() => {
    if (!editorTrip) return '';
    const rawNotes = (editorTrip.notes || '').trim();
    if (rawNotes && rawNotes.toLowerCase() !== 'na' && rawNotes.toLowerCase() !== 'n/a') {
      return rawNotes;
    }
    if (editorDestination?.tagline) {
      return editorDestination.tagline;
    }
    if (editorDestination?.description) {
      return editorDestination.description;
    }
    return 'Slow-travel itinerary with curated morning walks, artisan studio visits, and regional culinary dining.';
  }, [editorTrip, editorDestination]);

  const editorTripImage = editorTrip?.cover_image || editorDestination?.cover_image || heroImage;

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

          {/* Hero Showcase Photo with Rotating Featured Destination */}
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setIsHeroPaused(true)}
            onMouseLeave={() => setIsHeroPaused(false)}
          >
            <Link
              to={currentFeatured ? `/destinations/${currentFeatured.id}` : '/destinations'}
              aria-label={currentFeatured ? `Featured Destination: ${currentFeatured.title}, ${currentFeatured.country}. Explore details.` : 'Featured Destination'}
              onFocus={() => setIsHeroPaused(true)}
              onBlur={() => setIsHeroPaused(false)}
              style={{
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-lg)',
                border: '4px solid var(--color-ivory)',
                aspectRatio: '4/3',
                backgroundColor: 'var(--color-sand)',
                position: 'relative'
              }}
            >
              <img
                src={currentFeatured?.cover_image || heroImage}
                alt={currentFeatured ? `${currentFeatured.title}, ${currentFeatured.country}` : 'Featured Destination'}
                onError={(e) => {
                  if (e.currentTarget.src !== heroImage) {
                    e.currentTarget.src = heroImage;
                  }
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: isHeroFading ? 0.35 : 1,
                  transform: isHeroPaused ? 'scale(1.02)' : 'scale(1)',
                  transition: 'opacity 240ms ease-in-out, transform 400ms ease'
                }}
              />
            </Link>

            {/* Editorial Caption Card */}
            <div
              style={{
                position: 'absolute',
                bottom: '-24px',
                left: '-24px',
                background: 'var(--color-ivory)',
                padding: '16px 20px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-md)',
                maxWidth: '280px',
                pointerEvents: 'auto'
              }}
            >
              <div style={{ marginBottom: '4px' }}>
                <span style={{ fontSize: '0.725rem', textTransform: 'uppercase', color: 'var(--color-terracotta)', fontWeight: 700, letterSpacing: '0.06em' }}>
                  Featured Destination
                </span>
              </div>

              <Link
                to={currentFeatured ? `/destinations/${currentFeatured.id}` : '/destinations'}
                onFocus={() => setIsHeroPaused(true)}
                onBlur={() => setIsHeroPaused(false)}
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  color: 'var(--color-ink)',
                  display: 'block',
                  textDecoration: 'none',
                  lineHeight: 1.25,
                  marginBottom: '4px'
                }}
              >
                {currentFeatured ? `${currentFeatured.title}, ${currentFeatured.country}` : 'Kyoto, Japan'}
              </Link>

              <div style={{
                fontSize: '0.8rem',
                color: 'var(--color-ink-muted)',
                lineHeight: 1.35,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {currentFeatured ? (currentFeatured.tagline || currentFeatured.description) : 'Autumn temples & kaiseki dinners'}
              </div>

              {/* Accessible rotation indicators */}
              {destinations.length > 1 && (
                <div
                  style={{ display: 'flex', gap: '5px', alignItems: 'center', marginTop: '10px' }}
                  role="tablist"
                  aria-label="Featured destinations"
                >
                  {destinations.map((d, idx) => {
                    const isSelected = idx === (featuredIndex % destinations.length);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        aria-label={`Featured destination: ${d.title}, ${d.country}`}
                        onClick={() => {
                          setFeaturedIndex(idx);
                        }}
                        onFocus={() => setIsHeroPaused(true)}
                        onBlur={() => setIsHeroPaused(false)}
                        style={{
                          width: isSelected ? '18px' : '6px',
                          height: '6px',
                          borderRadius: 'var(--radius-pill)',
                          backgroundColor: isSelected ? 'var(--color-terracotta)' : 'var(--color-border-dark)',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          transition: 'all 200ms ease'
                        }}
                      />
                    );
                  })}
                </div>
              )}
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
              <span>View All {destinations.length > 0 ? destinations.length : 8} Destinations</span>
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

        {/* 2. Editorial Highlight Banner: Dynamic Most-Liked Trip Showcase */}
        {editorTrip && (
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
                <span style={{ fontSize: '0.8rem', color: 'rgba(250,247,242,0.6)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Heart size={13} fill="var(--color-terracotta)" color="var(--color-terracotta)" />
                  {editorTrip.likes_count ?? 0} {editorTrip.likes_count === 1 ? 'like' : 'likes'}
                </span>
              </div>
              <h3 style={{ color: 'var(--color-ivory)', fontSize: '2rem', marginBottom: '12px' }}>
                {editorTrip.title}
              </h3>
              <p style={{ color: 'rgba(250,247,242,0.8)', fontSize: '1.05rem', marginBottom: '20px' }}>
                {editorTripNotes}
              </p>
              <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', fontSize: '0.9rem', color: 'rgba(250,247,242,0.7)', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: 'rgba(250,247,242,0.5)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Author</div>
                  <div style={{ color: '#fff', fontWeight: 600 }}>{editorTrip.author_name || 'Roamly Curator'}</div>
                </div>
                <div>
                  <div style={{ color: 'rgba(250,247,242,0.5)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Budget</div>
                  <div style={{ color: '#fff', fontWeight: 600 }}>${Number(editorTrip.estimated_budget || 0).toLocaleString()} USD</div>
                </div>
                <div>
                  <div style={{ color: 'rgba(250,247,242,0.5)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Itinerary Stops</div>
                  <div style={{ color: '#fff', fontWeight: 600 }}>{editorTrip.stops_count ?? 0} places</div>
                </div>
              </div>
              <Link to={`/trips/${editorTrip.id}`} className="btn btn-primary">
                <span>Explore Full Itinerary &amp; Timeline</span>
                <ArrowRight size={16} />
              </Link>
            </div>
            <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid rgba(250,247,242,0.2)', aspectRatio: '16/10', backgroundColor: '#2C3531' }}>
              <img
                src={editorTripImage}
                alt={editorTrip.title}
                onError={(e) => {
                  if (e.currentTarget.src !== heroImage) {
                    e.currentTarget.src = heroImage;
                  }
                }}
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
