import { useState } from 'react'
import { C } from '../lib/colors'

interface Props {
  value:        number            // 0..5; fractional values render as a partial last star (read-only mode only)
  onChange?:    (v: number) => void
  size?:        number
  color?:       string
  emptyColor?:  string
  gap?:         number
  disabled?:    boolean
}

/**
 * 1–5 star control. When `onChange` is provided it's interactive (taps set
 * the integer rating, hover previews on desktop). Without `onChange` it's
 * a read-only display that supports half-star precision via clip-path so
 * we can render the barber's average like 4.7 properly.
 */
export function StarRating({
  value,
  onChange,
  size = 22,
  color = '#EF9F27',
  emptyColor,
  gap = 4,
  disabled = false,
}: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const interactive = !!onChange && !disabled
  const display = hover ?? value
  // Outline (empty) stars: use the muted text color so they're visible in
  // both light and dark mode. `C.border` was too faint and looked invisible.
  const outline = emptyColor ?? C.muted

  return (
    <div
      style={{ display: 'inline-flex', gap, alignItems: 'center' }}
      onMouseLeave={() => interactive && setHover(null)}
    >
      {[1, 2, 3, 4, 5].map(i => {
        // For each star compute how full it should be (0..1)
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
            {/* Empty (outline) star — always visible */}
            <i className="ti ti-star" style={{ fontSize: size, color: outline, position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
            {/* Filled overlay, clipped horizontally so we can render half-stars.
                NB: do NOT use `inset: 0` here — that pins right: 0 too and the
                explicit `width: fill%` is ignored, so every star looks full. */}
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
                <i
                  className="ti ti-star-filled"
                  style={{
                    fontSize: size,
                    color,
                    width: size,
                    height: size,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
