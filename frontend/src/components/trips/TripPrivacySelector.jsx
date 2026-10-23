import React from 'react';
import { Globe, Link2, Lock, Check } from 'lucide-react';

const PRIVACY_OPTIONS = [
  {
    id: 'public',
    label: 'Public',
    badge: 'Community',
    badgeClass: 'badge-sage',
    icon: Globe,
    description: 'Appears in community discovery feeds and can be viewed, saved, and liked by any traveler.'
  },
  {
    id: 'unlisted',
    label: 'Unlisted',
    badge: 'Secret Link',
    badgeClass: 'badge-ochre',
    icon: Link2,
    description: 'Hidden from public feeds and searches. Accessible only to people who have your secret share link.'
  },
  {
    id: 'private',
    label: 'Private',
    badge: 'Only You',
    badgeClass: 'badge-sand',
    icon: Lock,
    description: 'Visible only to you when signed in. Completely inaccessible to any other traveler or link.'
  }
];

export default function TripPrivacySelector({
  value = 'public',
  onChange,
  disabled = false,
  error = null
}) {
  const currentVisibility = value || 'public';

  return (
    <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span>Itinerary Visibility &amp; Privacy</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', fontWeight: 400 }}>
          You can change visibility at any time
        </span>
      </label>

      <div
        role="radiogroup"
        aria-label="Itinerary visibility options"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-3)'
        }}
      >
        {PRIVACY_OPTIONS.map((opt) => {
          const isSelected = currentVisibility === opt.id;
          const Icon = opt.icon;

          return (
            <label
              key={opt.id}
              htmlFor={`visibility-${opt.id}`}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: isSelected
                  ? '2px solid var(--color-terracotta)'
                  : '1px solid var(--color-border)',
                backgroundColor: isSelected ? 'rgba(196, 98, 59, 0.04)' : 'var(--color-ivory)',
                boxShadow: isSelected ? '0 2px 8px rgba(196, 98, 59, 0.12)' : 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 180ms ease-out',
                opacity: disabled ? 0.6 : 1
              }}
            >
              <input
                type="radio"
                id={`visibility-${opt.id}`}
                name="visibility"
                value={opt.id}
                checked={isSelected}
                disabled={disabled}
                onChange={() => onChange && onChange(opt.id)}
                style={{
                  position: 'absolute',
                  opacity: 0,
                  pointerEvents: 'none'
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isSelected ? 'var(--color-terracotta)' : 'var(--color-sand)',
                    color: isSelected ? '#FFFFFF' : 'var(--color-ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 180ms ease'
                  }}>
                    <Icon size={16} />
                  </div>
                  <strong style={{ fontSize: '1rem', color: 'var(--color-ink)' }}>{opt.label}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className={`badge ${opt.badgeClass}`} style={{ fontSize: '0.725rem', padding: '2px 7px' }}>
                    {opt.badge}
                  </span>
                  {isSelected && (
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-terracotta)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Check size={11} strokeWidth={3} />
                    </div>
                  )}
                </div>
              </div>

              <p style={{
                margin: 0,
                fontSize: '0.825rem',
                color: 'var(--color-ink-muted)',
                lineHeight: 1.45,
                flex: 1
              }}>
                {opt.description}
              </p>
            </label>
          );
        })}
      </div>

      {error && <div className="form-error" style={{ marginTop: '6px' }}>{error}</div>}
    </div>
  );
}
