import { useState } from 'react'
import { C } from '../lib/colors'
import { Icon } from './Icon'

interface Props {
  initialLat: number | null
  initialLng: number | null
  onSave:     (lat: number | null, lng: number | null) => Promise<void>
  onClose:    () => void
}

export function LocationSettingsSheet({ initialLat, initialLng, onSave, onClose }: Props) {
  const [lat, setLat]         = useState<number | null>(initialLat)
  const [lng, setLng]         = useState<number | null>(initialLng)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)

  function useCurrentLocation() {
    setError(null)
    if (!navigator.geolocation) {
      setError('Il browser non supporta la geolocalizzazione')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        setLoading(false)
      },
      err => {
        setLoading(false)
        if (err.code === err.PERMISSION_DENIED) setError('Permesso geolocalizzazione negato. Controlla le impostazioni del browser.')
        else if (err.code === err.POSITION_UNAVAILABLE) setError('Posizione non disponibile')
        else setError('Errore durante la richiesta della posizione')
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    )
  }

  async function handleSave(newLat: number | null, newLng: number | null) {
    setSaving(true)
    setError(null)
    try {
      await onSave(newLat, newLng)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Salvataggio fallito')
    } finally {
      setSaving(false)
    }
  }

  const hasLocation = lat != null && lng != null

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'absolute', inset: 0, background: 'var(--scrim)', display: 'flex', alignItems: 'flex-end', zIndex: 200, animation: 'scrimIn 200ms var(--ease)' }}
    >
      <div style={{
        background: C.bg, borderRadius: '20px 20px 0 0', width: '100%',
        boxShadow: 'var(--shadow-sheet)',
        animation: 'sheetUp 260ms var(--ease)',
      }}>
        <div style={{ width: 36, height: 4, background: C.border, borderRadius: 9999, margin: '10px auto 0' }} />

        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px 12px', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
            Posizione
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <Icon name="close" size={18} color={C.muted} />
          </button>
        </div>

        <div style={{ padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55 }}>
            La tua posizione viene usata per ordinare i barbieri vicini in Esplora. Resta privata e non viene mostrata ad altri utenti.
          </div>

          <div style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: C.surface, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Posizione salvata</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: C.text }}>
              {hasLocation ? `${lat!.toFixed(4)}, ${lng!.toFixed(4)}` : 'Non impostata'}
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12.5, color: C.red, padding: '10px 12px', borderRadius: 'var(--r-md)', background: C.redSoft }}>
              {error}
            </div>
          )}

          <button
            onClick={useCurrentLocation}
            disabled={loading || saving}
            style={{
              padding: 12, borderRadius: 'var(--r-md)',
              border: `1px solid ${C.borderMed}`,
              background: C.bg, color: C.text,
              fontSize: 14, fontWeight: 500,
              cursor: loading || saving ? 'default' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading
              ? <><Icon name="refresh" size={16} style={{ animation: 'spin .8s linear infinite' }} /> Rilevamento…</>
              : <><Icon name="pin" size={16} /> Usa la mia posizione attuale</>
            }
          </button>

          {hasLocation && (
            <button
              onClick={() => handleSave(null, null)}
              disabled={saving}
              style={{
                padding: 12, borderRadius: 'var(--r-md)',
                border: `1px solid ${C.red}`,
                background: 'transparent',
                color: C.red, fontSize: 13, fontWeight: 500,
                cursor: saving ? 'default' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Rimuovi posizione
            </button>
          )}

          <button
            onClick={() => handleSave(lat, lng)}
            disabled={saving || (lat === initialLat && lng === initialLng)}
            style={{
              padding: 13, borderRadius: 'var(--r-md)',
              background: (saving || (lat === initialLat && lng === initialLng)) ? C.surface : 'var(--clay)',
              color:      (saving || (lat === initialLat && lng === initialLng)) ? C.muted : 'var(--paper-3)',
              border: `1px solid ${(saving || (lat === initialLat && lng === initialLng)) ? C.border : 'var(--clay)'}`,
              fontSize: 14, fontWeight: 500,
              cursor: (saving || (lat === initialLat && lng === initialLng)) ? 'default' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saving
              ? <><Icon name="refresh" size={16} style={{ animation: 'spin .8s linear infinite' }} /> Salvataggio…</>
              : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}
