import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auth modal prompt state (for unauthenticated actions)
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState('Sign in with Google to continue');

  // Request counter to prevent stale async responses from overwriting newer state
  const activeRequestIdRef = useRef(0);
  // Ensure session restore executes once on mount
  const hasRestoredRef = useRef(false);

  /**
   * Restores active session using GET /api/auth/me
   */
  const restoreSession = useCallback(async () => {
    const requestId = ++activeRequestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const res = await api.getCurrentUser();
      if (requestId === activeRequestIdRef.current) {
        setUser(res.user || null);
      }
    } catch (err) {
      if (requestId === activeRequestIdRef.current) {
        setUser(null);
        // Only set error for unexpected server issues, not normal anonymous 401s
        if (err.status && err.status !== 401) {
          setError(err.message || 'Failed to restore session.');
        }
      }
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!hasRestoredRef.current) {
      hasRestoredRef.current = true;
      restoreSession();
    }
  }, [restoreSession]);

  /**
   * Authenticates user using Google ID token
   */
  const loginWithCredential = useCallback(async (credential) => {
    const requestId = ++activeRequestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const res = await api.loginWithGoogle(credential);
      if (requestId === activeRequestIdRef.current) {
        setUser(res.user);
        setAuthModalOpen(false);
      }
      return res.user;
    } catch (err) {
      if (requestId === activeRequestIdRef.current) {
        const message = err.message || 'Google sign-in failed. Please try again.';
        setError(message);
      }
      throw err;
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Logs out user and terminates session cookie
   */
  const logout = useCallback(async () => {
    const requestId = ++activeRequestIdRef.current;
    try {
      await api.logout();
    } catch (err) {
      // Gracefully handle logout failure (e.g. already expired session)
      console.warn('Logout API warning:', err.message);
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setUser(null);
        setError(null);
      }
    }
  }, []);

  /**
   * Open the login modal with a context-specific message
   */
  const openAuthModal = useCallback((reason = 'Sign in with Google to continue') => {
    setAuthModalReason(reason);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: Boolean(user),
    loginWithCredential,
    logout,
    restoreSession,
    authModalOpen,
    authModalReason,
    openAuthModal,
    closeAuthModal
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
