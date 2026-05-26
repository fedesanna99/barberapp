import { useState, useEffect, useRef } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { EditBarberInfoSheet } from '../components/EditBarberInfoSheet'
import { IS_DEMO } from '../lib/supabase'
import { writeLog } from '../hooks/useAdminLogs'
import {
  DEMO_BARBER_BOOKINGS, DEMO_AVAIL,
  type DemoBarberBooking, type DemoAvailRow,
} from '../lib/demoData'
import { useBarberBookings, useBooking, type BookingWithClient } from '../hooks/useBooking'
import { useAvailabilitySettings } from '../hooks/useAvailabilitySettings'
import { useAutoAccept } from '../hooks/useAutoAccept'
import { useBarberVacation } from '../hooks/useBarberVacation'
import { useBarberInfo, type BarberInfo } from '../hooks/useBarberInfo'
import { Icon } from '../components/Icon'
import { ServicesTab } from './ServicesTab'
import type { ToastEvent } from '../components/Toast'

type DashTab = 'bookings' | 'availability' | 'services'

interface BookingRow {
  id: string
  clientName: string
  clientInitials: string
  dateLabel: string
  timeLabel: string
  tag?: string
  status: string
}

const d = new Date()
const TODAY = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const DAY_NAMES_IT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]

function fmtDate(s: string): string {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function toRow(b: BookingWithClient): BookingRow {
  const name = b.profiles?.display_name ?? 'Cliente'
  return { id: b.id, clientName: name, clientInitials: initials(name), dateLabel: fmtDate(b.date), timeLabel: b.time_slot, status: b.status }
}

function demoToRow(b: DemoBarberBooking): BookingRow {
  return { id: b.id, clientName: b.client, clientInitials: b.initials, dateLabel: b.date, timeLabel: b.time, tag: b.service, status: b.status }
}

export function BarberDashboard({ barberId, userId, onToast }: {
  barberId?: string
  userId?:   string
  onToast?:  (t: ToastEvent | null) => void
}) {
  const [tab, setTab] = useState<DashTab>('bookings')
  const [showEditInfo, setShowEditInfo] = useState(false)
  const { info, saving, saveError, saveInfo } = useBarberInfo(barberId, userId)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 12px', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.025em', color: C.text }}>
          Bottega
        </span>
        {barberId && !IS_DEMO && (
          <button onClick={() => setShowEditInfo(true)} aria-label="Impostazioni salone" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <Icon name="settings" size={22} color={C.muted} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', padding: '0 20px 14px', gap: 0, flexShrink: 0, background: C.bg }}>
        <div style={{ display: 'flex', background: C.surface, borderRadius: 'var(--r-md)', padding: 3, flex: 1, border: `1px solid ${C.border}` }}>
          {(['bookings', 'services', 'availability'] as DashTab[]).map(t => {
            const active = tab === t
            const label = t === 'bookings' ? 'Prenotazioni' : t === 'services' ? 'Servizi' : 'Disponibilità'
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: '8px 0',
                  background: active ? C.bg : 'transparent',
                  color:      active ? C.text : C.muted,
                  border: 'none', borderRadius: 8,
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
                  cursor: 'pointer',
                  boxShadow: active ? 'var(--shadow-card)' : 'none',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {tab === 'bookings'
        ? <BookingsTab barberId={barberId} onToast={onToast} />
        : tab === 'services'
          ? <ServicesTab barberId={barberId} onToast={onToast} />
          : <AvailabilityTab barberId={barberId} info={info} saving={saving} onSaveInfo={saveInfo} onToast={onToast} />
      }

      {showEditInfo && (
        <EditBarberInfoSheet
          initial={info}
          saving={saving}
          saveError={saveError}
          onSave={saveInfo}
          onClose={() => setShowEditInfo(false)}
        />
      )}
    </div>
  )
}

/* ---- Bookings tab ---------------------------------------------------- */

const DEMO_PENDING: DemoBarberBooking = { id: 'b0', client: 'Giulio M.', initials: 'GM', date: 'lun 19 mag', time: '08:30', service: 'Fade', status: 'pending' }

function BookingsTab({ barberId, onToast }: {
  barberId?: string
  onToast?:  (t: ToastEvent | null) => void
}) {
  const isDemo = IS_DEMO || !barberId
  const { bookings: real, refetch } = useBarberBookings(barberId)
  const { cancelBooking, confirmBooking, declineBooking, markDone } = useBooking()
  const [demoList, setDemoList] = useState<DemoBarberBooking[]>([DEMO_PENDING, ...DEMO_BARBER_BOOKINGS])
  const { autoAccept, setAutoAccept } = useAutoAccept(isDemo ? undefined : barberId)
  const { acceptingBookings, setAcceptingBookings } = useBarberVacation(isDemo ? undefined : barberId)
  const [demoAccepting, setDemoAccepting] = useState(true)
  const effectiveAccepting = isDemo ? demoAccepting : acceptingBookings

  async function toggleVacation() {
    const next = !effectiveAccepting
    if (isDemo) { setDemoAccepting(next); return }
    const { error } = await setAcceptingBookings(next)
    if (error) {
      onToast?.({ kind: 'error', title: 'Impossibile aggiornare', message: error.message })
      return
    }
    onToast?.({
      kind:    next ? 'success' : 'info',
      title:   next ? 'Prenotazioni riattivate.' : 'Prenotazioni in pausa.',
      message: next ? 'I clienti possono prenotare di nuovo.' : 'Nessuno potrà prenotare finché non riattivi.',
    })
  }

  const pending = isDemo
    ? demoList.filter(b => b.status === 'pending').map(demoToRow)
    : real.filter(b => b.status === 'pending').map(toRow)

  const upcoming = isDemo
    ? demoList.filter(b => b.status === 'confirmed').map(demoToRow)
    : real.filter(b => (b.status === 'confirmed' || b.status === 'done') && b.date >= TODAY).map(toRow)

  // Tracks booking ids currently being auto-confirmed. Without this guard the
  // effect below fires on every `real` array change (realtime delivers
  // INSERT + UPDATE in quick succession), causing the same booking to be
  // confirmed twice — the second call fails silently but pollutes the logs.
  const autoAcceptInflight = useRef<Set<string>>(new Set())

  function runAutoAccept(targets: typeof real) {
    targets.forEach(b => {
      if (autoAcceptInflight.current.has(b.id)) return
      autoAcceptInflight.current.add(b.id)
      confirmBooking(b.id)
        .then(({ error }) => {
          if (error) onToast?.({ kind: 'error', title: 'Auto-accept fallito', message: error.message })
          else refetch()
        })
        .finally(() => { autoAcceptInflight.current.delete(b.id) })
    })
  }

  useEffect(() => {
    if (!autoAccept) return
    if (isDemo) {
      setDemoList(prev => prev.map(b => b.status === 'pending' ? { ...b, status: 'confirmed' as const } : b))
    } else {
      // FIX #3-bis: NON auto-confermare booking ancora in attesa di pagamento
      // online (payment_status='pending_online' significa che il PI è stato
      // creato ma il webhook non ha ancora promosso a 'paid'). Senza questo
      // filtro, una booking online apparirebbe confermata sulla dashboard del
      // barbiere PRIMA che il cliente abbia effettivamente pagato.
      // Quando il webhook flippa a 'paid', Realtime UPDATE triggera l'effect
      // su [real] e l'auto-accept fires correttamente.
      // 'failed' è escluso difensivamente — la booking verrà cancellata da cron.
      runAutoAccept(real.filter(b =>
        b.status === 'pending' &&
        (b.payment_status === 'pending_cash' || b.payment_status === 'paid')
      ))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAccept, isDemo])

  useEffect(() => {
    if (!autoAccept || isDemo) return
    runAutoAccept(real.filter(b => b.status === 'pending'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real])

  function clientNameFor(id: string): string {
    if (isDemo) return demoList.find(b => b.id === id)?.client ?? 'cliente'
    return real.find(b => b.id === id)?.profiles?.display_name ?? 'cliente'
  }

  function demoAction(id: string, action: 'done' | 'cancel' | 'confirm' | 'decline') {
    const clientName = clientNameFor(id)
    if (action === 'cancel') {
      setDemoList(prev => prev.filter(b => b.id !== id))
      writeLog('booking.cancelled', `Prenotazione di ${clientName} annullata dal barbiere`, 'info', { metadata: { booking_id: id } })
      onToast?.({ kind: 'info',    title: 'Prenotazione annullata.',  message: clientName })
    } else if (action === 'decline') {
      // In demo non c'è uno status 'declined' nel mock DemoBarberBooking;
      // rimuovo dal pending come per cancel — il toast distingue la semantica.
      setDemoList(prev => prev.filter(b => b.id !== id))
      writeLog('booking.declined', `Prenotazione di ${clientName} rifiutata dal barbiere`, 'info', { metadata: { booking_id: id } })
      onToast?.({ kind: 'info',    title: 'Prenotazione rifiutata.',  message: clientName })
    } else if (action === 'confirm') {
      setDemoList(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' as const } : b))
      writeLog('booking.confirmed', `Prenotazione di ${clientName} confermata`, 'info', { metadata: { booking_id: id } })
      onToast?.({ kind: 'success', title: 'Prenotazione confermata.', message: clientName })
    } else {
      setDemoList(prev => prev.map(b => b.id === id ? { ...b, status: 'done' as const } : b))
      writeLog('booking.done', `Prenotazione di ${clientName} completata`, 'info', { metadata: { booking_id: id } })
      onToast?.({ kind: 'success', title: 'Appuntamento completato.', message: clientName })
    }
  }

  function act(id: string, action: 'confirm' | 'cancel' | 'decline' | 'done') {
    if (isDemo) { demoAction(id, action); return }
    const clientName = clientNameFor(id)
    const call =
      action === 'confirm' ? confirmBooking :
      action === 'cancel'  ? cancelBooking  :
      action === 'decline' ? declineBooking :
      markDone
    const actionLabel =
      action === 'confirm' ? 'booking.confirmed' :
      action === 'cancel'  ? 'booking.cancelled' :
      action === 'decline' ? 'booking.declined'  :
      'booking.done'
    const actionMsg =
      action === 'confirm' ? 'Prenotazione confermata' :
      action === 'cancel'  ? 'Prenotazione annullata'  :
      action === 'decline' ? 'Prenotazione rifiutata dal barbiere' :
      'Prenotazione completata'
    const errorTitle =
      action === 'confirm' ? 'Conferma fallita' :
      action === 'cancel'  ? 'Annullamento fallito' :
      action === 'decline' ? 'Rifiuto fallito' :
      'Aggiornamento fallito'
    const okTitle =
      action === 'confirm' ? 'Prenotazione confermata.' :
      action === 'cancel'  ? 'Prenotazione annullata.'  :
      action === 'decline' ? 'Prenotazione rifiutata.'  :
      'Appuntamento completato.'
    const okKind: 'success' | 'info' = (action === 'cancel' || action === 'decline') ? 'info' : 'success'
    call(id).then(({ error }) => {
      if (error) { onToast?.({ kind: 'error', title: errorTitle, message: error.message }); return }
      writeLog(actionLabel, actionMsg, 'info', { metadata: { booking_id: id } })
      onToast?.({ kind: okKind, title: okTitle, message: clientName })
      refetch()
    })
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
      {/* Toggles */}
      <div style={{
        padding: '12px 16px', borderRadius: 'var(--r-md)',
        background: effectiveAccepting ? C.greenSoft : C.redSoft,
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: effectiveAccepting ? C.green : C.red }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
            {effectiveAccepting ? 'Accetti prenotazioni' : 'In pausa'}
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>
            {effectiveAccepting
              ? 'I clienti possono prenotare normalmente.'
              : 'Nessuno può prenotare finché non riattivi.'}
          </div>
        </div>
        <Toggle on={effectiveAccepting} onChange={toggleVacation} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', marginBottom: 18, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 'var(--r-md)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Auto-accetta</div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>Le nuove prenotazioni vengono confermate subito.</div>
        </div>
        <Toggle on={autoAccept} onChange={() => setAutoAccept(!autoAccept)} />
      </div>

      <Section label="In attesa" count={pending.length}>
        {pending.length === 0
          ? <EmptyMsg text="Nessuna richiesta in attesa." />
          : pending.map(r => (
              <BookingCard key={r.id} row={r}
                onConfirm={() => act(r.id, 'confirm')}
                onDecline={() => act(r.id, 'decline')}
              />
            ))
        }
      </Section>
      <Section label="In arrivo" count={upcoming.length}>
        {upcoming.length === 0
          ? <EmptyMsg text="Nessun appuntamento in arrivo." />
          : upcoming.map(r => (
              <BookingCard key={r.id} row={r}
                onMarkDone={r.status === 'confirmed' ? () => act(r.id, 'done') : undefined}
                onCancel={() => act(r.id, 'cancel')}
              />
            ))
        }
      </Section>
    </div>
  )
}

/* ---- Availability tab ------------------------------------------------- */

function AvailabilityTab({ barberId, info, saving, onSaveInfo, onToast }: {
  barberId?:    string
  info:         BarberInfo
  saving:       boolean
  onSaveInfo:   (next: BarberInfo) => Promise<string | null>
  onToast?:     (t: ToastEvent | null) => void
}) {
  const isDemo = IS_DEMO || !barberId
  const { rows: real, upsertDay, removeDay } = useAvailabilitySettings(barberId)
  const [demoRows, setDemoRows] = useState<DemoAvailRow[]>(DEMO_AVAIL)

  const rows = isDemo ? demoRows : real

  function getRow(dow: number) {
    return rows.find(r => r.day_of_week === dow)
  }

  function handleToggle(dow: number) {
    if (getRow(dow)) {
      if (isDemo) setDemoRows(prev => prev.filter(r => r.day_of_week !== dow))
      else        removeDay(dow)
    } else {
      handleSave(dow, '09:00', '18:00')
    }
  }

  function handleSave(dow: number, start: string, end: string, bStart?: string, bEnd?: string) {
    if (isDemo) {
      setDemoRows(prev => {
        const idx = prev.findIndex(r => r.day_of_week === dow)
        const next = { day_of_week: dow, start_time: start, end_time: end, break_start: bStart, break_end: bEnd }
        return idx >= 0 ? prev.map((r, i) => (i === idx ? next : r)) : [...prev, next]
      })
    } else {
      upsertDay(dow, start, end, bStart, bEnd)
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
      <p style={{ fontSize: 12.5, color: C.muted, margin: '6px 0 14px', lineHeight: 1.55 }}>
        Il tuo orario settimanale. I clienti possono prenotare solo nelle fasce attive.
      </p>
      {DOW_ORDER.map(dow => {
        const row = getRow(dow)
        return (
          <DayRow
            key={dow}
            dayName={DAY_NAMES_IT[dow]}
            active={!!row}
            startTime={row?.start_time ?? '09:00'}
            endTime={row?.end_time ?? '18:00'}
            breakStart={row?.break_start ?? undefined}
            breakEnd={row?.break_end ?? undefined}
            onToggle={() => handleToggle(dow)}
            onSave={(s, e, bs, be) => handleSave(dow, s, e, bs, be)}
          />
        )
      })}

      <CancellationPolicySection
        info={info}
        saving={saving}
        onSaveInfo={onSaveInfo}
        onToast={onToast}
        isDemo={isDemo}
      />
    </div>
  )
}

/* ---- Cancellation policy section (Pari V4 Sez A) --------------------- */

const CANCEL_WINDOW_PRESETS = [4, 12, 24, 48, 72, 168] as const

function CancellationPolicySection({ info, saving, onSaveInfo, onToast, isDemo }: {
  info:       BarberInfo
  saving:     boolean
  onSaveInfo: (next: BarberInfo) => Promise<string | null>
  onToast?:   (t: ToastEvent | null) => void
  isDemo:     boolean
}) {
  const currentWindow = Math.max(0, Math.min(168, parseInt(info.cancellation_window_hours, 10) || 24))
  const [showCustom, setShowCustom] = useState(false)
  const [customValue, setCustomValue] = useState(String(currentWindow))

  async function handleWindowChange(h: number) {
    if (h === currentWindow) return
    if (isDemo) {
      onToast?.({ kind: 'info', title: 'Demo mode', message: 'Le modifiche non vengono salvate.' })
      return
    }
    const err = await onSaveInfo({ ...info, cancellation_window_hours: String(h) })
    if (err) {
      onToast?.({ kind: 'error', title: 'Salvataggio fallito', message: err })
    } else {
      onToast?.({ kind: 'success', title: 'Politica di cancellazione aggiornata.' })
      setShowCustom(false)
    }
  }

  function handleCustomSave() {
    const n = parseInt(customValue, 10)
    if (!Number.isFinite(n) || n < 0 || n > 168) {
      onToast?.({ kind: 'error', title: 'Valore non valido', message: 'Inserisci un numero da 0 a 168.' })
      return
    }
    void handleWindowChange(n)
  }

  const isPreset = CANCEL_WINDOW_PRESETS.includes(currentWindow as typeof CANCEL_WINDOW_PRESETS[number])

  return (
    <section style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.border}` }}>
      <div className="bb-eyebrow" style={{ marginBottom: 8 }}>Politica di cancellazione</div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.018em', color: C.text, margin: '0 0 6px' }}>
        Quanto prima il cliente può annullare gratis?
      </h3>
      <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, margin: '0 0 14px' }}>
        I clienti che annullano entro questa finestra ricevono il rimborso completo. Oltre, lo slot si libera ma non c'è rimborso.
      </p>

      {/* Chip presets */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {CANCEL_WINDOW_PRESETS.map(h => {
          const isOn = h === currentWindow
          return (
            <button
              key={h}
              onClick={() => handleWindowChange(h)}
              disabled={saving}
              style={{
                display: 'inline-flex', alignItems: 'baseline', gap: 4,
                padding: '8px 14px', borderRadius: 'var(--r-pill)',
                background: isOn ? 'var(--clay)' : 'var(--paper-3)',
                border: `1px solid ${isOn ? 'var(--clay)' : 'var(--ink-15)'}`,
                color: isOn ? 'var(--paper-3)' : C.text,
                fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                transition: 'all 120ms var(--ease)',
              }}
            >
              <span className="bb-mono" style={{ fontWeight: 600 }}>{h === 168 ? '1' : h}</span>
              <span style={{ fontSize: 11, opacity: 0.85 }}>{h === 168 ? 'sett' : 'h'}</span>
            </button>
          )
        })}
        <button
          onClick={() => setShowCustom(s => !s)}
          disabled={saving}
          style={{
            padding: '8px 14px', borderRadius: 'var(--r-pill)',
            background: showCustom || !isPreset ? 'var(--clay-soft)' : 'var(--paper-3)',
            border: `1px solid ${showCustom || !isPreset ? 'var(--clay)' : 'var(--ink-15)'}`,
            color: C.text,
            fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          Personalizza{!isPreset && currentWindow !== 0 ? ` · ${currentWindow}h` : ''}
        </button>
      </div>

      {/* Custom input (collapsible) */}
      {showCustom && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
          <input
            type="number"
            min={0}
            max={168}
            value={customValue}
            onChange={e => setCustomValue(e.target.value)}
            placeholder="0-168"
            style={{
              width: 100, padding: '8px 12px', borderRadius: 'var(--r-md)',
              border: `1px solid ${C.border}`, background: 'var(--paper-3)',
              color: C.text, fontFamily: 'var(--font-mono)', fontSize: 14,
            }}
          />
          <span style={{ fontSize: 13, color: C.muted }}>ore</span>
          <button
            onClick={handleCustomSave}
            disabled={saving}
            style={{
              padding: '8px 14px', borderRadius: 'var(--r-md)',
              background: 'var(--ink)', color: 'var(--paper-3)',
              border: '1px solid var(--ink)',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            Salva
          </button>
        </div>
      )}

      {/* Current value display + aside */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 16px', borderRadius: 'var(--r-md)',
        background: 'var(--paper-2)', border: `1px solid ${C.border}`,
        marginBottom: 12,
      }}>
        <div>
          <div className="bb-eyebrow" style={{ marginBottom: 4 }}>Finestra attuale</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span className="bb-mono" style={{ fontFamily: 'var(--font-display-serif)', fontSize: 32, fontWeight: 400, color: C.text, lineHeight: 1 }}>
              {currentWindow}
            </span>
            <span style={{ fontSize: 13, color: C.muted }}>ore</span>
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, textAlign: 'right', lineHeight: 1.45, maxWidth: 180 }}>
          Le prenotazioni in essere mantengono la finestra del momento della prenotazione.
        </div>
      </div>

      {/* Edge case: 0h warning callout */}
      {currentWindow === 0 && (
        <div style={{
          display: 'flex', gap: 12, padding: '12px 14px',
          borderRadius: 'var(--r-md)',
          background: 'var(--rust-soft)',
          border: '1px solid rgba(176,94,72,.25)',
          marginBottom: 12,
        }}>
          <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 9999, background: 'var(--rust)', flexShrink: 0 }} />
          <div style={{ fontSize: 12.5, lineHeight: 1.5, color: C.text }}>
            <strong>Cancellazione gratuita disabilitata.</strong>
            <div style={{ marginTop: 4, color: 'var(--rust)' }}>
              I clienti pagano alla prenotazione e <strong>non riceveranno rimborso</strong> in caso di cancellazione. Tu puoi ancora rimborsarli manualmente.
            </div>
          </div>
        </div>
      )}

      <p style={{ fontSize: 11.5, color: C.muted, margin: 0, lineHeight: 1.5 }}>
        Se metti <span className="bb-mono">0h</span>, nessun cliente può cancellare gratis — comunicalo chiaramente sul tuo profilo.
      </p>
    </section>
  )
}

/* ---- Shared sub-components ------------------------------------------- */

function Section({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
          {label}
        </span>
        {count > 0 && (
          <span style={{ fontSize: 11, fontWeight: 500, color: C.accentDeep, background: C.accentLight, borderRadius: 9999, padding: '2px 8px' }}>
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function EmptyMsg({ text }: { text: string }) {
  return (
    <div style={{ padding: '20px 0', color: C.muted, fontSize: 13, textAlign: 'center' }}>
      {text}
    </div>
  )
}

function BookingCard({
  row, onConfirm, onDecline, onMarkDone, onCancel,
}: {
  row: BookingRow
  onConfirm?: () => void
  onDecline?: () => void
  onMarkDone?: () => void
  onCancel?: () => void
}) {
  const isPending = row.status === 'pending'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 'var(--r-md)', marginBottom: 8,
      background: C.surface, border: `1px solid ${C.border}`,
    }}>
      <Avatar initials={row.clientInitials} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {row.clientName}
        </div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{row.timeLabel}</span> · {row.dateLabel}
          {row.tag && <span style={{ marginLeft: 6, color: C.accentDeep, fontWeight: 500 }}>· {row.tag}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {isPending ? (
          <>
            <ActionBtn label="Rifiuta" tone="ghost" onClick={onDecline} />
            <ActionBtn label="Conferma" tone="brass" onClick={onConfirm} />
          </>
        ) : (
          <>
            {onMarkDone && <ActionBtn label="Fatto" tone="ghost" onClick={onMarkDone} />}
            <ActionBtn label="Annulla" tone="danger" onClick={onCancel} />
          </>
        )}
      </div>
    </div>
  )
}

function ActionBtn({ label, tone, onClick }: { label: string; tone: 'brass' | 'ghost' | 'danger'; onClick?: () => void }) {
  const styles = tone === 'brass'
    ? { bg: C.accent,    fg: C.bg,    bd: C.accent }
    : tone === 'danger'
      ? { bg: C.bg,      fg: C.red,   bd: C.red }
      : { bg: C.bg,      fg: C.text,  bd: C.borderMed }
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 12px', borderRadius: 'var(--r-md)',
        border: `1px solid ${styles.bd}`,
        background: styles.bg, color: styles.fg,
        fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit',
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 38, height: 22, borderRadius: 9999, flexShrink: 0,
        background: on ? C.text : C.borderMed,
        cursor: 'pointer', position: 'relative',
        transition: 'background 180ms var(--ease)',
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: on ? 18 : 2,
        width: 18, height: 18, borderRadius: '50%',
        background: C.bg, transition: 'left 180ms var(--ease)',
      }} />
    </div>
  )
}

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function DayRow({
  dayName, active, startTime, endTime, breakStart, breakEnd, onToggle, onSave,
}: {
  dayName: string
  active:  boolean
  startTime: string
  endTime:   string
  breakStart?: string
  breakEnd?:   string
  onToggle: () => void
  onSave:   (start: string, end: string, breakStart?: string, breakEnd?: string) => void
}) {
  const [start,    setStart]    = useState(startTime)
  const [end,      setEnd]      = useState(endTime)
  const [hasBreak, setHasBreak] = useState(!!breakStart)
  const [bStart,   setBStart]   = useState(breakStart ?? '12:00')
  const [bEnd,     setBEnd]     = useState(breakEnd   ?? '13:00')

  useEffect(() => { setStart(startTime) }, [startTime])
  useEffect(() => { setEnd(endTime) }, [endTime])
  useEffect(() => { setHasBreak(!!breakStart) }, [breakStart])
  useEffect(() => { if (breakStart) setBStart(breakStart) }, [breakStart])
  useEffect(() => { if (breakEnd)   setBEnd(breakEnd)     }, [breakEnd])

  const dirty = active && (
    start !== startTime ||
    end   !== endTime   ||
    hasBreak !== !!breakStart ||
    (hasBreak && (bStart !== (breakStart ?? '12:00') || bEnd !== (breakEnd ?? '13:00')))
  )

  const sMin = timeToMin(start)
  const eMin = timeToMin(end)
  const bsMin = timeToMin(bStart)
  const beMin = timeToMin(bEnd)

  let validationError: string | null = null
  if (sMin >= eMin) {
    validationError = "La fine deve essere dopo l'inizio"
  } else if (hasBreak) {
    if (bsMin <= sMin)  validationError = "La pausa deve iniziare dopo l'apertura"
    else if (beMin >= eMin) validationError = 'La pausa deve finire prima della chiusura'
    else if (bsMin >= beMin) validationError = "La fine della pausa deve essere dopo l'inizio"
  }

  const canSave = dirty && !validationError

  return (
    <div style={{ padding: '14px 0', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 36, fontSize: 12.5, fontWeight: 500, color: active ? C.text : C.hint, flexShrink: 0, textTransform: 'lowercase' }}>
          {dayName}
        </span>
        <Toggle on={active} onChange={onToggle} />
        {active ? (
          <>
            <input type="time" value={start} onChange={e => setStart(e.target.value)} style={timeInputStyle} />
            <span style={{ fontSize: 12, color: C.hint }}>–</span>
            <input type="time" value={end}   onChange={e => setEnd(e.target.value)}   style={timeInputStyle} />
            {!hasBreak && (
              <button
                onClick={() => setHasBreak(true)}
                title="Aggiungi pausa"
                style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  border: `1px solid ${C.borderMed}`, background: C.bg,
                  color: C.muted, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: 0,
                }}
              >
                <Icon name="plus" size={12} />
              </button>
            )}
            {dirty && (
              <button
                onClick={() => canSave && onSave(start, end, hasBreak ? bStart : undefined, hasBreak ? bEnd : undefined)}
                disabled={!canSave}
                style={{
                  height: 28, padding: '0 12px', borderRadius: 8,
                  border: 'none',
                  background: canSave ? C.text : C.surface,
                  color:      canSave ? C.bg : C.hint,
                  fontSize: 11.5, fontWeight: 500,
                  cursor: canSave ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                  marginLeft: 'auto', flexShrink: 0,
                }}
              >
                Salva
              </button>
            )}
          </>
        ) : (
          <span style={{ fontSize: 12.5, color: C.hint }}>Chiuso</span>
        )}
      </div>

      {active && hasBreak && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, paddingLeft: 84 }}>
          <button
            onClick={() => setHasBreak(false)}
            aria-label="Rimuovi pausa"
            title="Tocca per rimuovere la pausa"
            style={{
              fontSize: 11.5, color: C.muted, flexShrink: 0,
              border: `1px solid ${C.border}`, background: C.bg,
              padding: '4px 10px', borderRadius: 9999, cursor: 'pointer',
              fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            <Icon name="close" size={11} />
            Pausa
          </button>
          <input type="time" value={bStart} onChange={e => setBStart(e.target.value)} style={timeInputStyle} />
          <span style={{ fontSize: 12, color: C.hint }}>–</span>
          <input type="time" value={bEnd}   onChange={e => setBEnd(e.target.value)}   style={timeInputStyle} />
        </div>
      )}

      {active && dirty && validationError && (
        <div style={{ fontSize: 11, color: C.red, marginTop: 6, paddingLeft: 84 }}>
          {validationError}
        </div>
      )}
    </div>
  )
}

const timeInputStyle: React.CSSProperties = {
  height: 30, width: 84, borderRadius: 8,
  border: `1px solid ${C.border}`,
  background: C.surface, color: C.text,
  fontFamily: 'var(--font-mono)', fontSize: 12.5,
  padding: '0 8px',
  outline: 'none', flexShrink: 0,
}
