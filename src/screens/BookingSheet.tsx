import { useState, useMemo } from 'react'
import { C } from '../lib/colors'
import { SLOTS, TAKEN_INDICES, getNext7Days } from '../lib/demoData'
import type { DemoBarber, DemoDate } from '../lib/demoData'
import { useAvailability } from '../hooks/useAvailability'
import { useBarberDefaults } from '../hooks/useBarberDefaults'
import { IS_DEMO } from '../lib/supabase'
import { ratingDisplay } from '../lib/rating'

interface BookingSheetProps {
  barber:    DemoBarber
  onClose:   () => void
  onConfirm: (barber: DemoBarber, date: DemoDate, time: string) => void
}

const DEMO_TAKEN = new Set(SLOTS.filter((_, i) => TAKEN_INDICES.has(i)))

export function BookingSheet({ barber, onClose, onConfirm }: BookingSheetProps) {
  const dates = useMemo(() => getNext7Days(), [])
  const [selDate, setSelDate] = useState(0)
  const [selTime, setSelTime] = useState<string | null>(null)
  const [step, setStep]       = useState<'datetime' | 'confirm'>('datetime')

  const barberId = IS_DEMO ? undefined : String(barber.id)
  const { slotMinutes, price } = useBarberDefaults(barberId)
  const { slots, booked, loading } = useAvailability(barberId, dates[selDate].date, slotMinutes)
  const priceFmt = `€ ${Number.isInteger(price) ? price : price.toFixed(2)}`

  const effectiveSlots  = IS_DEMO ? SLOTS  : slots
  const effectiveBooked = IS_DEMO ? DEMO_TAKEN : booked

  const rd = ratingDisplay({ rating: barber.rating, reviewsCount: barber.reviewsCount })
  const service = barber.tags?.[0] ?? 'Taglio classico'

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'absolute', inset: 0, background: 'var(--scrim)', display: 'flex', alignItems: 'flex-end', zIndex: 100, animation: 'scrimIn 200ms var(--ease)' }}
    >
      <div style={{
        background: C.bg, borderRadius: '20px 20px 0 0', width: '100%',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 18px)',
        maxHeight: '92%', overflowY: 'auto',
        boxShadow: 'var(--shadow-sheet)',
        animation: 'sheetUp 260ms var(--ease)',
      }}>
        <div style={{ width: 36, height: 4, background: C.border, borderRadius: 9999, margin: '10px auto 14px' }} />

        {step === 'datetime' ? (
          <>
            {/* Header */}
            <div style={{ padding: '0 20px 4px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>Prenota un appuntamento</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-0.025em', margin: '4px 0 0', color: C.text }}>
                  con {barber.name}
                </h2>
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ph-thin ph-map-pin" style={{ fontSize: 14, color: C.accent }} />
                  {barber.city}
                  {rd.hasReviews && (
                    <>
                      <span style={{ color: C.borderMed }}>·</span>
                      <i className="ph-fill ph-star" style={{ fontSize: 12, color: C.accent }} />
                      <span style={{ fontWeight: 600, color: C.text }}>{rd.label}</span>
                    </>
                  )}
                </div>
              </div>
              <button onClick={onClose} aria-label="Chiudi" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: C.muted }}>
                <i className="ph-thin ph-x" style={{ fontSize: 20 }} />
              </button>
            </div>

            {/* Service summary */}
            <div style={{
              margin: '16px 20px 22px', padding: '14px 16px',
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 'var(--r-md)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ph-thin ph-scissors" style={{ fontSize: 20, color: C.accentDeep }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{service}</div>
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>{slotMinutes} min · {priceFmt}</div>
              </div>
            </div>

            {/* Date strip */}
            <div style={{ padding: '0 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
                Scegli la data
              </span>
              <span style={{ fontSize: 11.5, color: C.hint }}>prossimi 7 giorni</span>
            </div>
            <div style={{ display: 'flex', gap: 6, padding: '0 20px 22px', overflowX: 'auto' }}>
              {dates.map((d, i) => {
                const sel = selDate === i
                return (
                  <button
                    key={i}
                    onClick={() => { setSelDate(i); setSelTime(null) }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      padding: '10px 14px', minWidth: 56, cursor: 'pointer',
                      background: sel ? C.text : C.surface,
                      color:      sel ? C.bg   : C.text,
                      border: `1px solid ${sel ? C.text : C.border}`,
                      borderRadius: 'var(--r-md)', flexShrink: 0,
                      transition: 'all 120ms var(--ease)', fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: 10.5, fontWeight: 500, opacity: 0.7 }}>{d.day}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, lineHeight: 1.15, marginTop: 2, letterSpacing: '-0.02em' }}>{d.num}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 500, opacity: 0.6, marginTop: 1 }}>{d.month}</span>
                  </button>
                )
              })}
            </div>

            {/* Slot grid */}
            <div style={{ padding: '0 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
                Slot disponibili
              </span>
              {!loading && effectiveSlots.length > 0 && (
                <span style={{ fontSize: 11.5, color: C.hint }}>
                  {effectiveSlots.length - [...effectiveBooked].filter(t => effectiveSlots.includes(t)).length} liberi su {effectiveSlots.length}
                </span>
              )}
            </div>
            <div style={{ padding: '0 20px 22px', minHeight: 80 }}>
              {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} style={{ height: 44, borderRadius: 'var(--r-md)', background: C.surface, animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.07}s` }} />
                  ))}
                </div>
              ) : effectiveSlots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: C.muted, fontSize: 13 }}>
                  <i className="ph-thin ph-calendar-x" style={{ fontSize: 28, display: 'block', marginBottom: 8, color: C.hint }} />
                  Nessuna disponibilità per questo giorno
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {effectiveSlots.map(t => {
                    const taken = effectiveBooked.has(t)
                    const sel   = selTime === t
                    return (
                      <button
                        key={t}
                        disabled={taken}
                        onClick={() => !taken && setSelTime(t)}
                        style={{
                          padding: '12px 0', textAlign: 'center',
                          fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500,
                          border: `1px solid ${sel ? C.text : C.border}`,
                          background: sel ? C.text : C.surface,
                          color: sel ? C.bg : taken ? C.hint : C.text,
                          textDecoration: taken ? 'line-through' : 'none',
                          borderRadius: 'var(--r-md)', cursor: taken ? 'not-allowed' : 'pointer',
                          transition: 'all 120ms var(--ease)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ padding: '0 20px' }}>
              <button
                onClick={() => { if (selTime !== null) setStep('confirm') }}
                disabled={selTime === null}
                style={{
                  width: '100%', padding: '14px 20px', borderRadius: 'var(--r-md)',
                  background:  selTime !== null ? C.text : C.surface,
                  color:       selTime !== null ? C.bg : C.hint,
                  border: `1px solid ${selTime !== null ? C.text : C.border}`,
                  fontSize: 14.5, fontWeight: 500,
                  cursor: selTime !== null ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                }}
              >
                {selTime !== null ? `Continua — ${selTime}` : 'Scegli un orario'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: '0 20px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setStep('datetime')} aria-label="Indietro"
                style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: C.muted, display: 'flex' }}>
                <i className="ph-thin ph-arrow-left" style={{ fontSize: 20 }} />
              </button>
              <div style={{ flex: 1, fontSize: 12, color: C.muted, fontWeight: 500 }}>Conferma</div>
              <button onClick={onClose} aria-label="Chiudi"
                style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: C.muted, display: 'flex' }}>
                <i className="ph-thin ph-x" style={{ fontSize: 20 }} />
              </button>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 24, letterSpacing: '-0.025em', margin: '10px 20px 4px', color: C.text }}>
              Tutto a posto?
            </h2>
            <p style={{ margin: '0 20px 18px', fontSize: 13, color: C.muted }}>
              Riepilogo del tuo appuntamento. Tocca conferma per fissarlo.
            </p>

            <div style={{ margin: '0 20px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 'var(--r-md)', padding: '4px 16px' }}>
              {[
                ['Barbiere', barber.name, 'display'],
                ['Servizio', service,     'body'],
                ['Data',     `${dates[selDate].day} ${dates[selDate].num} ${dates[selDate].month}`, 'body'],
                ['Ora',      selTime!,    'mono'],
                ['Durata',   `${slotMinutes} min`, 'mono'],
                ['Prezzo',   priceFmt,    'mono'],
              ].map(([k, v, kind], i, arr) => (
                <div key={k} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  padding: '12px 0',
                  borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                }}>
                  <span style={{ fontSize: 12.5, color: C.muted, fontWeight: 500 }}>{k}</span>
                  <span style={{
                    fontFamily: kind === 'display' ? 'var(--font-display)' : kind === 'mono' ? 'var(--font-mono)' : 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: kind === 'display' ? 16 : 13.5,
                    letterSpacing: kind === 'display' ? '-0.02em' : 0,
                    color: C.text,
                  }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: '0 20px 14px', fontSize: 12, color: C.muted, lineHeight: 1.55 }}>
              Cancellazione gratuita fino a 2 ore prima dell'appuntamento. Riceverai un promemoria la sera prima.
            </div>

            <div style={{ padding: '0 20px' }}>
              <button
                onClick={() => onConfirm(barber, dates[selDate], selTime!)}
                style={{
                  width: '100%', padding: '14px 20px', borderRadius: 'var(--r-md)',
                  background: C.accent, color: C.bg,
                  border: `1px solid ${C.accent}`,
                  fontSize: 14.5, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Conferma appuntamento
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
