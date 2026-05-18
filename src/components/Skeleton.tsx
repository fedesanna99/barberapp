import { C } from '../lib/colors'

// Pure CSS shimmer — animation defined globally in index.css.
export function Skeleton({
  width = '100%',
  height = 14,
  radius = 'var(--r-sm)',
  style,
}: {
  width?:  number | string
  height?: number | string
  radius?: number | string
  style?:  React.CSSProperties
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${C.surfaceAlt} 0%, ${C.border} 50%, ${C.surfaceAlt} 100%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s ease-in-out infinite',
        ...style,
      }}
    />
  )
}

export function PostSkeleton() {
  return (
    <div style={{ padding: '14px 20px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Skeleton width={40} height={40} radius={20} />
        <div style={{ flex: 1 }}>
          <Skeleton width="40%" height={12} style={{ marginBottom: 6 }} />
          <Skeleton width="25%" height={10} />
        </div>
      </div>
      <Skeleton width="100%" height={320} radius={0} />
      <div style={{ marginTop: 12 }}>
        <Skeleton width="60%" height={12} style={{ marginBottom: 6 }} />
        <Skeleton width="35%" height={10} />
      </div>
    </div>
  )
}

export function ListRowSkeleton({ avatar = 48 }: { avatar?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
      <Skeleton width={avatar} height={avatar} radius={avatar / 2} />
      <div style={{ flex: 1 }}>
        <Skeleton width="45%" height={12} style={{ marginBottom: 6 }} />
        <Skeleton width="65%" height={10} />
      </div>
    </div>
  )
}
