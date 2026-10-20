import React from 'react';
import { Compass } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Compass,
  title = 'No records found',
  description = 'Try adjusting your search query or filters to find what you are looking for.',
  action = null
}) {
  return (
    <div className="empty-state">
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'var(--color-sand)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-ink-muted)'
      }}>
        <Icon size={32} strokeWidth={1.75} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <div style={{ marginTop: '0.75rem' }}>
          {action}
        </div>
      )}
    </div>
  );
}
