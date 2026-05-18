import { useState } from 'react'
import { C } from '../lib/colors'

interface Props {
  imageUrl?:         string
  fallbackAccent:    string
  fallbackIconSize?: number
  fallbackOpacity?:  number
  withBorder?:       boolean
  children?:         React.ReactNode
}

/**
 * Container for a single post image with an orientation-aware aspect ratio:
 *   - landscape (w > h)    → 1 / 1 (square)
 *   - portrait  (w < h)    → 3 / 4
 * The image is rendered with object-fit: cover, so landscape uploads get
 * cropped on the sides (square frame) and portrait uploads get cropped a
 * little top/bottom.
 *
 * The aspect starts at 1 / 1 (most common case for square uploads) and
 * settles to its real value after onLoad, which causes at most one layout
 * shift for non-square images.
 */
export function PostMedia({
  imageUrl,
  fallbackAccent,
  fallbackIconSize = 52,
  fallbackOpacity  = 0.35,
  withBorder       = false,
  children,
}: Props) {
  const [aspect, setAspect] = useState<string>('1 / 1')

  return (
    <div style={{
      width:           '100%',
      aspectRatio:     aspect,
      background:      fallbackAccent + '18',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      position:        'relative',
      overflow:        'hidden',
      borderTop:       withBorder ? `0.5px solid ${C.border}` : undefined,
      borderBottom:    withBorder ? `0.5px solid ${C.border}` : undefined,
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
        : <i className="ti ti-scissors" style={{ fontSize: fallbackIconSize, color: fallbackAccent, opacity: fallbackOpacity }} />
      }
      {children}
    </div>
  )
}
