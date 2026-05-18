import { useEffect, useState } from 'react'
import { C } from '../lib/colors'

interface Props {
  value:    string
  onChange: (v: string) => void
  delay?:   number
}

export function MapSearchBar({ value, onChange, delay = 250 }: Props) {
  const [local, setLocal] = useState(value)

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
      gap:       10,
      padding:   '10px 14px',
      borderRadius: 'var(--r-md)',
      background: C.bg,
      boxShadow: '0 4px 14px rgba(10,10,10,0.10), 0 0 0 1px rgba(10,10,10,0.06)',
    }}>
      <i className="ph-thin ph-magnifying-glass" style={{ fontSize: 18, color: C.muted, flexShrink: 0 }} />
      <input
        value={local}
        onChange={e => setLocal(e.target.value)}
        placeholder="Cerca un barbiere, una via…"
        style={{
          flex:     1,
          minWidth: 0,
          border:   'none',
          background: 'transparent',
          outline:  'none',
          fontSize: 14,
          color:    C.text,
          fontFamily: 'inherit',
        }}
      />
      {local && (
        <button
          onClick={() => { setLocal(''); onChange('') }}
          aria-label="Cancella"
          style={{
            background: 'none', border: 'none', padding: 2,
            cursor: 'pointer', color: C.muted, display: 'flex',
          }}
        >
          <i className="ph-thin ph-x" style={{ fontSize: 14 }} />
        </button>
      )}
    </div>
  )
}
