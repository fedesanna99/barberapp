/**
 * Barberbook · Pari primitives.
 *
 * Typed TSX port of design_handoff_pari/ui_kits/barberbook_app/primitives.jsx.
 * Avatar, Button, IconBtn, Pill, Hairline, ClayRule, Stat, SectionHeader,
 * PhotoBlock — every component uses CSS variables only, so light/dark
 * flip automatically when `.dark` is set on <html>.
 */
import type { CSSProperties, ReactNode, MouseEventHandler } from 'react'
import { Icon, type IconName } from './Icon'

/* ============================================================
   POLE MARK — Pari brand mark (3 stripes, clay middle).
   ============================================================ */
export function PoleMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="6"  y="4" width="4" height="24" rx="2" fill="var(--ink)" />
      <rect x="14" y="4" width="4" height="24" rx="2" fill="var(--clay)" />
      <rect x="22" y="4" width="4" height="24" rx="2" fill="var(--ink)" />
    </svg>
  )
}

/* ============================================================
   WORDMARK — Pole + "Barberbook" in display type.
   ============================================================ */
export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <PoleMark size={size + 6} />
      <span style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: size,
        letterSpacing: '-0.035em',
        color: 'var(--ink)',
        lineHeight: 1,
      }}>
        Barberbook
      </span>
    </span>
  )
}

/* ============================================================
   AVATAR
   ============================================================ */
export type AvatarProps = {
  initials?: string
  src?: string | null
  size?: number
  ring?: boolean
  ringColor?: string
  gradient?: string
}
export function Avatar({
  initials = '',
  src,
  size = 40,
  ring = false,
  ringColor = 'var(--clay)',
  gradient,
}: AvatarProps) {
  const grad = gradient || 'linear-gradient(135deg, #5A4D40 0%, #3A312A 100%)'
  const inner = (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: src ? `center/cover no-repeat url(${src}), ${grad}` : grad,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-body)', fontWeight: 600,
      fontSize: size * 0.36, lineHeight: 1, letterSpacing: '-0.02em',
      color: 'var(--paper-3)',
      border: ring ? '2px solid var(--paper)' : 'none',
      flexShrink: 0,
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      {!src && initials}
    </div>
  )
  if (!ring) return inner
  return (
    <div style={{
      width: size + 4, height: size + 4,
      padding: 2, borderRadius: '50%',
      background: ringColor,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, boxSizing: 'border-box',
    }}>{inner}</div>
  )
}

/* ============================================================
   BUTTON
   ============================================================ */
export type ButtonKind = 'hairline' | 'filled' | 'ink' | 'clay' | 'sage' | 'sageHair' | 'danger' | 'ghost' | 'soft'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type ButtonProps = {
  kind?: ButtonKind
  size?: ButtonSize
  children?: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  style?: CSSProperties
  disabled?: boolean
  leftIcon?: IconName
  rightIcon?: IconName
  type?: 'button' | 'submit' | 'reset'
}

export function Button({
  kind = 'hairline',
  size = 'md',
  children,
  onClick,
  style,
  disabled = false,
  leftIcon,
  rightIcon,
  type = 'button',
}: ButtonProps) {
  const base: CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    letterSpacing: '-0.005em',
    border: '1px solid var(--ink-25)',
    background: 'var(--paper)',
    color: 'var(--ink)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'transform 180ms var(--ease), background 120ms var(--ease), opacity 120ms var(--ease)',
    borderRadius: 10,
    opacity: disabled ? 0.4 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  }
  const sizes: Record<ButtonSize, CSSProperties> = {
    sm: { padding: '7px 13px', fontSize: 12.5, borderRadius: 8 },
    md: { padding: '11px 18px', fontSize: 14 },
    lg: { padding: '14px 20px', fontSize: 15 },
  }
  const kinds: Record<ButtonKind, CSSProperties> = {
    hairline: {},
    filled:   { background: 'var(--clay)', color: 'var(--paper-3)', borderColor: 'var(--clay)' },
    ink:      { background: 'var(--ink)', color: 'var(--paper-3)', borderColor: 'var(--ink)' },
    clay:     { background: 'var(--clay)', color: 'var(--paper-3)', borderColor: 'var(--clay)' },
    sage:     { background: 'var(--sage)', color: 'var(--paper-3)', borderColor: 'var(--sage)' },
    sageHair: { background: 'transparent', color: 'var(--sage)', borderColor: 'var(--sage)' },
    danger:   { borderColor: 'var(--rust)', color: 'var(--rust)', background: 'transparent' },
    ghost:    { borderColor: 'transparent', color: 'var(--ink-60)', background: 'transparent' },
    soft:     { background: 'var(--clay-soft)', color: 'var(--clay-deep)', borderColor: 'transparent' },
  }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{ ...base, ...sizes[size], ...kinds[kind], ...style }}
    >
      {leftIcon && <Icon name={leftIcon} size={size === 'sm' ? 14 : 16} />}
      {children}
      {rightIcon && <Icon name={rightIcon} size={size === 'sm' ? 14 : 16} />}
    </button>
  )
}

/* ============================================================
   ICON BUTTON
   ============================================================ */
export type IconBtnProps = {
  name: IconName
  size?: number
  color?: string
  onClick?: MouseEventHandler<HTMLButtonElement>
  label?: string
  badge?: number | string | null
  weight?: 'regular' | 'fill'
  style?: CSSProperties
}
export function IconBtn({
  name,
  size = 22,
  color = 'var(--ink)',
  onClick,
  label,
  badge = null,
  weight = 'regular',
  style,
}: IconBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        background: 'none', border: 'none', padding: 4, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color, fontFamily: 'inherit', position: 'relative',
        ...style,
      }}
    >
      <Icon name={name} size={size} color={color} weight={weight} />
      {badge != null && badge !== 0 && (
        <span style={{
          position: 'absolute', top: -2, right: -2,
          minWidth: 16, height: 16, padding: '0 4px',
          borderRadius: 9999, background: 'var(--clay)',
          color: 'var(--paper-2)', fontSize: 9.5, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1.5px solid var(--paper-3)',
        }}>{badge}</span>
      )}
    </button>
  )
}

/* ============================================================
   PILL
   ============================================================ */
export type PillTone = 'neutral' | 'success' | 'danger' | 'clay' | 'ink'
export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: PillTone }) {
  const tones: Record<PillTone, { bg: string; fg: string }> = {
    neutral: { bg: 'var(--ink-08)',   fg: 'var(--ink-60)'   },
    success: { bg: 'var(--sage-soft)', fg: '#5D6F50'         },
    danger:  { bg: 'var(--rust-soft)', fg: '#8A4530'         },
    clay:    { bg: 'var(--clay-soft)', fg: 'var(--clay-deep)' },
    ink:     { bg: 'var(--ink)',       fg: 'var(--linen)'     },
  }
  const t = tones[tone]
  return (
    <span style={{
      padding: '3px 9px',
      borderRadius: 9999,
      background: t.bg,
      color: t.fg,
      fontFamily: 'var(--font-body)',
      fontSize: 11,
      fontWeight: 500,
      lineHeight: 1.55,
      display: 'inline-block',
      letterSpacing: '-0.005em',
    }}>{children}</span>
  )
}

/* ============================================================
   MISC
   ============================================================ */
export function Hairline({ inset = 0 }: { inset?: number }) {
  return <div style={{ height: 1, background: 'var(--ink-08)', marginLeft: inset, marginRight: inset }} />
}

export function ClayRule({ width = 32 }: { width?: number }) {
  return <div style={{ height: 2, width, background: 'var(--clay)', borderRadius: 9999 }} />
}

export function Stat({ value, label }: { value: ReactNode; label: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, lineHeight: 1, color: 'var(--ink)', letterSpacing: '-0.022em' }}>{value}</span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, color: 'var(--ink-60)' }}>{label}</span>
    </div>
  )
}

export function SectionHeader({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '20px 20px 10px' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, letterSpacing: '-0.018em', color: 'var(--ink)' }}>{children}</span>
      {action}
    </div>
  )
}

/* ============================================================
   PHOTO BLOCK — warm gradient placeholder. Real photo wins when
   `src` is provided.
   ============================================================ */
export function PhotoBlock({
  aspect = '4/5',
  initials = '',
  label,
  src,
  style,
}: {
  aspect?: string
  initials?: string
  label?: string | null
  src?: string | null
  style?: CSSProperties
}) {
  return (
    <div style={{
      width: '100%', aspectRatio: aspect,
      background: src
        ? `center/cover no-repeat url(${src})`
        : 'linear-gradient(135deg, #5A4D40 0%, #2E2820 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      color: 'white',
      ...style,
    }}>
      {!src && initials && (
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: 56, color: 'rgba(237,233,225,0.10)',
          letterSpacing: '-0.04em',
        }}>{initials}</span>
      )}
      {label && (
        <div style={{
          position: 'absolute', left: 12, bottom: 12,
          padding: '4px 10px',
          background: 'rgba(46,40,32,0.55)',
          backdropFilter: 'blur(8px)',
          color: 'var(--linen)', fontSize: 11, fontWeight: 500, borderRadius: 9999,
        }}>{label}</div>
      )}
    </div>
  )
}
