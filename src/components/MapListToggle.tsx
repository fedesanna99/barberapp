import { C } from '../lib/colors'

export type DiscoverView = 'map' | 'list'

interface Props {
  value:    DiscoverView
  onChange: (v: DiscoverView) => void
}

export function MapListToggle({ value, onChange }: Props) {
  const items: { id: DiscoverView; icon: string; label: string }[] = [
    { id: 'map',  icon: 'ti-map',  label: 'Mappa' },
    { id: 'list', icon: 'ti-list', label: 'Lista' },
  ]
  return (
    <div style={{
      position:  'absolute',
      top:       64,
      right:     12,
      zIndex:    10,
      display:   'flex',
      padding:   3,
      borderRadius: 22,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
      border:    `0.5px solid ${C.border}`,
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
              display:        'flex',
              alignItems:     'center',
              gap:            4,
              padding:        '6px 12px',
              borderRadius:   18,
              border:         'none',
              background:     active ? C.text : 'transparent',
              color:          active ? C.bg   : C.muted,
              fontSize:       12,
              fontWeight:     500,
              cursor:         'pointer',
              fontFamily:     'inherit',
              transition:     'all .15s',
            }}
          >
            <i className={`ti ${it.icon}`} style={{ fontSize: 14 }} />
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
