import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  Ban,
  CheckCircle2,
  UserMinus,
  Download,
  X,
  ShieldCheck,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function GroupInviteModal({
  isOpen,
  onClose,
  trip,
  group,
  isOwner,
  onGroupUpdated
}) {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState(isOwner ? 'invite' : 'members'); // 'invite' | 'members'
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [qrError, setQrError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [removingUserId, setRemovingUserId] = useState(null);

  const loadQrCode = useCallback(async () => {
    if (!trip?.id) return;
    setLoadingQr(true);
    setQrError('');
    try {
      const res = await api.getTripGroupQr(trip.id);
      setQrData(res.data);
    } catch (err) {
      setQrError(err.message || 'Failed to generate invitation QR code.');
    } finally {
      setLoadingQr(false);
    }
  }, [trip]);

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

  // Load QR code and sync activeTab when modal is opened
  useEffect(() => {
    if (isOpen) {
      if (!isOwner) {
        setActiveTab('members');
      }
      if (trip && isOwner && group?.invite_status !== 'revoked') {
        loadQrCode();
      }
    }
  }, [isOpen, trip, isOwner, group?.invite_status, group?.invite_code, loadQrCode]);

  if (!isOpen || !trip || !group) return null;

  const inviteCode = group.invite_code || '';
  const inviteStatus = group.invite_status || 'active';
  const isRevoked = inviteStatus === 'revoked';
  const members = group.members || [];

  const canonicalUrl = qrData?.invite_url || (group.invite_token
    ? `${window.location.origin}/trips/join?token=${encodeURIComponent(group.invite_token)}`
    : `${window.location.origin}/trips/join?code=${encodeURIComponent(inviteCode)}`);

  const handleCopy = async (text, setCopiedFn) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedFn(true);
      setTimeout(() => setCopiedFn(false), 2200);
      addToast('Copied to clipboard!', 'success');
    } catch {
      addToast('Failed to copy to clipboard.', 'error');
    }
  };

  const handleRotateInvitations = async () => {
    if (actionLoading) return;
    const confirmRotate = window.confirm(
      'Are you sure you want to rotate this invitation? Any previously shared links, codes, and printed QR codes will immediately stop working.'
    );
    if (!confirmRotate) return;

    setActionLoading(true);
    try {
      await api.rotateGroupInvite(trip.id);
      addToast('Group invitation credentials rotated successfully!', 'success');
      if (onGroupUpdated) {
        onGroupUpdated();
      }
      // Re-fetch QR code
      await loadQrCode();
    } catch (err) {
      addToast(err.message || 'Failed to rotate invitation credentials.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleRevoke = async () => {
    if (actionLoading) return;
    const newStatus = isRevoked ? 'active' : 'revoked';
    setActionLoading(true);
    try {
      await api.updateGroupInviteStatus(trip.id, newStatus);
      addToast(
        newStatus === 'revoked'
          ? 'Invitations paused. New members cannot join until reactivated.'
          : 'Invitations reactivated!',
        'info'
      );
      if (onGroupUpdated) {
        onGroupUpdated();
      }
      if (newStatus === 'active') {
        await loadQrCode();
      }
    } catch (err) {
      addToast(err.message || 'Failed to update invitation status.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (memberUserId, memberName, isSelf = false) => {
    if (removingUserId) return;
    const promptMessage = isSelf
      ? 'Are you sure you want to leave this group trip?'
      : `Are you sure you want to remove ${memberName} from this group?`;
    if (!window.confirm(promptMessage)) return;

    setRemovingUserId(memberUserId);
    try {
      await api.removeGroupMember(trip.id, memberUserId);
      addToast(isSelf ? 'You have left the group.' : `${memberName} removed.`, 'info');
      if (onGroupUpdated) {
        onGroupUpdated();
      }
      if (isSelf) {
        onClose();
      }
    } catch (err) {
      addToast(err.message || 'Failed to update membership.', 'error');
    } finally {
      setRemovingUserId(null);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28, 36, 33, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="group-modal-title"
    >
      <div
        style={{
          backgroundColor: 'var(--color-ivory)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: 'var(--space-5) var(--space-6)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-sand)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-terracotta-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-terracotta)'
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <h3
                id="group-modal-title"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  margin: 0,
                  color: 'var(--color-ink)'
                }}
              >
                {group.name || 'Group Companions'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
                {members.length} {members.length === 1 ? 'traveler' : 'travelers'} • Trip #{trip.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-ink-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--color-border)',
            padding: '0 var(--space-6)',
            backgroundColor: 'var(--color-ivory)'
          }}
        >
          {isOwner && (
            <button
              type="button"
              onClick={() => setActiveTab('invite')}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: activeTab === 'invite' ? 'var(--color-terracotta)' : 'var(--color-ink-muted)',
                borderBottom: activeTab === 'invite' ? '2px solid var(--color-terracotta)' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <QrCode size={16} />
              <span>Invite & QR Code</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('members')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: activeTab === 'members' ? 'var(--color-terracotta)' : 'var(--color-ink-muted)',
              borderBottom: activeTab === 'members' ? '2px solid var(--color-terracotta)' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Users size={16} />
            <span>Travelers ({members.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 'var(--space-6)', overflowY: 'auto' }}>
          {/* TAB 1: INVITE & QR (Owner/Manager view) */}
          {activeTab === 'invite' && isOwner && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Revoked Warning Banner */}
              {isRevoked && (
                <div
                  style={{
                    backgroundColor: 'var(--color-danger-soft)',
                    border: '1px solid var(--color-danger)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: 'var(--color-danger)',
                    fontSize: '0.9rem'
                  }}
                >
                  <Ban size={18} />
                  <span>
                    <strong>Invitations currently revoked:</strong> New travelers cannot join until you reactivate.
                  </span>
                </div>
              )}

              {/* 1. Unique Invite Code Card */}
              <div
                style={{
                  backgroundColor: 'var(--color-sand)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontWeight: 700,
                      color: 'var(--color-ink-muted)',
                      marginBottom: '4px'
                    }}
                  >
                    Companion Invite Code
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '1.4rem',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      color: isRevoked ? 'var(--color-ink-faint)' : 'var(--color-terracotta)'
                    }}
                  >
                    {inviteCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(inviteCode, setCopiedCode)}
                  className="btn btn-outline btn-sm"
                  style={{ minWidth: '96px', justifyContent: 'center' }}
                  disabled={isRevoked}
                  title="Copy 8-character invitation code"
                >
                  {copiedCode ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              {/* 2. Dynamic QR Code Display */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: '16px',
                  border: '1px dashed var(--color-border-dark)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#ffffff'
                }}
              >
                {loadingQr ? (
                  <div style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--color-ink-muted)' }}>
                    <Loader2 size={24} className="spin" />
                    <span style={{ fontSize: '0.85rem' }}>Generating secure QR code...</span>
                  </div>
                ) : qrError ? (
                  <div style={{ color: 'var(--color-danger)', padding: '16px 0', fontSize: '0.85rem' }}>
                    <AlertCircle size={20} style={{ margin: '0 auto 6px' }} />
                    <p>{qrError}</p>
                    <button type="button" onClick={loadQrCode} className="btn btn-outline btn-xs" style={{ marginTop: '8px' }}>
                      Retry
                    </button>
                  </div>
                ) : qrData?.qr_data_url && !isRevoked ? (
                  <>
                    <img
                      src={qrData.qr_data_url}
                      alt="Group Trip Invitation QR"
                      style={{
                        width: '180px',
                        height: '180px',
                        borderRadius: 'var(--radius-sm)',
                        display: 'block'
                      }}
                    />
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-ink-muted)', marginTop: '8px', marginBottom: '8px' }}>
                      Scan with camera to open invitation directly
                    </p>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <a
                        href={qrData.qr_data_url}
                        download={`roamly-trip-${trip.id}-qr.png`}
                        className="btn btn-outline btn-xs"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <Download size={13} />
                        <span>Download PNG</span>
                      </a>
                      {qrData.qr_svg && (
                        <a
                          href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrData.qr_svg)}`}
                          download={`roamly-trip-${trip.id}-qr.svg`}
                          className="btn btn-outline btn-xs"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <Download size={13} />
                          <span>Download SVG</span>
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '24px 0', color: 'var(--color-ink-muted)' }}>
                    <Ban size={24} color="var(--color-danger)" style={{ margin: '0 auto 6px' }} />
                    <span style={{ fontSize: '0.85rem' }}>QR code hidden while invitations are paused.</span>
                  </div>
                )}
              </div>

              {/* 3. Direct Invitation Link */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                    color: 'var(--color-ink-muted)',
                    marginBottom: '6px'
                  }}
                >
                  Direct Invitation Link
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={canonicalUrl}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-sand)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.82rem',
                      color: 'var(--color-ink)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(canonicalUrl, setCopiedLink)}
                    className="btn btn-primary btn-sm"
                    disabled={isRevoked}
                  >
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* 4. Manager Security Actions */}
              <div
                style={{
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <button
                  type="button"
                  onClick={handleToggleRevoke}
                  disabled={actionLoading}
                  className="btn btn-outline btn-sm"
                  style={{
                    color: isRevoked ? 'var(--color-success)' : 'var(--color-danger)',
                    borderColor: isRevoked ? 'var(--color-success)' : 'var(--color-border)'
                  }}
                >
                  {isRevoked ? <CheckCircle2 size={14} /> : <Ban size={14} />}
                  <span>{isRevoked ? 'Reactivate Invites' : 'Pause Invites'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRotateInvitations}
                  disabled={actionLoading}
                  className="btn btn-outline btn-sm"
                  title="Invalidates the current code and QR, generating a fresh pair"
                >
                  <RefreshCw size={14} className={actionLoading ? 'spin' : ''} />
                  <span>Rotate Credentials</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ROSTER OF TRAVELERS */}
          {activeTab === 'members' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
                  Confirmed companions collaborating on this journey
                </span>
                <span className="badge badge-sage" style={{ fontSize: '0.75rem' }}>
                  {members.length} {members.length === 1 ? 'Member' : 'Members'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {members.map((m) => {
                  const isMemberOwner = m.role === 'owner';
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        backgroundColor: 'var(--color-sand)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={m.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                          alt={m.name}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1px solid var(--color-border-dark)'
                          }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-ink)' }}>
                              {m.name}
                            </span>
                            {isMemberOwner && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '0.7rem',
                                  backgroundColor: 'var(--color-terracotta-soft)',
                                  color: 'var(--color-terracotta)',
                                  padding: '1px 6px',
                                  borderRadius: 'var(--radius-pill)',
                                  fontWeight: 700
                                }}
                              >
                                <ShieldCheck size={11} />
                                <span>Organizer</span>
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)' }}>
                            @{m.username} • Joined {new Date(m.joined_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Remove Button for Owner (cannot remove self/owner) */}
                      {isOwner && !isMemberOwner && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.user_id, m.name, false)}
                          disabled={removingUserId === m.user_id}
                          className="btn btn-outline btn-xs"
                          style={{
                            color: 'var(--color-danger)',
                            borderColor: 'var(--color-border)'
                          }}
                          title={`Remove ${m.name} from group`}
                        >
                          <UserMinus size={13} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: 'var(--space-4) var(--space-6)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--color-sand)'
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-faint)' }}>
            Group invitations update dynamically in real time
          </span>
          <button type="button" onClick={onClose} className="btn btn-outline btn-sm">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
