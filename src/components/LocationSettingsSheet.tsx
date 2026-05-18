import { useState } from 'react'
import { C } from '../lib/colors'

interface Props {
  initialLat: number | null
  initialLng: number | null
  onSave: (lat: number | null, lng: number | null) => Promise<void>
  onClose: () => void
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
      style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}
    >
      <div style={{ background: C.bg, borderRadius: '20px 20px 0 0', width: '100%', animation: 'sheetUp .3s ease-out' }}>
        <div style={{ width: 40, height: 4, background: C.borderMed, borderRadius: 2, margin: '12px auto 0' }} />

        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 10px', borderBottom: `0.5px solid ${C.border}` }}>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: C.text }}>Impostazioni posizione</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <i className="ti ti-x" style={{ fontSize: 18, color: C.muted }} />
          </button>
        </div>

        <div style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.45 }}>
            La tua posizione viene usata per ordinare i barbieri vicini in Esplora. Resta privata e non viene mostrata ad altri utenti.
          </div>

          <div style={{ padding: '10px 12px', borderRadius: 10, background: C.surface, border: `0.5px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Posizione salvata</div>
            <div style={{ fontSize: 13, color: C.text, fontFamily: 'monospace' }}>
              {hasLocation
                ? `${lat!.toFixed(4)}, ${lng!.toFixed(4)}`
                : 'Non impostata'}
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#E53935', padding: '8px 12px', borderRadius: 8, background: '#FFEBEE' }}>
              {error}
            </div>
          )}

          <button
            onClick={useCurrentLocation}
            disabled={loading || saving}
            style={{
              padding: 12, borderRadius: 12,
              border: `1.5px solid ${C.accent}`,
              background: C.accentLight,
              color: C.accent, fontSize: 14, fontWeight: 600,
              cursor: loading || saving ? 'default' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading
              ? <><i className="ti ti-loader-2" style={{ fontSize: 16, animation: 'spin 0.8s linear infinite' }} /> Rilevamento…</>
              : <><i className="ti ti-current-location" style={{ fontSize: 16 }} /> Usa la mia posizione attuale</>
            }
          </button>

          {hasLocation && (
            <button
              onClick={() => handleSave(null, null)}
              disabled={saving}
              style={{
                padding: 12, borderRadius: 12,
                border: `1px solid ${C.borderMed}`,
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
              padding: 13, borderRadius: 12,
              background: (saving || (lat === initialLat && lng === initialLng)) ? C.borderMed : C.text,
              color: C.bg, fontSize: 14, fontWeight: 500,
              border: 'none',
              cursor: (saving || (lat === initialLat && lng === initialLng)) ? 'default' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saving
              ? <><i className="ti ti-loader-2" style={{ fontSize: 16, animation: 'spin 0.8s linear infinite' }} /> Salvataggio…</>
              : 'Salva'
            }
          </button>
        </div>
      </div>
    </div>
  )
}
