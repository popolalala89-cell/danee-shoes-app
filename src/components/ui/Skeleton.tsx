import React from 'react';

/* ================================================================== */
/*  Skeleton Loading — placeholder shimmer pas loading                 */
/*  Usage:                                                             */
/*    <Skeleton count={3} />           — 3 baris text                  */
/*    <Skeleton variant="card" />      — card shape                    */
/*    <Skeleton variant="circle" />    — circle                        */
/*    <Skeleton variant="title" />     — title bar                     */
/* ================================================================== */

interface SkeletonProps {
  variant?: 'text' | 'title' | 'card' | 'circle';
  width?: string;
  height?: string;
  count?: number;
  style?: React.CSSProperties;
  className?: string;
}

export default function Skeleton({
  variant = 'text',
  width,
  height,
  count = 1,
  style,
  className = '',
}: SkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  const baseClass = `skeleton ${className}`;

  const getShape = () => {
    switch (variant) {
      case 'title':
        return `${baseClass} skeleton-title`;
      case 'card':
        return `${baseClass} skeleton-card`;
      case 'circle':
        return `${baseClass} skeleton-circle`;
      default:
        return `${baseClass} skeleton-text${count > 1 && items.length === 1 ? ' short' : ''}`;
    }
  };

  const shapeClass = getShape();

  if (variant === 'text' && count > 1) {
    // Simulate paragraph: first line full, then alternating short/long
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((i) => (
          <div
            key={i}
            className={`skeleton skeleton-text ${i % 2 === 0 ? '' : 'short'}`}
            style={{
              width: i % 2 === 0 ? '100%' : '75%',
              height,
              ...style,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          className={shapeClass}
          style={{ width, height, ...style }}
        />
      ))}
    </>
  );
}

/* Convenience: DashboardSkeleton — pre-built dashboard loading */
export function DashboardSkeleton() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="skeleton skeleton-card" style={{ height: 80 }} />
        <div className="skeleton skeleton-card" style={{ height: 80 }} />
        <div className="skeleton skeleton-card" style={{ height: 80 }} />
        <div className="skeleton skeleton-card" style={{ height: 80 }} />
      </div>
      {/* Title */}
      <div className="skeleton skeleton-title" />
      {/* List items */}
      <div className="skeleton skeleton-card" style={{ height: 60 }} />
      <div className="skeleton skeleton-card" style={{ height: 60 }} />
      <div className="skeleton skeleton-card" style={{ height: 60 }} />
    </div>
  );
}

/* Convenience: TableSkeleton */
export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="skeleton skeleton-title" style={{ width: 120 }} />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton skeleton-card" style={{ height: 52 }} />
      ))}
    </div>
  );
}
