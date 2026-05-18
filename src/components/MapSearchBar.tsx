import { useEffect, useState } from 'react'
import { C } from '../lib/colors'

interface Props {
  value:    string
  onChange: (v: string) => void
  delay?:   number
}

export function MapSearchBar({ value, onChange, delay = 250 }: Props) {
  const [local, setLocal] = useState(value)

  // Keep local input in sync if parent resets it (e.g. switching tab).
  useEffect(() => { setLocal(value) }, [value])

  useEffect(() => {
    if (local === value) return
    const id = window.setTimeout(() => onChange(local), delay)
    return () => window.clearTimeout(id)
  }, [local, value, onChange, delay])

  return (
    <div style={{
      position:  'absolute',
      top:       12,
      left:      12,
      right:     12,
      zIndex:    10,
      display:   'flex',
      alignItems: 'center',
      gap:       8,
      padding:   '8px 12px',
      borderRadius: 22,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
      border:    `0.5px solid ${C.border}`,
    }}>
      <i className="ti ti-search" style={{ fontSize: 16, color: C.muted, flexShrink: 0 }} />
      <input
        value={local}
        onChange={e => setLocal(e.target.value)}
        placeholder="Cerca barbieri o stili…"
        style={{
          flex:     1,
          minWidth: 0,
          border:   'none',
          background: 'transparent',
          outline:  'none',
          fontSize: 13,
          color:    C.text,
          fontFamily: 'inherit',
        }}
      />
      {local && (
        <button
          onClick={() => { setLocal(''); onChange('') }}
          aria-label="Cancella"
          style={{
            background: 'none',
            border:     'none',
            padding:    2,
            cursor:     'pointer',
            color:      C.muted,
            display:    'flex',
          }}
        >
          <i className="ti ti-x" style={{ fontSize: 14 }} />
        </button>
      )}
    </div>
  )
}
