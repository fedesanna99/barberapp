import { useState, useMemo, useEffect, useRef } from 'react'
import { C } from '../lib/colors'
import { SLOTS, TAKEN_INDICES, getNext7Days } from '../lib/demoData'
import type { DemoBarber, DemoDate } from '../lib/demoData'
import { useAvailability } from '../hooks/useAvailability'
import { useBarberDefaults } from '../hooks/useBarberDefaults'
import { useServices, type Service } from '../hooks/useServices'
import { IS_DEMO } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { ratingDisplay } from '../lib/rating'
import { haversineKm, formatKm } from '../lib/geo'
import { useGeolocation } from '../hooks/useGeolocation'
import { Icon } from '../components/Icon'
import { STRIPE_ENABLED, getStripe } from '../lib/stripe'

export interface BookingConfirmParams {
  barber: DemoBarber
  date: DemoDate
  time: string
  serviceId?: string
  serviceName?: string
  servicePrice?: number
  paymentMethod: 'cash' | 'online'
  stripePaymentIntentId?: string
}

interface BookingSheetProps {
  barber:    DemoBarber
  onClose:   () => void
  onConfirm: (params: BookingConfirmParams) => void
}

type Step = 'service' | 'datetime' | 'confirm' | 'payment'

const DEMO_TAKEN = new Set(SLOTS.filter((_, i) => TAKEN_INDICES.has(i)))

export function BookingSheet({ barber, onClose, onConfirm }: BookingSheetProps) {
  const dates = useMemo(() => getNext7Days(), [])
  const { coords: userCoords } = useGeolocation()
  const dist: number | null =
    userCoords && barber.lat != null && barber.lng != null
      ? haversineKm(userCoords, { lat: barber.lat, lng: barber.lng })
      : barber.dist > 0 ? barber.dist : null

  const barberId = IS_DEMO ? undefined : String(barber.id)
  const { slotMinutes: defaultSlot, price: defaultPrice } = useBarberDefaults(barberId)
  const { services } = useServices(IS_DEMO ? 'demo' : barberId, true)

  const hasServices = services.length > 0

  const [step,        setStep]        = useState<Step>(hasServices ? 'service' : 'datetime')
  const [selService,  setSelService]  = useState<Service | null>(null)
  const [selDate,     setSelDate]     = useState(0)
  const [selTime,     setSelTime]     = useState<string | null>(null)
  const [payError,    setPayError]    = useState<string | null>(null)
  const [payBusy,     setPayBusy]     = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  // Sync step when services load after initial render
  useEffect(() => {
    if (hasServices && step === 'datetime' && !selService) setStep('service')
  }, [hasServices])

  const slotMinutes = selService?.duration_minutes ?? defaultSlot
  const price       = selService?.price ?? defaultPrice
  const priceFmt    = `€ ${Number.isInteger(price) ? price : price.toFixed(2)}`
  const serviceName = selService?.name ?? (barber.tags?.[0] ?? 'Taglio classico')

  const { slots, booked, loading } = useAvailability(barberId, dates[selDate].date, slotMinutes)
  const effectiveSlots  = IS_DEMO ? SLOTS  : slots
  const effectiveBooked = IS_DEMO ? DEMO_TAKEN : booked

  const rd = ratingDisplay({ rating: barber.rating, reviewsCount: barber.reviewsCount })

  function goToDatetime(srv: Service | null) {
    setSelService(srv)
    setSelTime(null)
    setStep('datetime')
  }

  async function handlePayOnline() {
    setPayBusy(true)
    setPayError(null)

    if (IS_DEMO || !STRIPE_ENABLED) {
      // Simula pagamento in demo o quando Stripe non è configurato
      await new Promise(r => setTimeout(r, 800))
      setPayBusy(false)
      onConfirm({
        barber, date: dates[selDate], time: selTime!,
        serviceId: selService?.id, serviceName, servicePrice: price,
        paymentMethod: 'online', stripePaymentIntentId: 'demo_pi_simulated',
      })
      return
    }

    // Richiedi payment intent all'edge function
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: {
        amount:    Math.round(price * 100),
        currency:  'eur',
        barberId:  barberId ?? '',
        serviceId: selService?.id ?? '',
      },
    })

    if (error || !data?.clientSecret) {
      setPayBusy(false)
      setPayError(error?.message ?? 'Impossibile avviare il pagamento')
      return
    }

    setClientSecret(data.clientSecret)
    setStep('payment')
    setPayBusy(false)
  }

  function handlePayCash() {
    onConfirm({
      barber, date: dates[selDate], time: selTime!,
      serviceId: selService?.id, serviceName, servicePrice: price,
      paymentMethod: 'cash',
    })
  }

  function handlePaymentSuccess(intentId: string) {
    onConfirm({
      barber, date: dates[selDate], time: selTime!,
      serviceId: selService?.id, serviceName, servicePrice: price,
      paymentMethod: 'online', stripePaymentIntentId: intentId,
    })
  }

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

        {step === 'service' && (
          <ServiceStep
            services={services}
            barber={barber}
            dist={dist}
            rd={rd}
            onSelect={goToDatetime}
            onClose={onClose}
          />
        )}

        {step === 'datetime' && (
          <DatetimeStep
            barber={barber}
            dist={dist}
            rd={rd}
            serviceName={serviceName}
            slotMinutes={slotMinutes}
            priceFmt={priceFmt}
            dates={dates}
            selDate={selDate}
            setSelDate={i => { setSelDate(i); setSelTime(null) }}
            selTime={selTime}
            setSelTime={setSelTime}
            loading={loading}
            effectiveSlots={effectiveSlots}
            effectiveBooked={effectiveBooked}
            onBack={hasServices ? () => setStep('service') : undefined}
            onClose={onClose}
            onNext={() => setStep('confirm')}
          />
        )}

        {step === 'confirm' && (
          <ConfirmStep
            barber={barber}
            date={dates[selDate]}
            time={selTime!}
            serviceName={serviceName}
            slotMinutes={slotMinutes}
            priceFmt={priceFmt}
            payBusy={payBusy}
            payError={payError}
            onBack={() => setStep('datetime')}
            onClose={onClose}
            onPayCash={handlePayCash}
            onPayOnline={handlePayOnline}
          />
        )}

        {step === 'payment' && clientSecret && (
          <StripePaymentStep
            clientSecret={clientSecret}
            priceFmt={priceFmt}
            onSuccess={handlePaymentSuccess}
            onBack={() => { setStep('confirm'); setClientSecret(null) }}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}

/* ── Step 0: selezione servizio ─────────────────────────────────────────── */

function ServiceStep({ services, barber, dist, rd, onSelect, onClose }: {
  services: Service[]
  barber: DemoBarber
  dist: number | null
  rd: ReturnType<typeof ratingDisplay>
  onSelect: (s: Service | null) => void
  onClose: () => void
}) {
  return (
    <>
      <div style={{ padding: '0 20px 4px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>Prenota un appuntamento</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-0.025em', margin: '4px 0 0', color: C.text }}>
            con {barber.name}
          </h2>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="pin" size={14} color={C.accent} />
            {barber.city}{dist != null ? ` · ${formatKm(dist)}` : ''}
            {rd.hasReviews && (
              <>
                <span style={{ color: C.borderMed }}>·</span>
                <Icon name="star" size={12} color={C.accent} weight="fill" />
                <span style={{ fontWeight: 600, color: C.text }}>{rd.label}</span>
              </>
            )}
          </div>
        </div>
        <button onClick={onClose} aria-label="Chiudi" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: C.muted }}>
          <Icon name="close" size={20} />
        </button>
      </div>

      <div style={{ padding: '18px 20px 8px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
          Scegli il servizio
        </span>
      </div>

      <div style={{ padding: '4px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {services.map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 'var(--r-md)',
              background: C.surface, border: `1px solid ${C.border}`,
              cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              width: '100%',
            }}
          >
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: C.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="scissors" size={20} color={C.accentDeep} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{s.name}</div>
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  € {Number.isInteger(s.price) ? s.price : s.price.toFixed(2)}
                </span>
                {' · '}{s.duration_minutes} min
              </div>
            </div>
            <Icon name="arrowRight" size={18} color={C.hint} />
          </button>
        ))}
      </div>
    </>
  )
}

/* ── Step 1: scelta data/orario ─────────────────────────────────────────── */

function DatetimeStep({
  barber, dist, rd, serviceName, slotMinutes, priceFmt,
  dates, selDate, setSelDate, selTime, setSelTime,
  loading, effectiveSlots, effectiveBooked,
  onBack, onClose, onNext,
}: {
  barber: DemoBarber
  dist: number | null
  rd: ReturnType<typeof ratingDisplay>
  serviceName: string
  slotMinutes: number
  priceFmt: string
  dates: DemoDate[]
  selDate: number
  setSelDate: (i: number) => void
  selTime: string | null
  setSelTime: (t: string) => void
  loading: boolean
  effectiveSlots: string[]
  effectiveBooked: Set<string>
  onBack?: () => void
  onClose: () => void
  onNext: () => void
}) {
  return (
    <>
      <div style={{ padding: '0 20px 4px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {onBack && (
          <button onClick={onBack} aria-label="Indietro" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: C.muted, display: 'flex', marginTop: 2 }}>
            <Icon name="back" size={20} />
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>Prenota un appuntamento</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-0.025em', margin: '4px 0 0', color: C.text }}>
            con {barber.name}
          </h2>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="pin" size={14} color={C.accent} />
            {barber.city}{dist != null ? ` · ${formatKm(dist)}` : ''}
            {rd.hasReviews && (
              <>
                <span style={{ color: C.borderMed }}>·</span>
                <Icon name="star" size={12} color={C.accent} weight="fill" />
                <span style={{ fontWeight: 600, color: C.text }}>{rd.label}</span>
              </>
            )}
          </div>
        </div>
        <button onClick={onClose} aria-label="Chiudi" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: C.muted }}>
          <Icon name="close" size={20} />
        </button>
      </div>

      {/* Service summary */}
      <div style={{
        margin: '16px 20px 22px', padding: '14px 16px',
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 'var(--r-md)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="scissors" size={20} color={C.accentDeep} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{serviceName}</div>
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
              onClick={() => setSelDate(i)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '10px 14px', minWidth: 56, cursor: 'pointer',
                background: sel ? 'var(--clay)' : C.surface,
                color:      sel ? 'var(--paper-3)' : C.text,
                border: `1px solid ${sel ? 'var(--clay)' : C.border}`,
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
          <div style={{ textAlign: 'center', padding: '24px 0', color: C.muted, fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Icon name="calendar" size={28} color={C.hint} />
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
                    padding: '14px 0', minHeight: 44, textAlign: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500,
                    border: `1px solid ${sel ? 'var(--clay)' : C.border}`,
                    background: sel ? 'var(--clay)' : C.surface,
                    color: sel ? 'var(--paper-3)' : taken ? C.hint : C.text,
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
          onClick={() => { if (selTime !== null) onNext() }}
          disabled={selTime === null}
          style={{
            width: '100%', padding: '14px 20px', borderRadius: 'var(--r-md)',
            background:  selTime !== null ? 'var(--ink)' : C.surface,
            color:       selTime !== null ? 'var(--paper-3)' : C.hint,
            border: `1px solid ${selTime !== null ? 'var(--ink)' : C.border}`,
            fontSize: 14.5, fontWeight: 500,
            cursor: selTime !== null ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
          }}
        >
          {selTime !== null ? `Continua — ${selTime}` : 'Scegli un orario'}
        </button>
      </div>
    </>
  )
}

/* ── Step 2: riepilogo + scelta pagamento ───────────────────────────────── */

function ConfirmStep({
  barber, date, time, serviceName, slotMinutes, priceFmt,
  payBusy, payError, onBack, onClose, onPayCash, onPayOnline,
}: {
  barber: DemoBarber
  date: DemoDate
  time: string
  serviceName: string
  slotMinutes: number
  priceFmt: string
  payBusy: boolean
  payError: string | null
  onBack: () => void
  onClose: () => void
  onPayCash: () => void
  onPayOnline: () => void
}) {
  return (
    <>
      <div style={{ padding: '0 20px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onBack} aria-label="Indietro" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: C.muted, display: 'flex' }}>
          <Icon name="back" size={20} />
        </button>
        <div style={{ flex: 1, fontSize: 12, color: C.muted, fontWeight: 500 }}>Conferma</div>
        <button onClick={onClose} aria-label="Chiudi" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: C.muted, display: 'flex' }}>
          <Icon name="close" size={20} />
        </button>
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 24, letterSpacing: '-0.025em', margin: '10px 20px 4px', color: C.text }}>
        Tutto a posto?
      </h2>
      <p style={{ margin: '0 20px 18px', fontSize: 13, color: C.muted }}>
        Riepilogo del tuo appuntamento. Scegli come pagare per confermarlo.
      </p>

      <div style={{ margin: '0 20px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 'var(--r-md)', padding: '4px 16px' }}>
        {[
          ['Barbiere', barber.name,  'display'],
          ['Servizio', serviceName,  'body'],
          ['Data',     `${date.day} ${date.num} ${date.month}`, 'body'],
          ['Ora',      time,         'mono'],
          ['Durata',   `${slotMinutes} min`, 'mono'],
          ['Prezzo',   priceFmt,     'mono'],
        ].map(([k, v, kind], i, arr) => (
          <div key={k as string} style={{
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
        Cancellazione gratuita fino a 2 ore prima dell'appuntamento.
      </div>

      {payError && (
        <div style={{ margin: '0 20px 10px', padding: '10px 14px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 'var(--r-md)', fontSize: 12.5, color: '#cf1322' }}>
          {payError}
        </div>
      )}

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={onPayOnline}
          disabled={payBusy}
          style={{
            width: '100%', padding: '14px 20px', borderRadius: 'var(--r-md)',
            background: payBusy ? C.surface : 'var(--clay)',
            color: payBusy ? C.hint : 'var(--paper-3)',
            border: `1px solid ${payBusy ? C.border : 'var(--clay)'}`,
            fontSize: 14.5, fontWeight: 500, cursor: payBusy ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {payBusy ? 'Elaborazione…' : (IS_DEMO || !STRIPE_ENABLED) ? 'Paga ora (demo)' : `Paga ora · ${priceFmt}`}
        </button>
        <button
          onClick={onPayCash}
          disabled={payBusy}
          style={{
            width: '100%', padding: '14px 20px', borderRadius: 'var(--r-md)',
            background: C.bg, color: C.text,
            border: `1px solid ${C.borderMed}`,
            fontSize: 14.5, fontWeight: 500, cursor: payBusy ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Paga in loco
        </button>
      </div>
    </>
  )
}

/* ── Step 3: Stripe Payment Element ─────────────────────────────────────── */

function StripePaymentStep({ clientSecret, priceFmt, onSuccess, onBack, onClose }: {
  clientSecret: string
  priceFmt: string
  onSuccess: (intentId: string) => void
  onBack: () => void
  onClose: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stripeRef    = useRef<{ stripe: NonNullable<Awaited<ReturnType<typeof getStripe>>>; elements: ReturnType<NonNullable<Awaited<ReturnType<typeof getStripe>>>['elements']> } | null>(null)
  const [ready,      setReady]      = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    getStripe().then(stripe => {
      if (!stripe || !containerRef.current) return
      const elements = stripe.elements({ clientSecret, appearance: { theme: 'flat' } })
      const pe = elements.create('payment')
      pe.mount(containerRef.current!)
      pe.on('ready', () => setReady(true))
      stripeRef.current = { stripe, elements }
    })
    return () => { stripeRef.current = null }
  }, [clientSecret])

  async function submit() {
    if (!stripeRef.current || processing) return
    const { stripe, elements } = stripeRef.current
    setProcessing(true)
    setError(null)
    const { error: stripeErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    })
    setProcessing(false)
    if (stripeErr) {
      setError(stripeErr.message ?? 'Pagamento non riuscito')
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id)
    }
  }

  return (
    <>
      <div style={{ padding: '0 20px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onBack} aria-label="Indietro" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: C.muted, display: 'flex' }}>
          <Icon name="back" size={20} />
        </button>
        <div style={{ flex: 1, fontSize: 12, color: C.muted, fontWeight: 500 }}>Pagamento</div>
        <button onClick={onClose} aria-label="Chiudi" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: C.muted, display: 'flex' }}>
          <Icon name="close" size={20} />
        </button>
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 24, letterSpacing: '-0.025em', margin: '10px 20px 16px', color: C.text }}>
        Inserisci i dati carta
      </h2>

      <div ref={containerRef} style={{ margin: '0 20px 16px', minHeight: 120 }} />

      {!ready && (
        <div style={{ margin: '0 20px 16px', padding: 16, background: C.surface, borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="refresh" size={18} color={C.hint} style={{ animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {error && (
        <div style={{ margin: '0 20px 10px', padding: '10px 14px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 'var(--r-md)', fontSize: 12.5, color: '#cf1322' }}>
          {error}
        </div>
      )}

      <div style={{ padding: '0 20px' }}>
        <button
          onClick={submit}
          disabled={!ready || processing}
          style={{
            width: '100%', padding: '14px 20px', borderRadius: 'var(--r-md)',
            background: ready && !processing ? 'var(--clay)' : C.surface,
            color: ready && !processing ? 'var(--paper-3)' : C.hint,
            border: `1px solid ${ready && !processing ? 'var(--clay)' : C.border}`,
            fontSize: 14.5, fontWeight: 500,
            cursor: ready && !processing ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
          }}
        >
          {processing ? 'Elaborazione…' : `Paga · ${priceFmt}`}
        </button>
      </div>
    </>
  )
}
