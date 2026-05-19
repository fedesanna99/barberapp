import { useState } from 'react'
import { C } from '../lib/colors'
import { Icon } from './Icon'

interface Props {
  value:        number
  onChange?:    (v: number) => void
  size?:        number
  color?:       string
  emptyColor?:  string
  gap?:         number
  disabled?:    boolean
}

/**
 * 1–5 star control with half-star precision (clip overlay).
 * Active star uses the clay accent by default.
 */
export function StarRating({
  value,
  onChange,
  size = 22,
  color = C.accent,
  emptyColor,
  gap = 4,
  disabled = false,
}: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const interactive = !!onChange && !disabled
  const display = hover ?? value
  const outline = emptyColor ?? C.hint

  return (
    <div
      style={{ display: 'inline-flex', gap, alignItems: 'center' }}
      onMouseLeave={() => interactive && setHover(null)}
    >
      {[1, 2, 3, 4, 5].map(i => {
        const fill = Math.max(0, Math.min(1, display - (i - 1)))
        return (
          <button
            key={i}
            type="button"
            onMouseEnter={() => interactive && setHover(i)}
            onFocus={() => interactive && setHover(i)}
            onClick={() => interactive && onChange?.(i)}
            disabled={!interactive}
            style={{
              position: 'relative',
              width:  size,
              height: size,
              padding: 0,
              border: 'none',
              background: 'none',
              cursor: interactive ? 'pointer' : 'default',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'inherit',
              lineHeight: 1,
            }}
          >
            <Icon name="star" size={size} color={outline} style={{ position: 'absolute', inset: 0, margin: 'auto' }} />
            {fill > 0 && (
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: size,
                  width: `${fill * 100}%`,
                  overflow: 'hidden',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                }}
              >
                <Icon name="star" size={size} color={color} weight="fill" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
