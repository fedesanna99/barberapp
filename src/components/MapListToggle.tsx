import { C } from '../lib/colors'

export type DiscoverView = 'map' | 'list'

interface Props {
  value:    DiscoverView
  onChange: (v: DiscoverView) => void
}

export function MapListToggle({ value, onChange }: Props) {
  const items: { id: DiscoverView; icon: string; label: string }[] = [
    { id: 'map',  icon: 'ph-thin ph-map-trifold', label: 'Mappa' },
    { id: 'list', icon: 'ph-thin ph-list',        label: 'Lista' },
  ]
  return (
    <div style={{
      position:  'absolute',
      top:       70,
      right:     12,
      zIndex:    10,
      display:   'flex',
      padding:   3,
      borderRadius: 'var(--r-md)',
      background: C.bg,
      boxShadow: '0 4px 14px rgba(10,10,10,0.10), 0 0 0 1px rgba(10,10,10,0.06)',
    }}>
      {items.map(it => {
        const active = value === it.id
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            aria-label={it.label}
            aria-pressed={active}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 8, border: 'none',
              background: active ? C.text : 'transparent',
              color:      active ? C.bg   : C.muted,
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all 120ms var(--ease)',
            }}
          >
            <i className={it.icon} style={{ fontSize: 16 }} />
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
