import { useState } from 'react'
import { C } from '../lib/colors'

interface Props {
  imageUrl?:         string
  fallbackAccent?:   string
  fallbackIconSize?: number
  fallbackOpacity?:  number
  withBorder?:       boolean
  children?:         React.ReactNode
}

/**
 * Container for a single post image. Modern Minimal: photographs render
 * straight on a neutral surface, no warm overlay, no grain.
 * Aspect starts at 1/1 and settles to 1/1 (landscape) or 3/4 (portrait)
 * after onLoad.
 */
export function PostMedia({
  imageUrl,
  fallbackIconSize = 48,
  withBorder       = false,
  children,
}: Props) {
  const [aspect, setAspect] = useState<string>('1 / 1')

  return (
    <div style={{
      width:           '100%',
      aspectRatio:     aspect,
      background:      C.surfaceAlt,
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      position:        'relative',
      overflow:        'hidden',
      borderTop:       withBorder ? `1px solid ${C.border}` : undefined,
      borderBottom:    withBorder ? `1px solid ${C.border}` : undefined,
    }}>
      {imageUrl
        ? <img
            src={imageUrl}
            onLoad={e => {
              const img = e.currentTarget
              if (img.naturalWidth && img.naturalHeight) {
                setAspect(img.naturalWidth >= img.naturalHeight ? '1 / 1' : '3 / 4')
              }
            }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        : <i className="ph-thin ph-scissors" style={{ fontSize: fallbackIconSize, color: C.hint }} />
      }
      {children}
    </div>
  )
}
