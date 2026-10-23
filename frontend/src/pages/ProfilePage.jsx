import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  MapPin,
  Calendar,
  Bookmark,
  Heart,
  MessageSquare,
  PlusCircle,
  Edit3,
  Trash2,
  Compass,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/common/ConfirmModal';
import EmptyState from '../components/common/EmptyState';
import ErrorBanner from '../components/common/ErrorBanner';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';

export default function ProfilePage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('trips'); // 'trips' | 'wishlist'
  const { addToast } = useToast();

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, title }
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getProfile();
      setProfile(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load user profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authUser) {
      fetchProfile();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authUser, authLoading]);

  const handleRemoveBookmark = async (destinationId, title) => {
    try {
      await api.toggleBookmark(destinationId);
      setProfile((prev) => ({
        ...prev,
        stats: {
          ...prev.stats,
          saved_destinations_count: Math.max(0, prev.stats.saved_destinations_count - 1)
        },
        saved_destinations: prev.saved_destinations.filter((d) => d.id !== destinationId)
      }));
      addToast(`Removed ${title} from saved wishlist.`, 'info');
    } catch (err) {
      addToast(err.message || 'Failed to remove bookmark.', 'error');
    }
  };

  const handleDeleteTripConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.deleteTrip(deleteTarget.id);
      setProfile((prev) => ({
        ...prev,
        stats: {
          ...prev.stats,
          trips_count: Math.max(0, prev.stats.trips_count - 1)
        },
        trips: prev.trips.filter((t) => t.id !== deleteTarget.id)
      }));
      addToast(`Trip "${deleteTarget.title}" deleted.`, 'info');
    } catch (err) {
      addToast(err.message || 'Failed to delete trip.', 'error');
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  if (authLoading || (authUser && loading)) {
    return (
      <div className="container" style={{ paddingTop: 'var(--space-12)', textAlign: 'center' }}>
        <p>Loading profile and travel journal...</p>
      </div>
    );
  }

  // Anonymous user prompt
  if (!authUser) {
    return (
      <div className="container" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-20)', textAlign: 'center' }}>
        <div style={{
          maxWidth: '520px',
          margin: '0 auto',
          background: '#FFFFFF',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-10) var(--space-8)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--color-sand)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-5)',
            border: '1px solid var(--color-border)'
          }}>
            <User size={32} color="var(--color-terracotta)" />
          </div>

          <h2 style={{ fontSize: '1.85rem', marginBottom: '12px' }}>Your Travel Journal</h2>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '1rem', lineHeight: '1.6', marginBottom: 'var(--space-8)' }}>
            Sign in with Google to view your curated itineraries, saved destination wishlist, and slow travel memories.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleSignInButton
              text="continue_with"
              theme="outline"
              size="large"
              shape="pill"
              width={260}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container" style={{ paddingTop: 'var(--space-12)' }}>
        <ErrorBanner message={error || 'Unable to load profile.'} onRetry={fetchProfile} />
      </div>
    );
  }

  const { user, stats, trips = [], saved_destinations = [] } = profile;

  return (
    <div className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-20)' }}>
      {/* Profile Header Card */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-8)',
        marginBottom: 'var(--space-8)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
          <img
            src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
            alt={user.name}
            style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-sand)' }}
          />

          <div style={{ flex: 1, minWidth: '240px' }}>
              <span className="badge badge-terracotta">
                {user.email?.endsWith('.local') ? 'Demo Traveler' : 'Traveler'}
              </span>
            <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>{user.name}</h1>
            <div style={{ color: 'var(--color-ink-muted)', fontSize: '0.925rem', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <span>@{user.username}</span>
              {user.home_city && (
                <>
                  <span>•</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} color="var(--color-terracotta)" />
                    {user.home_city}
                  </span>
                </>
              )}
              <span>•</span>
              <span>{user.email}</span>
            </div>

            {user.bio && (
              <p style={{ maxWidth: '640px', fontSize: '0.95rem', color: 'var(--color-ink)' }}>
                "{user.bio}"
              </p>
            )}
          </div>

          <div>
            <Link to="/trips/new" className="btn btn-primary">
              <PlusCircle size={16} />
              <span>Plan a Trip</span>
            </Link>
          </div>
        </div>

        {/* Travel Stats Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 'var(--space-4)',
          marginTop: 'var(--space-8)',
          paddingTop: 'var(--space-6)',
          borderTop: '1px solid var(--color-border)'
        }}>
          <div style={{ textAlign: 'center', padding: '12px', background: 'var(--color-sand)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.85rem', fontWeight: 600, color: 'var(--color-ink)' }}>
              {stats.trips_count}
            </div>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-ink-muted)', letterSpacing: '0.04em' }}>
              Itineraries Created
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '12px', background: 'var(--color-sand)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.85rem', fontWeight: 600, color: 'var(--color-terracotta)' }}>
              {stats.saved_destinations_count}
            </div>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-ink-muted)', letterSpacing: '0.04em' }}>
              Saved Wishlist
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '12px', background: 'var(--color-sand)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.85rem', fontWeight: 600, color: 'var(--color-sage)' }}>
              {stats.likes_received_count}
            </div>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-ink-muted)', letterSpacing: '0.04em' }}>
              Likes Received
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '12px', background: 'var(--color-sand)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.85rem', fontWeight: 600, color: 'var(--color-ink)' }}>
              {stats.comments_posted_count}
            </div>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-ink-muted)', letterSpacing: '0.04em' }}>
              Traveler Notes
            </div>
          </div>
        </div>
      </div>

      {/* Profile Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-border)' }}>
        <button
          onClick={() => setActiveTab('trips')}
          style={{
            padding: '10px 18px',
            fontSize: '1rem',
            fontWeight: 600,
            borderBottom: activeTab === 'trips' ? '3px solid var(--color-terracotta)' : '3px solid transparent',
            color: activeTab === 'trips' ? 'var(--color-ink)' : 'var(--color-ink-muted)',
            cursor: 'pointer'
          }}
        >
          My Planned Itineraries ({trips.length})
        </button>

        <button
          onClick={() => setActiveTab('wishlist')}
          style={{
            padding: '10px 18px',
            fontSize: '1rem',
            fontWeight: 600,
            borderBottom: activeTab === 'wishlist' ? '3px solid var(--color-terracotta)' : '3px solid transparent',
            color: activeTab === 'wishlist' ? 'var(--color-ink)' : 'var(--color-ink-muted)',
            cursor: 'pointer'
          }}
        >
          Saved Wishlist ({saved_destinations.length})
        </button>
      </div>

      {/* Tab 1: My Trips */}
      {activeTab === 'trips' && (
        <div>
          {trips.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="No itineraries created yet"
              description="Start mapping out your next slow travel journey with custom stops, categories, and budgets."
              action={
                <Link to="/trips/new" className="btn btn-primary btn-sm">
                  Create First Itinerary
                </Link>
              }
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {trips.map((t) => (
                <div
                  key={t.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', color: 'var(--color-ink-muted)', marginBottom: '4px' }}>
                      <Calendar size={13} color="var(--color-terracotta)" />
                      <span>{t.start_date} to {t.end_date}</span>
                      {t.destination_title && (
                        <>
                          <span>•</span>
                          <span>{t.destination_title}</span>
                        </>
                      )}
                      {t.visibility && (
                        <>
                          <span>•</span>
                          <span className={`badge ${t.visibility === 'unlisted' ? 'badge-ochre' : t.visibility === 'private' ? 'badge-sand' : 'badge-sage'}`} style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                            {t.visibility === 'unlisted' ? 'Unlisted' : t.visibility === 'private' ? 'Private' : 'Public'}
                          </span>
                        </>
                      )}
                    </div>

                    <h3 style={{ fontSize: '1.25rem', margin: '2px 0 6px' }}>
                      <Link to={`/trips/${t.id}`} style={{ color: 'var(--color-ink)' }}>
                        {t.title}
                      </Link>
                    </h3>

                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
                      <span>Budget: ${Number(t.estimated_budget || 0).toLocaleString()} {t.currency}</span>
                      <span>•</span>
                      <span>{t.stops_count || 0} scheduled stops</span>
                      <span>•</span>
                      <span>{t.likes_count || 0} likes</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link to={`/trips/${t.id}`} className="btn btn-sand btn-sm">
                      View
                    </Link>
                    <Link to={`/trips/${t.id}/edit`} className="btn btn-outline btn-sm">
                      <Edit3 size={14} />
                      <span>Edit</span>
                    </Link>
                    <button
                      onClick={() => setDeleteTarget({ id: t.id, title: t.title })}
                      className="btn btn-danger btn-sm"
                      title="Delete trip"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Saved Wishlist */}
      {activeTab === 'wishlist' && (
        <div>
          {saved_destinations.length === 0 ? (
            <EmptyState
              icon={Bookmark}
              title="Your wishlist is empty"
              description="Browse through the catalog and click the bookmark icon to save dream destinations for later."
              action={
                <Link to="/destinations" className="btn btn-primary btn-sm">
                  Explore Destinations
                </Link>
              }
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-6)' }}>
              {saved_destinations.map((d) => (
                <div
                  key={d.id}
                  className="editorial-card"
                  style={{ position: 'relative' }}
                >
                  <Link to={`/destinations/${d.id}`} className="img-wrap" style={{ aspectRatio: '16/10' }}>
                    <img
                      src={d.cover_image}
                      alt={d.title}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                  </Link>

                  <div className="card-body">
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)', marginBottom: '4px' }}>
                      {d.country} ({d.continent})
                    </div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>
                      <Link to={`/destinations/${d.id}`} style={{ color: 'var(--color-ink)' }}>
                        {d.title}
                      </Link>
                    </h3>
                    <p style={{ fontSize: '0.85rem', marginBottom: '16px', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {d.tagline}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                      <Link to={`/destinations/${d.id}`} style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-terracotta)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span>Explore</span>
                        <ArrowRight size={13} />
                      </Link>

                      <button
                        onClick={() => handleRemoveBookmark(d.id, d.title)}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Itinerary"
        message={deleteTarget ? `Are you sure you want to permanently delete "${deleteTarget.title}"?` : ''}
        confirmLabel="Delete Trip"
        loading={deleteLoading}
        onConfirm={handleDeleteTripConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
