import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function GoogleSignInButton({
  text = 'signin_with',
  theme = 'outline',
  size = 'large',
  shape = 'pill',
  width = 260,
  onSuccess,
  onError
}) {
  const { loginWithCredential } = useAuth();
  const { addToast } = useToast();
  const buttonContainerRef = useRef(null);

  const [scriptLoaded, setScriptLoaded] = useState(Boolean(window.google?.accounts?.id));
  const [scriptError, setScriptError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // 1. Ensure Google Identity Services script is available
  useEffect(() => {
    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
      return;
    }

    let intervalId = null;
    let timeoutId = null;

    // Check periodically if the script tag in index.html has finished loading
    intervalId = setInterval(() => {
      if (window.google?.accounts?.id) {
        setScriptLoaded(true);
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      }
    }, 100);

    // Timeout after 8 seconds
    timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      if (!window.google?.accounts?.id) {
        setScriptError(true);
      }
    }, 8000);

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // 2. Initialize and render the official Google Identity Services button
  useEffect(() => {
    if (!clientId || !scriptLoaded || !buttonContainerRef.current) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          if (!response || !response.credential) {
            setLocalError('Google credential was not returned.');
            return;
          }

          setSubmitting(true);
          setLocalError(null);
          try {
            const user = await loginWithCredential(response.credential);
            addToast(`Welcome back, ${user.name}!`, 'success');
            if (onSuccess) onSuccess(user);
          } catch (err) {
            const errorMsg = err.details ? err.details.join(' ') : (err.message || 'Google authentication failed.');
            setLocalError(errorMsg);
            addToast(errorMsg, 'error');
            if (onError) onError(err);
          } finally {
            setSubmitting(false);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // Clear previous button content before re-rendering
      buttonContainerRef.current.innerHTML = '';

      window.google.accounts.id.renderButton(buttonContainerRef.current, {
        type: 'standard',
        theme,
        size,
        text,
        shape,
        logo_alignment: 'left',
        width
      });
    } catch (initErr) {
      console.error('Failed to initialize Google Identity Services button:', initErr);
      setLocalError('Failed to initialize Google Sign-In.');
    }
  }, [clientId, scriptLoaded, theme, size, text, shape, width, loginWithCredential, addToast, onSuccess, onError]);

  // Missing Client ID Warning
  if (!clientId) {
    return (
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'var(--color-sand)',
        border: '1px dashed var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.875rem',
        color: 'var(--color-ink-muted)',
        textAlign: 'center',
        maxWidth: `${width}px`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--color-terracotta)', marginBottom: '4px', fontWeight: 600 }}>
          <AlertCircle size={16} />
          <span>Google Sign-In Unconfigured</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.8rem' }}>
          Please configure <code style={{ color: 'var(--color-ink)' }}>VITE_GOOGLE_CLIENT_ID</code> in <code style={{ color: 'var(--color-ink)' }}>frontend/.env</code>.
        </p>
      </div>
    );
  }

  // Script load failure
  if (scriptError) {
    return (
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'var(--color-sand)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.85rem',
        color: 'var(--color-ink)',
        textAlign: 'center',
        maxWidth: `${width}px`
      }}>
        <p style={{ margin: '0 0 6px 0', color: 'var(--color-danger)' }}>
          Unable to load Google Identity Services.
        </p>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
          Please check your internet connection or disable ad-blockers.
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      {/* Container for Google-injected iframe */}
      <div
        ref={buttonContainerRef}
        style={{
          minHeight: '40px',
          display: submitting ? 'none' : 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      />

      {/* Submitting spinner state */}
      {submitting && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'var(--color-sand)',
          borderRadius: 'var(--radius-pill)',
          fontSize: '0.875rem',
          color: 'var(--color-ink)'
        }}>
          <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          <span>Verifying session with Google...</span>
        </div>
      )}

      {/* Loading GIS script placeholder */}
      {!scriptLoaded && !scriptError && !submitting && (
        <div style={{
          width: `${width}px`,
          height: '40px',
          backgroundColor: 'var(--color-sand)',
          borderRadius: 'var(--radius-pill)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '0.85rem',
          color: 'var(--color-ink-muted)',
          border: '1px solid var(--color-border)'
        }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Connecting to Google...</span>
        </div>
      )}

      {/* Local error message if sign-in fails */}
      {localError && (
        <div style={{
          fontSize: '0.8rem',
          color: 'var(--color-danger)',
          textAlign: 'center',
          maxWidth: `${width}px`,
          marginTop: '4px'
        }}>
          {localError}
        </div>
      )}
    </div>
  );
}
