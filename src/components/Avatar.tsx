import { C } from '../lib/colors'
import { PhotoImage } from './PhotoImage'

interface AvatarProps {
  initials: string
  size?:    number
  accent?:  string
  ring?:    boolean
  photo?:   string | null
  photoFit?: React.CSSProperties['objectFit']
}

/**
 * Modern Minimal avatar — flat surface for initials, optional coral ring for
 * "stories" / followed barbers, optional photograph background.
 *
 * The `accent` prop is preserved for back-compat with existing callers that
 * pass a barber's tinted color; in the new system we ignore the tint and
 * stay on the carta-3 chip so the UI stays quiet.
 */
export function Avatar({ initials, size = 40, ring = false, photo = null, photoFit = 'cover' }: AvatarProps) {
  const inner = (
    <div style={{
      width:           size,
      height:          size,
      borderRadius:    '50%',
      background:      photo && photoFit === 'cover' ? '#1A1A1A' : C.surfaceAlt,
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      position:        'relative',
      overflow:        'hidden',
      fontFamily:      'var(--font-display)',
      fontWeight:      600,
      fontSize:        size * 0.36,
      lineHeight:      1,
      letterSpacing:   '-0.02em',
      color:           photo ? C.bg : C.text,
      border:          ring ? `2px solid ${C.bg}` : 'none',
      flexShrink:      0,
    }}>
      {photo
        ? <PhotoImage src={photo} fit={photoFit} position={photoFit === 'cover' ? 'center 38%' : 'center'} />
        : initials
      }
    </div>
  )
  if (!ring) return inner
  return (
    <div style={{ padding: 2, borderRadius: '50%', background: C.accent, flexShrink: 0 }}>
      {inner}
    </div>
  )
}
