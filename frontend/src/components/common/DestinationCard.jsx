import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, MapPin, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatBudgetTier } from '../../utils/currency';

export default function DestinationCard({ destination, onBookmarkToggle }) {
  const [isBookmarked, setIsBookmarked] = useState(destination.is_bookmarked);
  const [loading, setLoading] = useState(false);
  const { user, openAuthModal } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    setIsBookmarked(destination.is_bookmarked);
  }, [destination.is_bookmarked]);

  const handleBookmarkClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      openAuthModal('Sign in with Google to save destinations to your wishlist.');
      return;
    }

    if (loading) return;

    setLoading(true);
    try {
      const res = await api.toggleBookmark(destination.id);
      const newState = res.data.bookmarked;
      setIsBookmarked(newState);
      if (newState) {
        addToast(`Saved ${destination.title} to your wishlist!`, 'success');
      } else {
        addToast(`Removed ${destination.title} from wishlist.`, 'info');
      }
      if (onBookmarkToggle) {
        onBookmarkToggle(destination.id, newState);
      }
    } catch (err) {
      if (err.status === 401) {
        openAuthModal('Your session has expired. Please sign in to save destinations.');
      } else {
        addToast(err.message || 'Failed to update bookmark.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (e) => {
    e.target.src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80';
  };

  return (
    <article className="editorial-card">
      <Link to={`/destinations/${destination.id}`} className="img-wrap" aria-label={`View ${destination.title}`}>
        <img
          src={destination.cover_image}
          alt={destination.title}
          loading="lazy"
          onError={handleImageError}
        />
        {/* Bookmark Action Overlay */}
        <button
          onClick={handleBookmarkClick}
          disabled={loading}
          className="btn-icon"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(250, 247, 242, 0.92)',
            backdropFilter: 'blur(4px)',
            color: isBookmarked ? 'var(--color-terracotta)' : 'var(--color-ink-muted)',
            boxShadow: 'var(--shadow-sm)'
          }}
          title={isBookmarked ? 'Remove from wishlist' : 'Save to wishlist'}
          aria-label={isBookmarked ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <Bookmark size={18} fill={isBookmarked ? 'var(--color-terracotta)' : 'none'} strokeWidth={2.2} />
        </button>

        {/* Badges Overlay */}
        <div style={{ position: 'absolute', bottom: '12px', left: '12px', display: 'flex', gap: '6px' }}>
          <span className="badge badge-sand">{destination.continent}</span>
          <span className="badge badge-ochre">{formatBudgetTier(destination.budget_tier)}</span>
        </div>
      </Link>

      <div className="card-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-ink-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>
          <MapPin size={14} color="var(--color-terracotta)" />
          <span>{destination.country}</span>
        </div>

        <h3 style={{ fontSize: '1.4rem', marginBottom: '6px' }}>
          <Link to={`/destinations/${destination.id}`} style={{ color: 'var(--color-ink)' }}>
            {destination.title}
          </Link>
        </h3>

        <p style={{ fontSize: '0.9rem', marginBottom: '1rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {destination.tagline}
        </p>

        {/* Tags */}
        {destination.tags && destination.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1.25rem' }}>
            {destination.tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', background: 'var(--color-sand)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '0.825rem', color: 'var(--color-ink-muted)' }}>
            {destination.season}
          </span>
          <Link
            to={`/destinations/${destination.id}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-terracotta)' }}
          >
            <span>Explore</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
