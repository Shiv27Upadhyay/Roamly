import React, { useState } from 'react';
import {
  Camera,
  Plus,
  Trash2,
  Calendar,
  User,
  ZoomIn,
  Loader2
} from 'lucide-react';

export default function TripPhotosSection({
  photos = [],
  loading = false,
  canUpload = false,
  onOpenUpload,
  onDeletePhoto,
  onPhotoClick
}) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (e, photoId) => {
    e.stopPropagation();
    const confirmed = window.confirm('Are you sure you want to delete this photo from the trip gallery?');
    if (!confirmed) return;

    setDeletingId(photoId);
    try {
      await onDeletePhoto(photoId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section style={{ paddingTop: 'var(--space-8)', borderTop: '1px solid var(--color-border)' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: 'var(--space-6)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-terracotta-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-terracotta)'
            }}
          >
            <Camera size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontFamily: 'var(--font-serif)', color: 'var(--color-ink)' }}>
                Trip Photos
              </h3>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  backgroundColor: 'var(--color-sand)',
                  color: 'var(--color-ink-muted)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {photos.length}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
              Shared visual memories from travelers on this itinerary
            </p>
          </div>
        </div>

        {canUpload && (
          <button
            type="button"
            onClick={onOpenUpload}
            className="btn btn-outline btn-sm"
            style={{
              backgroundColor: 'var(--color-ivory)',
              borderColor: 'var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Upload photos to this trip"
          >
            <Plus size={15} color="var(--color-terracotta)" />
            <span>Add Photos</span>
          </button>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-12)',
            color: 'var(--color-ink-muted)',
            gap: '8px'
          }}
        >
          <Loader2 size={20} className="animate-spin" />
          <span>Loading trip photos...</span>
        </div>
      ) : photos.length === 0 ? (
        /* Empty State */
        <div
          style={{
            backgroundColor: 'var(--color-sand)',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-10) var(--space-6)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-terracotta)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Camera size={26} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-ink)', fontWeight: 600 }}>
              No Photos Yet
            </h4>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: '0.88rem',
                color: 'var(--color-ink-muted)',
                maxWidth: '420px',
                lineHeight: 1.5
              }}
            >
              Capture and preserve the beauty of your destinations. The trip owner and active companions can upload photos.
            </p>
          </div>

          {canUpload && (
            <button
              type="button"
              onClick={onOpenUpload}
              className="btn btn-primary btn-sm"
              style={{ marginTop: '8px' }}
            >
              <Plus size={15} />
              <span>Upload First Photo</span>
            </button>
          )}
        </div>
      ) : (
        /* Photo Grid */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '18px'
          }}
        >
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              onClick={() => onPhotoClick(index)}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              {/* Image with zoom badge */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '4 / 3',
                  backgroundColor: 'var(--color-sand)',
                  overflow: 'hidden'
                }}
              >
                <img
                  src={photo.secure_url}
                  alt={photo.caption || 'Trip photo'}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 0.3s ease'
                  }}
                />

                {/* Lightbox zoom hint icon */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    background: 'rgba(0,0,0,0.5)',
                    color: '#FFFFFF',
                    padding: '4px',
                    borderRadius: 'var(--radius-xs)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(2px)'
                  }}
                  title="View full-size photo"
                >
                  <ZoomIn size={14} />
                </div>

                {/* Delete button (if user has deletion permission) */}
                {photo.can_delete && (
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, photo.id)}
                    disabled={deletingId === photo.id}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(184, 58, 46, 0.85)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 'var(--radius-xs)',
                      padding: '5px',
                      cursor: deletingId === photo.id ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                    title="Delete photo"
                  >
                    {deletingId === photo.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                  </button>
                )}
              </div>

              {/* Card Footer info */}
              <div
                style={{
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  flex: 1,
                  justifyContent: 'space-between'
                }}
              >
                {photo.caption && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.85rem',
                      color: 'var(--color-ink)',
                      fontWeight: 500,
                      lineHeight: 1.35,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}
                  >
                    {photo.caption}
                  </p>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    color: 'var(--color-ink-muted)',
                    paddingTop: photo.caption ? '4px' : '0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    {photo.uploader?.avatar_url ? (
                      <img
                        src={photo.uploader.avatar_url}
                        alt={photo.uploader.name}
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-sand)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <User size={10} color="var(--color-ink-muted)" />
                      </div>
                    )}
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: 500
                      }}
                    >
                      {photo.uploader?.name || 'Traveler'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                    <Calendar size={11} />
                    <span>{new Date(photo.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
