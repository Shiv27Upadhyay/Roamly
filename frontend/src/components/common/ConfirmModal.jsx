import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed? This action cannot be undone.',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDanger = true,
  onConfirm,
  onCancel,
  loading = false
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={loading ? undefined : onCancel}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isDanger && (
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--color-danger-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-danger)'
              }}>
                <AlertTriangle size={20} />
              </div>
            )}
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn-icon"
            style={{ color: 'var(--color-ink-muted)' }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ color: 'var(--color-ink-muted)', fontSize: '0.95rem', margin: '0.75rem 0' }}>
          {message}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'} btn-sm`}
            style={isDanger ? { backgroundColor: 'var(--color-danger)', color: '#fff', borderColor: 'var(--color-danger)' } : {}}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
