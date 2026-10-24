import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageSquare, Calendar, MapPin, Layers } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../utils/currency';

export default function TripCard({ trip, onLikeToggle }) {
  const [isLiked, setIsLiked] = useState(trip.is_liked);
  const [likesCount, setLikesCount] = useState(trip.likes_count || 0);
  const [loading, setLoading] = useState(false);
  const { user, openAuthModal } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    setIsLiked(trip.is_liked);
    setLikesCount(trip.likes_count || 0);
  }, [trip.is_liked, trip.likes_count]);

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      openAuthModal('Sign in with Google to like this itinerary.');
      return;
    }

    if (loading) return;

    setLoading(true);
    try {
      const res = await api.toggleTripLike(trip.id);
      setIsLiked(res.data.liked);
      setLikesCount(res.data.likes_count);
      if (res.data.liked) {
        addToast(`You liked "${trip.title}"`, 'success');
      }
      if (onLikeToggle) {
        onLikeToggle(trip.id, res.data.liked, res.data.likes_count);
      }
    } catch (err) {
      if (err.status === 401) {
        openAuthModal('Your session has expired. Please sign in to like this itinerary.');
      } else {
        addToast(err.message || 'Failed to update like.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (e) => {
    e.target.src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80';
  };

  // Format dates: 'Nov 4 – Nov 10, 2026'
  const formatDateRange = (start, end) => {
    try {
      const s = new Date(start + 'T00:00:00');
      const e = new Date(end + 'T00:00:00');
      const sMonth = s.toLocaleString('default', { month: 'short' });
      const eMonth = e.toLocaleString('default', { month: 'short' });
      if (sMonth === eMonth && s.getFullYear() === e.getFullYear()) {
        return `${sMonth} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`;
      }
      return `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}, ${e.getFullYear()}`;
    } catch {
      return `${start} – ${end}`;
    }
  };

  return (
    <article className="editorial-card">
      <div className="img-wrap" style={{ aspectRatio: '16/10' }}>
        <Link to={`/trips/${trip.id}`} aria-label={`View itinerary: ${trip.title}`} style={{ display: 'block', width: '100%', height: '100%' }}>
          <img
            src={trip.cover_image || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80'}
            alt={trip.title}
            loading="lazy"
            onError={handleImageError}
          />
        </Link>

        {/* Destination Pill */}
        {trip.destination_title && (
          <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 2 }}>
            <Link
              to={`/destinations/${trip.destination_id}`}
              onClick={(e) => e.stopPropagation()}
              className="badge badge-sand"
              style={{ background: 'rgba(250,247,242,0.95)', backdropFilter: 'blur(4px)', textDecoration: 'none', color: 'inherit' }}
            >
              <MapPin size={12} color="var(--color-terracotta)" />
              <span>{trip.destination_title}</span>
            </Link>
          </div>
        )}

        {/* Budget Pill */}
        <div style={{ position: 'absolute', bottom: '12px', right: '12px', pointerEvents: 'none' }}>
          <span className="badge badge-ochre" style={{ background: 'rgba(28,36,33,0.85)', color: '#FAF7F2', border: 'none' }}>
            {formatCurrency(trip.estimated_budget, trip.currency || 'INR')}
          </span>
        </div>
      </div>

      <div className="card-body">
        {/* Date line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', color: 'var(--color-ink-muted)', marginBottom: '6px' }}>
          <Calendar size={13} color="var(--color-terracotta)" />
          <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
          {trip.stops_count > 0 && (
            <>
              <span style={{ color: 'var(--color-border-dark)' }}>•</span>
              <Layers size={13} />
              <span>{trip.stops_count} {trip.stops_count === 1 ? 'stop' : 'stops'}</span>
            </>
          )}
        </div>

        <h3 style={{ fontSize: '1.35rem', marginBottom: '8px' }}>
          <Link to={`/trips/${trip.id}`} style={{ color: 'var(--color-ink)' }}>
            {trip.title}
          </Link>
        </h3>

        {trip.notes && (
          <p style={{ fontSize: '0.9rem', marginBottom: '1.25rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {trip.notes}
          </p>
        )}

        {/* Author & Interactions footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--color-border)', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src={trip.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80'}
              alt={trip.author_name}
              style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-ink)' }}>
              {trip.author_name}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Like Button */}
            <button
              onClick={handleLike}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.85rem',
                color: isLiked ? 'var(--color-terracotta)' : 'var(--color-ink-muted)',
                padding: '4px 6px',
                borderRadius: 'var(--radius-sm)'
              }}
              title={isLiked ? 'Unlike trip' : 'Like trip'}
              aria-label={isLiked ? 'Unlike trip' : 'Like trip'}
            >
              <Heart size={16} fill={isLiked ? 'var(--color-terracotta)' : 'none'} strokeWidth={2.2} />
              <span>{likesCount}</span>
            </button>

            {/* Comments Counter */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
              <MessageSquare size={16} strokeWidth={2} />
              <span>{trip.comments_count || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
