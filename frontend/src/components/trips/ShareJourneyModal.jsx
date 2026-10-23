import React, { useState, useEffect } from 'react';
import {
  Share2,
  X,
  Copy,
  Check,
  Globe,
  Link2,
  Lock,
  Loader2
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function ShareJourneyModal({
  isOpen,
  onClose,
  trip,
  onTripUpdated
}) {
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [visibilityError, setVisibilityError] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !trip) return null;

  const currentVisibility = trip.visibility || 'public';
  const shareToken = trip.share_token;

  // Construct target share URL
  const baseUrl = window.location.origin;
  const publicUrl = `${baseUrl}/trips/${trip.id}`;
  const unlistedShareUrl = shareToken
    ? `${baseUrl}/trips/${trip.id}?token=${shareToken}`
    : publicUrl;

  const handleCopy = async (textToCopy) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for environments where clipboard API is restricted
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      addToast('Share link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      addToast('Failed to copy link automatically. Please copy the URL below manually.', 'error');
    }
  };

  const handleNativeShare = async (url) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: trip.title,
          text: `Check out this travel itinerary: "${trip.title}" on Roamly`,
          url
        });
      } catch (err) {
        // User cancelled or aborted native share
        if (err.name !== 'AbortError') {
          console.error('Native share failed:', err);
        }
      }
    } else {
      handleCopy(url);
    }
  };

  const handleQuickVisibilityChange = async (newVisibility) => {
    if (newVisibility === currentVisibility || savingVisibility) return;
    setSavingVisibility(true);
    setVisibilityError('');

    try {
      const res = await api.updateTrip(trip.id, { visibility: newVisibility });
      const updated = res.data;
      if (onTripUpdated) {
        onTripUpdated(updated);
      }
      addToast(`Itinerary visibility set to ${newVisibility.toUpperCase()}`, 'success');
    } catch (err) {
      console.error('Failed to change visibility:', err);
      setVisibilityError(err.message || 'Failed to update visibility.');
      addToast(err.message || 'Failed to update visibility.', 'error');
    } finally {
      setSavingVisibility(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        style={{ maxWidth: '540px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-sand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-terracotta)'
            }}>
              <Share2 size={20} />
            </div>
            <div>
              <h3 id="share-modal-title" style={{ margin: 0, fontSize: '1.25rem' }}>
                Share Journey
              </h3>
              <span style={{ fontSize: '0.825rem', color: 'var(--color-ink-muted)' }}>
                {trip.title}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{ color: 'var(--color-ink-muted)' }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Visibility Status & Switcher */}
        <div style={{
          marginTop: 'var(--space-4)',
          marginBottom: 'var(--space-5)',
          padding: 'var(--space-4)',
          background: 'var(--color-sand)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ink)' }}>
              Current Visibility
            </span>
            {savingVisibility && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
                <Loader2 size={12} className="spin" /> Updating...
              </span>
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px'
          }}>
            {[
              { id: 'public', label: 'Public', icon: Globe },
              { id: 'unlisted', label: 'Unlisted', icon: Link2 },
              { id: 'private', label: 'Private', icon: Lock }
            ].map((opt) => {
              const active = currentVisibility === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleQuickVisibilityChange(opt.id)}
                  disabled={savingVisibility}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: active ? '2px solid var(--color-terracotta)' : '1px solid var(--color-border)',
                    background: active ? 'var(--color-ivory)' : '#FAF7F2',
                    color: active ? 'var(--color-terracotta)' : 'var(--color-ink)',
                    fontWeight: active ? 600 : 500,
                    fontSize: '0.85rem',
                    cursor: savingVisibility ? 'not-allowed' : 'pointer',
                    transition: 'all 160ms ease'
                  }}
                >
                  <Icon size={14} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {visibilityError && (
            <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '8px', marginBottom: 0 }}>
              {visibilityError}
            </p>
          )}
        </div>

        {/* Dynamic Sharing Panel Based on Current Visibility */}
        {currentVisibility === 'public' && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              background: 'rgba(122, 143, 121, 0.12)',
              border: '1px solid var(--color-sage)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 'var(--space-4)',
              fontSize: '0.85rem',
              color: 'var(--color-ink)'
            }}>
              <Globe size={16} color="var(--color-sage)" style={{ flexShrink: 0 }} />
              <span>
                <strong>Public Itinerary:</strong> Anyone can discover this trip in community feeds and save it to their wishlist.
              </span>
            </div>

            <label className="form-label" style={{ fontSize: '0.85rem', marginBottom: '6px' }}>
              Public Itinerary URL
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                readOnly
                value={publicUrl}
                onClick={(e) => e.target.select()}
                className="form-input"
                style={{ fontSize: '0.85rem', background: '#FFFFFF' }}
              />
              <button
                type="button"
                onClick={() => handleCopy(publicUrl)}
                className="btn btn-primary btn-sm"
                style={{ flexShrink: 0, minWidth: '110px' }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        )}

        {currentVisibility === 'unlisted' && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '12px 14px',
              background: 'rgba(217, 160, 91, 0.12)',
              border: '1px solid var(--color-ochre)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 'var(--space-4)',
              fontSize: '0.85rem',
              color: 'var(--color-ink)'
            }}>
              <Link2 size={16} color="var(--color-ochre)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                <strong>Secret Share Link:</strong> This itinerary is hidden from public discovery feeds. Anyone with this exact secret link can view your itinerary without signing in.
              </span>
            </div>

            <label className="form-label" style={{ fontSize: '0.85rem', marginBottom: '6px' }}>
              Secret Shareable URL (contains access token)
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                readOnly
                value={unlistedShareUrl}
                onClick={(e) => e.target.select()}
                className="form-input"
                style={{
                  fontSize: '0.85rem',
                  background: '#FFFFFF',
                  fontFamily: 'monospace'
                }}
              />
              <button
                type="button"
                onClick={() => handleCopy(unlistedShareUrl)}
                className="btn btn-primary btn-sm"
                style={{ flexShrink: 0, minWidth: '110px' }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
              Tip: If you ever change this trip to Private, this link will immediately stop working.
            </p>
          </div>
        )}

        {currentVisibility === 'private' && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '16px',
              background: 'var(--color-sand)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              color: 'var(--color-ink)'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(28, 36, 33, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Lock size={16} color="var(--color-ink)" />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem', marginBottom: '4px' }}>
                  This itinerary is Private
                </strong>
                <p style={{ margin: 0, color: 'var(--color-ink-muted)', lineHeight: 1.5 }}>
                  Only you can view and edit this trip when signed in. Other travelers, anonymous visitors, and direct numeric IDs cannot access it.
                </p>
                <p style={{ margin: '8px 0 0', color: 'var(--color-terracotta)', fontWeight: 500, fontSize: '0.825rem' }}>
                  To share with others, select <em>Unlisted</em> above to generate a secret share link.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="modal-actions" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', margin: 0 }}>
          {navigator.share && currentVisibility !== 'private' ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleNativeShare(currentVisibility === 'unlisted' ? unlistedShareUrl : publicUrl)}
            >
              <Share2 size={14} />
              <span>Share via Apps...</span>
            </button>
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)' }}>
              Roamly Privacy &amp; Sharing
            </span>
          )}

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
