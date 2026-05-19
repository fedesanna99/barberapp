import { C } from '../lib/colors'
import { Icon, type IconName } from './Icon'

export type DiscoverView = 'map' | 'list'

interface Props {
  value:    DiscoverView
  onChange: (v: DiscoverView) => void
}

export function MapListToggle({ value, onChange }: Props) {
  const items: { id: DiscoverView; icon: IconName; label: string }[] = [
    { id: 'map',  icon: 'map',  label: 'Mappa' },
    { id: 'list', icon: 'list', label: 'Lista' },
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
      boxShadow: 'var(--shadow-lift)',
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
              background: active ? 'var(--clay)' : 'transparent',
              color:      active ? 'var(--paper-3)' : C.muted,
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all 120ms var(--ease)',
            }}
          >
            <Icon name={it.icon} size={16} />
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
