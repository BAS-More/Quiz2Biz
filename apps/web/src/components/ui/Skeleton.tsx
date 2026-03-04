/**
 * Skeleton loader component
 * Design System: Modern SaaS
 */

import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

function SkeletonBase({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={clsx(
        'bg-gradient-to-r from-surface-200 via-surface-100 to-surface-200 bg-[length:200%_100%] animate-shimmer rounded-md',
        className,
      )}
      style={style}
    />
  );
}

export function Skeleton({ className, variant = 'text', width, height, lines = 1 }: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (variant === 'circular') {
    return (
      <SkeletonBase
        className={clsx('rounded-full', className)}
        style={{ ...style, aspectRatio: '1' }}
      />
    );
  }

  if (lines > 1) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBase
            key={i}
            className={clsx('h-4', i === lines - 1 && 'w-3/4', className)}
            style={i === 0 ? style : undefined}
          />
        ))}
      </div>
    );
  }

  return <SkeletonBase className={clsx(variant === 'text' && 'h-4', className)} style={style} />;
}

/** Pre-built skeleton for a stat card */
export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-surface-200/60 p-6 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton variant="rectangular" width={40} height={40} className="rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={24} />
          <Skeleton width="40%" height={14} />
        </div>
      </div>
    </div>
  );
}

/** Pre-built skeleton for a list item */
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border border-surface-100 rounded-xl">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton width="70%" height={16} />
        <Skeleton width="40%" height={12} />
      </div>
      <Skeleton width={80} height={32} className="rounded-lg" />
    </div>
  );
}
