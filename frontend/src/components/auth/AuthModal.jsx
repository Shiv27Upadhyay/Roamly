import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Compass, X, ShieldCheck } from 'lucide-react';
import GoogleSignInButton from './GoogleSignInButton';

export default function AuthModal() {
  const { authModalOpen, authModalReason, closeAuthModal, user } = useAuth();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && authModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authModalOpen, closeAuthModal]);

  // If already logged in or modal is closed, don't render
  if (!authModalOpen || user) return null;

  return (
    <div className="modal-backdrop" onClick={closeAuthModal}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        style={{
          maxWidth: '440px',
          textAlign: 'center',
          padding: 'var(--space-8) var(--space-6)'
        }}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="btn-icon"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            color: 'var(--color-ink-muted)'
          }}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>

        {/* Brand Icon */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--color-sand)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--space-4)',
          border: '1px solid var(--color-border)'
        }}>
          <Compass size={32} color="var(--color-terracotta)" strokeWidth={2.2} />
        </div>

        {/* Modal Heading */}
        <h2 id="auth-modal-title" style={{ fontSize: '1.75rem', marginBottom: '8px' }}>
          Welcome to Roamly
        </h2>

        {/* Reason / Prompt context */}
        <p style={{
          color: 'var(--color-ink-muted)',
          fontSize: '0.95rem',
          lineHeight: '1.5',
          marginBottom: 'var(--space-6)'
        }}>
          {authModalReason || 'Sign in with your Google account to discover destinations, plan itineraries, and save travel memories.'}
        </p>

        {/* Google Sign In Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 'var(--space-6)'
        }}>
          <GoogleSignInButton
            text="continue_with"
            theme="outline"
            size="large"
            shape="pill"
            width={280}
            onSuccess={closeAuthModal}
          />
        </div>

        {/* Trust & Security reassurance note */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '0.8rem',
          color: 'var(--color-ink-muted)',
          paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--color-border)'
        }}>
          <ShieldCheck size={14} color="var(--color-sage)" />
          <span>Secure Google OAuth 2.0 authentication. Passwordless &amp; verified.</span>
        </div>
      </div>
    </div>
  );
}
