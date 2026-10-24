import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Compass,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Calendar,
  Loader2,
  LogIn
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function JoinTripPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();
  const { addToast } = useToast();

  const urlToken = searchParams.get('token');
  const urlCode = searchParams.get('code');

  const [inputCode, setInputCode] = useState(urlCode || '');
  const [activeToken, setActiveToken] = useState(urlToken || '');
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const lookupInvitation = useCallback(async (params) => {
    setLoadingPreview(true);
    setPreviewError('');
    setJoinError('');
    try {
      const res = await api.getGroupInvitationPreview(params);
      setPreview(res.data);
      if (res.data.invite_code && !inputCode) {
        setInputCode(res.data.invite_code);
      }
    } catch (err) {
      setPreview(null);
      if (err.status === 403) {
        setPreviewError('This group invitation has been paused or revoked by the trip organizer.');
      } else if (err.status === 404) {
        setPreviewError('Invitation not found. The code or link may have expired or rotated.');
      } else {
        setPreviewError(err.message || 'Unable to load invitation preview.');
      }
    } finally {
      setLoadingPreview(false);
    }
  }, [inputCode]);

  // Fetch invitation preview if token or code is present in URL
  useEffect(() => {
    if (urlToken || urlCode) {
      lookupInvitation(urlToken ? { token: urlToken } : { code: urlCode });
    }
  }, [urlToken, urlCode, lookupInvitation]);

  const handleManualLookup = (e) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setActiveToken('');
    lookupInvitation({ code: inputCode.trim() });
  };

  const handleConfirmJoin = async () => {
    if (!user) {
      openAuthModal('Sign in with Google to confirm and join this group trip.');
      return;
    }

    if (joining) return;
    setJoining(true);
    setJoinError('');

    try {
      const payload = {};
      if (activeToken) {
        payload.token = activeToken;
        payload.via = 'invite_link';
      } else if (inputCode) {
        payload.code = inputCode.trim();
        payload.via = 'invite_code';
      } else if (preview?.invite_code) {
        payload.code = preview.invite_code;
        payload.via = 'invite_code';
      }

      const res = await api.joinGroup(payload);

      if (res.data.already_member) {
        addToast(`You are already a traveler in "${res.data.trip_title}"!`, 'info');
      } else {
        addToast(`Successfully joined "${res.data.trip_title}"!`, 'success');
      }

      // Navigate to joined trip itinerary
      navigate(`/trips/${res.data.trip_id}`);
    } catch (err) {
      if (err.status === 403) {
        setJoinError('This invitation is currently revoked by the organizer.');
      } else if (err.status === 429) {
        setJoinError(err.message || 'Too many attempts. Please wait a few moments.');
      } else {
        setJoinError(err.message || 'Failed to join group trip.');
      }
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-20)', maxWidth: '580px' }}>
      {/* Top Back Nav */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link to="/trips" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--color-ink-muted)' }}>
          <ArrowLeft size={16} />
          <span>Back to All Trips</span>
        </Link>
      </div>

      <div
        style={{
          backgroundColor: 'var(--color-ivory)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden'
        }}
      >
        {/* Header Banner */}
        <div
          style={{
            padding: 'var(--space-8) var(--space-8) var(--space-6)',
            textAlign: 'center',
            background: 'var(--color-sand)',
            borderBottom: '1px solid var(--color-border)'
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-terracotta-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--color-terracotta)'
            }}
          >
            <Compass size={28} />
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.8rem',
              fontWeight: 600,
              color: 'var(--color-ink)',
              marginBottom: '6px'
            }}
          >
            Join Group Itinerary
          </h1>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.95rem', margin: 0 }}>
            Collaborate on shared stops, recommendations, and journeys
          </p>
        </div>

        <div style={{ padding: 'var(--space-8)' }}>
          {/* If no preview yet, show Code Entry Form */}
          {!preview && (
            <form onSubmit={handleManualLookup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  htmlFor="join-code-input"
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: 'var(--color-ink)'
                  }}
                >
                  Enter Invitation Code
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="join-code-input"
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="ROAM-7K9P"
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      fontSize: '1.1rem',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-sand)'
                    }}
                    maxLength={14}
                    disabled={loadingPreview}
                    required
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loadingPreview || !inputCode.trim()}
                    style={{ minWidth: '110px', justifyContent: 'center' }}
                  >
                    {loadingPreview ? (
                      <Loader2 size={16} className="spin" />
                    ) : (
                      <>
                        <span>Find Trip</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {previewError && (
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: 'var(--color-danger-soft)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-danger)',
                    color: 'var(--color-danger)',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <AlertCircle size={18} />
                  <span>{previewError}</span>
                </div>
              )}
            </form>
          )}

          {/* Invitation Preview Card */}
          {preview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Trip Hero Card */}
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  backgroundColor: 'var(--color-sand)'
                }}
              >
                {preview.cover_image && (
                  <div style={{ width: '100%', height: '160px', overflow: 'hidden', position: 'relative' }}>
                    <img
                      src={preview.cover_image}
                      alt={preview.trip_title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(28,36,33,0.7) 0%, transparent 60%)'
                      }}
                    />
                    {preview.destination_title && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '12px',
                          left: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          backgroundColor: 'rgba(250,247,242,0.92)',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-pill)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: 'var(--color-ink)'
                        }}
                      >
                        <MapPin size={12} color="var(--color-terracotta)" />
                        <span>{preview.destination_title}, {preview.destination_country}</span>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <img
                      src={preview.organizer_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                      alt={preview.organizer_name}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
                      Organized by <strong>{preview.organizer_name}</strong>
                    </span>
                  </div>

                  <h2
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.4rem',
                      fontWeight: 600,
                      marginBottom: '8px',
                      color: 'var(--color-ink)'
                    }}
                  >
                    {preview.trip_title}
                  </h2>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
                    {preview.start_date && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={14} />
                        <span>{preview.start_date} – {preview.end_date}</span>
                      </span>
                    )}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Users size={14} />
                      <span>{preview.members_count} active {preview.members_count === 1 ? 'traveler' : 'travelers'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {joinError && (
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: 'var(--color-danger-soft)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-danger)',
                    color: 'var(--color-danger)',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <AlertCircle size={18} />
                  <span>{joinError}</span>
                </div>
              )}

              {/* Action Confirmation Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {user ? (
                  <button
                    type="button"
                    onClick={handleConfirmJoin}
                    disabled={joining}
                    className="btn btn-primary btn-lg"
                    style={{ justifyContent: 'center', width: '100%', fontSize: '1.05rem', padding: '14px' }}
                  >
                    {joining ? (
                      <Loader2 size={20} className="spin" />
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        <span>Confirm & Join Journey</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAuthModal('Sign in with Google to confirm and join this group trip.')}
                    className="btn btn-primary btn-lg"
                    style={{ justifyContent: 'center', width: '100%', fontSize: '1.05rem', padding: '14px' }}
                  >
                    <LogIn size={18} />
                    <span>Sign in with Google to Join</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    setActiveToken('');
                    setInputCode('');
                  }}
                  className="btn btn-outline btn-sm"
                  style={{ justifyContent: 'center' }}
                >
                  Enter a Different Code
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
