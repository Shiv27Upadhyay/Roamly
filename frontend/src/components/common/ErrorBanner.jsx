import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorBanner({ message, onRetry = null }) {
  if (!message) return null;

  return (
    <div className="error-banner" role="alert">
      <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, color: 'inherit', fontWeight: 500 }}>
          {message}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-outline btn-sm"
          style={{ borderColor: 'currentColor', color: 'inherit', padding: '3px 8px' }}
        >
          <RefreshCw size={13} />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}
