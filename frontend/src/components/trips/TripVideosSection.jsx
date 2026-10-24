import React, { useState } from 'react';
import {
  Video as VideoIcon,
  Plus,
  Trash2,
  Calendar,
  User,
  Clock,
  Loader2
} from 'lucide-react';

/**
 * Formats duration seconds to mm:ss.
 */
function formatDuration(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function TripVideosSection({
  videos = [],
  loading = false,
  canUpload = false,
  onOpenUpload,
  onDeleteVideo
}) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (videoId) => {
    const confirmed = window.confirm('Are you sure you want to delete this video from the trip gallery?');
    if (!confirmed) return;

    setDeletingId(videoId);
    try {
      await onDeleteVideo(videoId);
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
            <VideoIcon size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontFamily: 'var(--font-serif)', color: 'var(--color-ink)' }}>
                Trip Videos
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
                {videos.length}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
              Video clips and moments captured along the journey
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
            title="Upload a video to this trip"
          >
            <Plus size={15} color="var(--color-terracotta)" />
            <span>Add Video</span>
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
          <span>Loading trip videos...</span>
        </div>
      ) : videos.length === 0 ? (
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
            <VideoIcon size={26} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-ink)', fontWeight: 600 }}>
              No Videos Yet
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
              Share scenic viewpoints, road trip clips, and vibrant moments. Videos can be up to 3 minutes (100 MB).
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
              <span>Upload First Video</span>
            </button>
          )}
        </div>
      ) : (
        /* Videos Grid */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px'
          }}
        >
          {videos.map((video) => (
            <div
              key={video.id}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'box-shadow 0.2s ease'
              }}
            >
              {/* Native In-Page Video Player */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 9',
                  backgroundColor: '#000000',
                  overflow: 'hidden'
                }}
              >
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster={video.thumbnail_url || undefined}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                >
                  <source src={video.secure_url} type={`video/${video.format || 'mp4'}`} />
                  Your browser does not support HTML5 video playback.
                </video>

                {/* Duration Badge overlay */}
                {video.duration > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: 'rgba(0, 0, 0, 0.65)',
                      color: '#FFFFFF',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-xs)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      backdropFilter: 'blur(2px)',
                      pointerEvents: 'none'
                    }}
                  >
                    <Clock size={11} />
                    <span>{formatDuration(video.duration)}</span>
                  </div>
                )}
              </div>

              {/* Video Info Footer */}
              <div
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  flex: 1,
                  justifyContent: 'space-between'
                }}
              >
                {video.caption ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.88rem',
                      color: 'var(--color-ink)',
                      fontWeight: 500,
                      lineHeight: 1.4
                    }}
                  >
                    {video.caption}
                  </p>
                ) : (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.82rem',
                      color: 'var(--color-ink-muted)',
                      fontStyle: 'italic'
                    }}
                  >
                    Video clip ({video.format?.toUpperCase() || 'MP4'})
                  </p>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem',
                    color: 'var(--color-ink-muted)',
                    borderTop: '1px solid var(--color-sand)',
                    paddingTop: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    {video.uploader?.avatar_url ? (
                      <img
                        src={video.uploader.avatar_url}
                        alt={video.uploader.name}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-sand)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <User size={12} color="var(--color-ink-muted)" />
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
                      {video.uploader?.name || 'Traveler'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} />
                      <span>{new Date(video.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>

                    {/* Delete action if permitted */}
                    {video.can_delete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(video.id)}
                        disabled={deletingId === video.id}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-danger)',
                          padding: '2px',
                          cursor: deletingId === video.id ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          fontSize: '0.75rem'
                        }}
                        title="Delete video"
                      >
                        {deletingId === video.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    )}
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
