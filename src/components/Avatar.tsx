import { C } from '../lib/colors'

interface AvatarProps {
  initials: string
  size?: number
  accent?: string
  ring?: boolean
}

export function Avatar({ initials, size = 40, accent, ring }: AvatarProps) {
  return (
    <div style={{
      width:           size,
      height:          size,
      borderRadius:    '50%',
      background:      accent ? accent + '22' : C.surface,
      border:          ring ? `2px solid ${C.accent}` : `0.5px solid ${C.border}`,
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      fontSize:        size * 0.32,
      fontWeight:      500,
      color:           accent ?? C.muted,
      flexShrink:      0,
    }}>
      {initials}
    </div>
  )
}
