import React from 'react';

export function CardSkeleton() {
  return (
    <div className="editorial-card" style={{ pointerEvents: 'none' }}>
      <div className="skeleton" style={{ width: '100%', aspectRatio: '4/3' }} />
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="skeleton" style={{ width: '35%', height: '14px' }} />
        <div className="skeleton" style={{ width: '70%', height: '24px' }} />
        <div className="skeleton" style={{ width: '90%', height: '14px' }} />
        <div className="skeleton" style={{ width: '50%', height: '14px' }} />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }) {
  return (
    <div className="grid-destinations">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="skeleton" style={{ width: '100%', height: '380px', borderRadius: 'var(--radius-md)' }} />
      <div className="skeleton" style={{ width: '40%', height: '36px' }} />
      <div className="skeleton" style={{ width: '75%', height: '18px' }} />
      <div className="skeleton" style={{ width: '95%', height: '100px' }} />
    </div>
  );
}
