import { C } from '../lib/colors'

// Task 14 — animated placeholder rectangle. Used to avoid the "flash of empty
// state then content" pattern that happens on first paint of data-driven screens.
// Pure CSS shimmer (animation is defined globally in index.css).
export function Skeleton({
  width = '100%',
  height = 14,
  radius = 8,
  style,
}: {
  width?: number | string
  height?: number | string
  radius?: number
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${C.surface} 0%, ${C.border} 50%, ${C.surface} 100%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s ease-in-out infinite',
        ...style,
      }}
    />
  )
}

// Convenience composition for a post-shaped placeholder.
export function PostSkeleton() {
  return (
    <div style={{ padding: '12px 16px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Skeleton width={36} height={36} radius={18} />
        <div style={{ flex: 1 }}>
          <Skeleton width="40%" height={11} style={{ marginBottom: 6 }} />
          <Skeleton width="25%" height={9} />
        </div>
      </div>
      <Skeleton width="100%" height={260} radius={6} />
      <div style={{ marginTop: 10 }}>
        <Skeleton width="60%" height={11} style={{ marginBottom: 5 }} />
        <Skeleton width="35%" height={9} />
      </div>
    </div>
  )
}

// Row-shaped placeholder for lists (BarberList, Notifications, Appointments).
export function ListRowSkeleton({ avatar = 40 }: { avatar?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `0.5px solid ${C.border}` }}>
      <Skeleton width={avatar} height={avatar} radius={avatar / 2} />
      <div style={{ flex: 1 }}>
        <Skeleton width="45%" height={11} style={{ marginBottom: 6 }} />
        <Skeleton width="65%" height={9} />
      </div>
    </div>
  )
}
