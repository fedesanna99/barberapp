import { useState } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { SLOTS, TAKEN_INDICES, getNext7Days } from '../lib/demoData'
import type { DemoBarber, DemoDate } from '../lib/demoData'

interface BookingSheetProps {
  barber: DemoBarber
  onClose: () => void
  onConfirm: (barber: DemoBarber, date: DemoDate, time: string) => void
}

export function BookingSheet({ barber, onClose, onConfirm }: BookingSheetProps) {
  const dates = getNext7Days()
  const [selDate, setSelDate] = useState(0)
  const [selTime, setSelTime] = useState<number | null>(null)
  const [step, setStep]       = useState<'datetime' | 'confirm'>('datetime')

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
              <div style={{ fontSize: 18, fontWeight: 500, color: C.text }}>Book with {barber.name}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                {barber.city} ·{' '}
                <i className="ti ti-star-filled" style={{ fontSize: 11, color: '#EF9F27' }} />
                <span style={{ fontSize: 12, fontWeight: 500 }}>{barber.rating}</span>
              </div>
            </div>

            {/* Barber summary card */}
            <div style={{ margin: '10px 16px 14px', padding: '10px 14px', background: barber.accent + '15', borderRadius: 12, border: `0.5px solid ${barber.accent}40`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar initials={barber.initials} size={40} accent={barber.accent} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{barber.tags.join(' · ')}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>30 min session · ~€25</div>
              </div>
            </div>

            {/* Date picker */}
            <div style={{ padding: '0 16px 8px', fontSize: 12, fontWeight: 500, color: C.text }}>Select date</div>
            <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px', overflowX: 'auto' }}>
              {dates.map((d, i) => (
                <button
                  key={i}
                  onClick={() => { setSelDate(i); setSelTime(null) }}
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
              <span style={{ fontSize: 12, fontWeight: 500, color: C.text }}>Available slots</span>
              <span style={{ fontSize: 11, color: C.hint, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: C.hint, opacity: .3, display: 'inline-block' }} />
                Taken
              </span>
            </div>

            {/* Time grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '0 16px 16px' }}>
              {SLOTS.map((t, i) => {
                const taken = TAKEN_INDICES.has(i)
                const sel   = selTime === i
                return (
                  <button
                    key={i}
                    onClick={() => !taken && setSelTime(i)}
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
                {selTime !== null ? `Continue → ${SLOTS[selTime]}` : 'Select a time slot'}
              </button>
            </div>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <span onClick={onClose} style={{ fontSize: 12, color: C.hint, cursor: 'pointer' }}>Cancel</span>
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
                <i className="ti ti-arrow-left" style={{ fontSize: 16 }} /> Back
              </button>
              <div style={{ fontSize: 18, fontWeight: 500, color: C.text }}>Confirm appointment</div>
            </div>

            {/* Details card */}
            <div style={{ margin: '8px 16px 16px', padding: '14px 16px', background: C.surface, borderRadius: 14, border: `0.5px solid ${C.border}` }}>
              {[
                ['Barber',    barber.name],
                ['Date',      `${dates[selDate].day}, ${dates[selDate].num} ${dates[selDate].month}`],
                ['Time',      SLOTS[selTime!]],
                ['Service',   barber.tags[0]],
                ['Duration',  '30 min'],
                ['Price',     '~€25'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `0.5px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.muted }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: '0 16px 12px', fontSize: 12, color: C.hint }}>
              Free cancellation up to 2h before the appointment.
            </div>

            <div style={{ padding: '0 16px' }}>
              <button
                onClick={() => onConfirm(barber, dates[selDate], SLOTS[selTime!])}
                style={{
                  width: '100%', padding: 15, borderRadius: 12,
                  background: C.green, color: '#fff',
                  fontSize: 15, fontWeight: 500, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <i className="ti ti-calendar-check" style={{ fontSize: 18 }} />
                Confirm appointment
              </button>
            </div>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <span onClick={onClose} style={{ fontSize: 12, color: C.hint, cursor: 'pointer' }}>Cancel</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
