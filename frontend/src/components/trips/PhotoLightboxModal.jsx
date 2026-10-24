import React, { useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  Calendar,
  User
} from 'lucide-react';

export default function PhotoLightboxModal({
  isOpen,
  onClose,
  photos = [],
  currentIndex = 0,
  onNavigate,
  onDelete
}) {
  const currentPhoto = photos[currentIndex];

  const handlePrev = useCallback(() => {
    if (photos.length <= 1) return;
    const nextIdx = (currentIndex - 1 + photos.length) % photos.length;
    onNavigate(nextIdx);
  }, [currentIndex, photos.length, onNavigate]);

  const handleNext = useCallback(() => {
    if (photos.length <= 1) return;
    const nextIdx = (currentIndex + 1) % photos.length;
    onNavigate(nextIdx);
  }, [currentIndex, photos.length, onNavigate]);

  // Keyboard navigation: Escape, ArrowLeft, ArrowRight
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || !currentPhoto) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28, 36, 33, 0.94)',
        backdropFilter: 'blur(8px)',
        zIndex: 1100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo Lightbox"
    >
      {/* Top Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          color: 'var(--color-ivory)',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
          zIndex: 10
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-sand)', fontFamily: 'var(--font-mono)' }}>
            {currentIndex + 1} / {photos.length}
          </span>
          {currentPhoto.caption && (
            <span
              style={{
                fontSize: '0.95rem',
                color: 'var(--color-ivory)',
                fontWeight: 500,
                maxWidth: '400px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {currentPhoto.caption}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Download link */}
          <a
            href={currentPhoto.secure_url}
            target="_blank"
            rel="noopener noreferrer"
            download={`roamly-photo-${currentPhoto.id}.${currentPhoto.format || 'jpg'}`}
            style={{
              padding: '8px',
              color: 'var(--color-ivory)',
              background: 'rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease'
            }}
            title="Download full-size photo"
          >
            <Download size={18} />
          </a>

          {/* Delete Button (if permitted) */}
          {currentPhoto.can_delete && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(currentPhoto.id)}
              style={{
                padding: '8px',
                color: 'var(--color-danger)',
                background: 'rgba(184, 58, 46, 0.2)',
                border: '1px solid rgba(184, 58, 46, 0.3)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Delete this photo"
            >
              <Trash2 size={18} />
            </button>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px',
              color: 'var(--color-ivory)',
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Close lightbox"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Center Image with Previous / Next Controls */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {photos.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: 'var(--color-ivory)',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              zIndex: 5
            }}
            aria-label="Previous photo"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '10px'
          }}
        >
          <img
            src={currentPhoto.secure_url}
            alt={currentPhoto.caption || 'Shared trip photo'}
            style={{
              maxWidth: '100%',
              maxHeight: '78vh',
              objectFit: 'contain',
              borderRadius: 'var(--radius-sm)',
              boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
              animation: 'scaleIn 0.2s ease-out'
            }}
          />
        </div>

        {photos.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: 'var(--color-ivory)',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              zIndex: 5
            }}
            aria-label="Next photo"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      {/* Bottom Information Footer */}
      <div
        style={{
          padding: '16px 24px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
          color: 'var(--color-ivory)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          zIndex: 10
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentPhoto.uploader?.avatar_url ? (
            <img
              src={currentPhoto.uploader.avatar_url}
              alt={currentPhoto.uploader.name}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid var(--color-border)'
              }}
            />
          ) : (
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-terracotta)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <User size={16} />
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-ivory)' }}>
              {currentPhoto.uploader?.name || 'Anonymous Traveler'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-sand)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={12} />
              <span>{new Date(currentPhoto.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
              {currentPhoto.format && (
                <span>• {currentPhoto.format.toUpperCase()}</span>
              )}
              {currentPhoto.bytes > 0 && (
                <span>• {(currentPhoto.bytes / (1024 * 1024)).toFixed(1)} MB</span>
              )}
            </div>
          </div>
        </div>

        {currentPhoto.caption && (
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-ivory)', fontStyle: 'italic', maxWidth: '600px' }}>
            "{currentPhoto.caption}"
          </p>
        )}
      </div>
    </div>
  );
}
