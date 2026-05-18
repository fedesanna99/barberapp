import { useState, useMemo } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { SLOTS, TAKEN_INDICES, getNext7Days } from '../lib/demoData'
import type { DemoBarber, DemoDate } from '../lib/demoData'
import { useAvailability } from '../hooks/useAvailability'
import { useBarberDefaults } from '../hooks/useBarberDefaults'
import { IS_DEMO } from '../lib/supabase'
import { ratingDisplay } from '../lib/rating'

interface BookingSheetProps {
  barber: DemoBarber
  onClose: () => void
  onConfirm: (barber: DemoBarber, date: DemoDate, time: string) => void
}

// Demo fallback: convert index-based TAKEN_INDICES to a set of slot strings
const DEMO_TAKEN = new Set(SLOTS.filter((_, i) => TAKEN_INDICES.has(i)))

export function BookingSheet({ barber, onClose, onConfirm }: BookingSheetProps) {
  const dates = useMemo(() => getNext7Days(), [])
  const [selDate, setSelDate] = useState(0)
  const [selTime, setSelTime] = useState<string | null>(null)
  const [step, setStep]       = useState<'datetime' | 'confirm'>('datetime')

  // In demo mode pass undefined so the hook skips DB calls entirely.
  // In production the barber.id would be a real UUID string.
  const barberId = IS_DEMO ? undefined : String(barber.id)
  const { slotMinutes, price } = useBarberDefaults(barberId)
  const { slots, booked, loading } = useAvailability(barberId, dates[selDate].date, slotMinutes)
  const priceFmt = `~€${Number.isInteger(price) ? price : price.toFixed(2)}`

  const effectiveSlots  = IS_DEMO ? SLOTS  : slots
  const effectiveBooked = IS_DEMO ? DEMO_TAKEN : booked

  function handleDateChange(i: number) {
    setSelDate(i)
    setSelTime(null)
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      onClick={handleOverlayClick}
      style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}
    >
      <div style={{ background: C.bg, borderRadius: '20px 20px 0 0', width: '100%', paddingBottom: 20, maxHeight: '92%', overflowY: 'auto', animation: 'sheetUp .3s ease-out' }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: C.borderMed, borderRadius: 2, margin: '12px auto 8px' }} />

        {step === 'datetime' ? (
          <>
            {/* Header */}
            <div style={{ padding: '8px 16px 4px' }}>
              <div style={{ fontSize: 18, fontWeight: 500, color: C.text }}>Prenota con {barber.name}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                {barber.city} ·{' '}
                {(() => {
                  const rd = ratingDisplay({ rating: barber.rating, reviewsCount: barber.reviewsCount })
                  return (
                    <>
                      <i className={`ti ${rd.hasReviews ? 'ti-star-filled' : 'ti-star'}`} style={{ fontSize: 11, color: rd.hasReviews ? '#EF9F27' : C.hint }} />
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{rd.label}</span>
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Barber summary card */}
            <div style={{ margin: '10px 16px 14px', padding: '10px 14px', background: barber.accent + '15', borderRadius: 12, border: `0.5px solid ${barber.accent}40`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar initials={barber.initials} size={40} accent={barber.accent} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{barber.tags.join(' · ')}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>Sessione {slotMinutes} min · {priceFmt}</div>
              </div>
            </div>

            {/* Date picker */}
            <div style={{ padding: '0 16px 8px', fontSize: 12, fontWeight: 500, color: C.text }}>Scegli la data</div>
            <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px', overflowX: 'auto' }}>
              {dates.map((d, i) => (
                <button
                  key={i}
                  onClick={() => handleDateChange(i)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '8px 10px', borderRadius: 12,
                    border: `0.5px solid ${selDate === i ? C.text : C.border}`,
                    background: selDate === i ? C.text : C.bg,
                    cursor: 'pointer', minWidth: 50, transition: 'all .15s', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 10, color: selDate === i ? C.bg : C.hint }}>{d.day}</span>
                  <span style={{ fontSize: 17, fontWeight: 500, color: selDate === i ? C.bg : C.text, marginTop: 1 }}>{d.num}</span>
                  <span style={{ fontSize: 9, color: selDate === i ? 'rgba(255,255,255,.7)' : C.hint }}>{d.month}</span>
                </button>
              ))}
            </div>

            {/* Slot header */}
            <div style={{ padding: '0 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: C.text }}>Slot disponibili</span>
              <span style={{ fontSize: 11, color: C.hint, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: C.hint, opacity: .3, display: 'inline-block' }} />
                Occupato
              </span>
            </div>

            {/* Time grid */}
            <div style={{ padding: '0 16px 16px', minHeight: 80 }}>
              {loading ? (
                // Loading skeleton
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} style={{ height: 40, borderRadius: 10, background: C.surface, animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.07}s` }} />
                  ))}
                </div>
              ) : effectiveSlots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: C.hint, fontSize: 13 }}>
                  <i className="ti ti-calendar-off" style={{ fontSize: 28, display: 'block', marginBottom: 6 }} />
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
                        onClick={() => !taken && setSelTime(t)}
                        style={{
                          padding: '10px 0',
                          border:      `0.5px solid ${sel ? C.text : C.border}`,
                          borderRadius: 10,
                          textAlign:   'center',
                          fontSize:    13,
                          cursor:      taken ? 'not-allowed' : 'pointer',
                          color:       sel ? C.bg : taken ? C.hint : C.text,
                          background:  sel ? C.text : C.bg,
                          opacity:     taken ? 0.3 : 1,
                          transition:  'all .15s',
                          fontFamily:  'inherit',
                        }}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Continue button */}
            <div style={{ padding: '0 16px' }}>
              <button
                onClick={() => { if (selTime !== null) setStep('confirm') }}
                disabled={selTime === null}
                style={{
                  width: '100%', padding: 14, borderRadius: 12,
                  background:  selTime !== null ? C.text : C.surface,
                  color:       selTime !== null ? C.bg : C.hint,
                  fontSize:    15, fontWeight: 500, border: 'none',
                  cursor:      selTime !== null ? 'pointer' : 'not-allowed',
                  fontFamily:  'inherit', transition: 'all .2s',
                }}
              >
                {selTime !== null ? `Continua → ${selTime}` : 'Scegli un orario'}
              </button>
            </div>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <span onClick={onClose} style={{ fontSize: 12, color: C.hint, cursor: 'pointer' }}>Annulla</span>
            </div>
          </>
        ) : (
          <>
            {/* Confirm step */}
            <div style={{ padding: '16px 16px 8px' }}>
              <button
                onClick={() => setStep('datetime')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 13, padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit', marginBottom: 12 }}
              >
                <i className="ti ti-arrow-left" style={{ fontSize: 16 }} /> Indietro
              </button>
              <div style={{ fontSize: 18, fontWeight: 500, color: C.text }}>Conferma appuntamento</div>
            </div>

            {/* Details card */}
            <div style={{ margin: '8px 16px 16px', padding: '14px 16px', background: C.surface, borderRadius: 14, border: `0.5px solid ${C.border}` }}>
              {[
                ['Barbiere', barber.name],
                ['Data',     `${dates[selDate].day}, ${dates[selDate].num} ${dates[selDate].month}`],
                ['Ora',      selTime!],
                ['Servizio', barber.tags[0]],
                ['Durata',   `${slotMinutes} min`],
                ['Prezzo',   priceFmt],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `0.5px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.muted }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: '0 16px 12px', fontSize: 12, color: C.hint }}>
              Cancellazione gratuita fino a 2h prima dell'appuntamento.
            </div>

            <div style={{ padding: '0 16px' }}>
              <button
                onClick={() => onConfirm(barber, dates[selDate], selTime!)}
                style={{
                  width: '100%', padding: 15, borderRadius: 12,
                  background: C.green, color: '#fff',
                  fontSize: 15, fontWeight: 500, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <i className="ti ti-calendar-check" style={{ fontSize: 18 }} />
                Conferma appuntamento
              </button>
            </div>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <span onClick={onClose} style={{ fontSize: 12, color: C.hint, cursor: 'pointer' }}>Annulla</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
