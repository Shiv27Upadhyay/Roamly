import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Bookmark, MapPin, Calendar, IndianRupee, PlusCircle, ArrowLeft, Layers, Heart, MessageSquare } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DetailSkeleton } from '../components/common/LoadingSkeleton';
import ErrorBanner from '../components/common/ErrorBanner';
import { formatCurrency, formatBudgetTier } from '../utils/currency';

export default function DestinationDetailPage() {
  const { id } = useParams();
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const { user, openAuthModal } = useAuth();
  const { addToast } = useToast();

  const fetchDestination = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDestinationById(id);
      setDestination(res.data);
    } catch (err) {
      setError(err.message || 'Destination not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestination();
  }, [id, user]);

  const handleBookmarkToggle = async () => {
    if (!destination || bookmarkLoading) return;

    if (!user) {
      openAuthModal('Sign in with Google to save destinations to your wishlist.');
      return;
    }

    setBookmarkLoading(true);
    try {
      const res = await api.toggleBookmark(destination.id);
      const newState = res.data.bookmarked;
      setDestination((prev) => ({ ...prev, is_bookmarked: newState }));
      if (newState) {
        addToast(`Saved ${destination.title} to your wishlist!`, 'success');
      } else {
        addToast(`Removed ${destination.title} from your wishlist.`, 'info');
      }
    } catch (err) {
      if (err.status === 401) {
        openAuthModal('Your session has expired. Please sign in to update bookmarks.');
      } else {
        addToast(err.message || 'Failed to update bookmark.', 'error');
      }
    } finally {
      setBookmarkLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-16)' }}>
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !destination) {
    return (
      <div className="container" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-16)', textAlign: 'center' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '12px' }}>Destination Not Found</h2>
          <p style={{ marginBottom: '24px', color: 'var(--color-ink-muted)' }}>
            {error || `We couldn't locate a destination with identifier #${id}.`}
          </p>
          <Link to="/destinations" className="btn btn-primary btn-sm">
            <ArrowLeft size={16} />
            <span>Back to All Destinations</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 'var(--space-20)' }}>
      {/* Back Link */}
      <div className="container" style={{ paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-4)' }}>
        <Link to="/destinations" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--color-ink-muted)' }}>
          <ArrowLeft size={16} />
          <span>Back to Destinations</span>
        </Link>
      </div>

      {/* Hero Photography Banner */}
      <div style={{ position: 'relative', width: '100%', height: '460px', overflow: 'hidden', background: 'var(--color-ink)' }}>
        <img
          src={destination.cover_image}
          alt={destination.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.88 }}
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80';
          }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(28,36,33,0.85) 0%, rgba(28,36,33,0.2) 60%, transparent 100%)'
        }} />

        <div className="container" style={{ position: 'absolute', bottom: '32px', left: 0, right: 0, color: 'var(--color-ivory)' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <span className="badge badge-sand" style={{ background: 'rgba(250,247,242,0.95)', color: 'var(--color-ink)' }}>
              {destination.continent}
            </span>
            <span className="badge badge-ochre" style={{ background: 'rgba(217,158,75,0.9)', color: 'var(--color-ink)' }}>
              {formatBudgetTier(destination.budget_tier)} Tier
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(250,247,242,0.85)', marginBottom: '8px', fontSize: '1.05rem' }}>
            <MapPin size={18} color="var(--color-terracotta)" />
            <span>{destination.country}</span>
          </div>

          <h1 style={{ color: 'var(--color-ivory)', marginBottom: '8px' }}>
            {destination.title}
          </h1>

          <p style={{ color: 'rgba(250,247,242,0.9)', fontSize: '1.2rem', fontStyle: 'italic', maxWidth: '720px' }}>
            "{destination.tagline}"
          </p>
        </div>
      </div>

      {/* Main Content & Actions */}
      <div className="container" style={{ paddingTop: 'var(--space-8)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)', gap: 'var(--space-12)' }}>
          {/* Left Column: Overview, Highlights & Itineraries */}
          <div>
            <section style={{ marginBottom: 'var(--space-8)' }}>
              <h2 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-4)' }}>About this Place</h2>
              <p style={{ fontSize: '1.1rem', lineHeight: '1.75', color: 'var(--color-ink-muted)' }}>
                {destination.description}
              </p>
            </section>

            {/* Tags / Highlights */}
            {destination.tags && destination.tags.length > 0 && (
              <section style={{ marginBottom: 'var(--space-10)' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-3)' }}>Travel Highlights</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {destination.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: 'var(--color-sand)',
                        color: 'var(--color-ink)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Associated Community Trips */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                <h3 style={{ fontSize: '1.35rem' }}>Community Trips in {destination.title}</h3>
                <Link to={`/trips/new?destination_id=${destination.id}`} className="btn btn-outline btn-sm">
                  <PlusCircle size={15} />
                  <span>Create Itinerary</span>
                </Link>
              </div>

              {destination.associated_trips && destination.associated_trips.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {destination.associated_trips.map((trip) => (
                    <div
                      key={trip.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        background: '#FFFFFF',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <div>
                        <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>
                          <Link to={`/trips/${trip.id}`} style={{ color: 'var(--color-ink)' }}>
                            {trip.title}
                          </Link>
                        </h4>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)', display: 'flex', gap: '12px' }}>
                          <span>By {trip.author_name}</span>
                          <span>•</span>
                          <span>{formatCurrency(trip.estimated_budget, trip.currency || 'INR')}</span>
                        </div>
                      </div>

                      <Link to={`/trips/${trip.id}`} className="btn btn-sand btn-sm">
                        View Trip
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '24px', background: 'var(--color-sand)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <p style={{ marginBottom: '12px' }}>No community trips recorded for this destination yet.</p>
                  <Link to={`/trips/new?destination_id=${destination.id}`} className="btn btn-primary btn-sm">
                    Be the first to plan an itinerary here
                  </Link>
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Travel Quick Guide & Planner CTA Card */}
          <div>
            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-sm)',
              position: 'sticky',
              top: '96px'
            }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: 'var(--space-4)' }}>Quick Travel Guide</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: 'var(--space-6)' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-ink-muted)', fontWeight: 600 }}>
                    Best Travel Season
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1rem', fontWeight: 500, marginTop: '2px' }}>
                    <Calendar size={16} color="var(--color-terracotta)" />
                    <span>{destination.season}</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-ink-muted)', fontWeight: 600 }}>
                    Budget Classification
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1rem', fontWeight: 500, marginTop: '2px' }}>
                    <IndianRupee size={16} color="var(--color-sage)" />
                    <span>
                      {destination.budget_tier === '$' && '₹ (Budget Friendly)'}
                      {destination.budget_tier === '$$' && '₹₹ (Moderate Range)'}
                      {destination.budget_tier === '$$$' && '₹₹₹ (Luxury / Premium)'}
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-ink-muted)', fontWeight: 600 }}>
                    Continent / Region
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 500, marginTop: '2px' }}>
                    {destination.continent}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link
                  to={`/trips/new?destination_id=${destination.id}`}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  <PlusCircle size={18} />
                  <span>Plan a Trip Here</span>
                </Link>

                <button
                  onClick={handleBookmarkToggle}
                  disabled={bookmarkLoading}
                  className={`btn ${destination.is_bookmarked ? 'btn-sand' : 'btn-outline'}`}
                  style={{ width: '100%' }}
                >
                  <Bookmark
                    size={18}
                    fill={destination.is_bookmarked ? 'var(--color-terracotta)' : 'none'}
                    color={destination.is_bookmarked ? 'var(--color-terracotta)' : 'currentColor'}
                  />
                  <span>{destination.is_bookmarked ? 'Saved in Wishlist' : 'Save to Wishlist'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
