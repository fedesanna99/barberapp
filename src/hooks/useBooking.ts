import { useState, useEffect, useRef, useCallback } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Booking, BookingStatus } from '../types/supabase'

// ── Mutations ──────────────────────────────────────────────────────────────

export function useBooking() {
  const [loading, setLoading] = useState(false)

  async function createBooking(params: {
    clientId: string
    barberId: string
    date: Date
    timeSlot: string
    serviceId?: string
    // Solo stati iniziali. 'paid' / 'refunded' / 'failed' sono enforced server-side
    // via webhook Stripe + mark_booking_* SECURITY DEFINER functions (mig. 038).
    // INSERT con altri valori fallisce su bookings_insert RLS WITH CHECK.
    paymentStatus?: 'pending_cash' | 'pending_online'
    // NOTA: stripe_payment_intent_id NON è settabile dal client. Lo scrive
    // l'edge function create-payment-intent (service_role) dopo aver creato il
    // PaymentIntent. Vedi migration 038 trigger + INSERT policy.
  }) {
    setLoading(true)
    const d = params.date
    // H1: format in local time so the date string matches day-of-week used for availability
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        client_id:                 params.clientId,
        barber_id:                 params.barberId,
        date:                      dateStr,
        time_slot:                 params.timeSlot,
        ...(params.serviceId && { service_id: params.serviceId }),
        payment_status:            params.paymentStatus ?? 'pending_cash',
        // M1: insert as 'pending' so the barber can confirm/decline
      })
      .select()
      .single()
    setLoading(false)
    return { data, error }
  }

  async function updateStatus(bookingId: string, status: BookingStatus) {
    return supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .select()
      .single()
  }

  const confirmBooking = (bookingId: string) => updateStatus(bookingId, 'confirmed')
  const markDone       = (bookingId: string) => updateStatus(bookingId, 'done')

  // ── Refund-aware cancellation / decline (PR-bis, mig. 039) ─────────────────
  // cancelBooking (client) e declineBooking (barber) ora delegano all'edge
  // function refund-booking, che decide se scatenare il refund Stripe in base
  // a payment_status='paid' + cancellation_window_hours (snapshot all'INSERT).
  // Reason: 'client_cancel' applica la window, 'barber_decline' la bypassa.
  // Edge function fa anche l'UPDATE bookings via service_role → bypass del
  // trigger immutable per cambiare payment_status='refunded'.
  // Return shape diverso da updateStatus: { data: RefundResp, error }.
  // Chi consuma deve gestire il nuovo shape (vedi FIX_BOOKING_LIFECYCLE_NOTES).

  async function cancelBooking(bookingId: string) {
    setLoading(true)
    const r = await supabase.functions.invoke<RefundResp>('refund-booking', {
      body: { bookingId, reason: 'client_cancel' },
    })
    setLoading(false)
    return { data: r.data ?? null, error: r.error as Error | null }
  }

  async function declineBooking(bookingId: string) {
    setLoading(true)
    const r = await supabase.functions.invoke<RefundResp>('refund-booking', {
      body: { bookingId, reason: 'barber_decline' },
    })
    setLoading(false)
    return { data: r.data ?? null, error: r.error as Error | null }
  }

  return { createBooking, cancelBooking, declineBooking, confirmBooking, markDone, loading }
}

// Edge function response shape (refund-booking).
export type RefundResp = {
  ok?: boolean
  action?: 'cancelled' | 'declined'
  refunded?: boolean
  refundId?: string | null
  withinWindow?: boolean
  booking?: { id: string; status: string; payment_status: string }
  idempotent?: boolean
  error?: string
}

// ── Queries ────────────────────────────────────────────────────────────────

// Booking with joined barber display data
export type BookingWithBarber = Booking & {
  barbers: {
    id: string
    profile: { display_name: string | null; avatar_url: string | null } | null
  } | null
}

const CLIENT_SELECT = '*, barbers(id, profile:profiles(display_name, avatar_url))'

export function useClientBookings(clientId: string | undefined) {
  const [bookings, setBookings] = useState<BookingWithBarber[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  // Each hook instance gets a unique suffix so multiple callers (Menu + MyAppointments)
  // never share the same realtime channel name, which can cause silent conflicts in
  // Supabase JS v2 when two channels with identical topics subscribe simultaneously.
  const channelSuffix = useRef(`${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)

  useEffect(() => {
    if (!clientId) {
      setBookings([])
      setLoading(false)
      setLoadError(null)
      return
    }
    setLoading(true)
    setLoadError(null)

    supabase
      .from('bookings')
      .select(CLIENT_SELECT)
      .eq('client_id', clientId)
      .order('date', { ascending: true })
      .then(({ data, error }) => {
        if (error) { setLoadError(error.message); setLoading(false); return }
        if (data) setBookings(data as BookingWithBarber[])
        setLoading(false)
      })

    channelRef.current = supabase
      .channel(`client_bookings_${clientId}_${channelSuffix.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `client_id=eq.${clientId}` },
        payload => {
          if (payload.eventType === 'INSERT') {
            // Refetch the inserted row to get the joined barber data
            supabase
              .from('bookings')
              .select(CLIENT_SELECT)
              .eq('id', (payload.new as Booking).id)
              .single()
              .then(({ data }) => {
                if (data) setBookings(prev => [...prev, data as BookingWithBarber])
              })
          } else if (payload.eventType === 'UPDATE') {
            setBookings(prev =>
              prev.map(b =>
                b.id === (payload.new as Booking).id
                  ? { ...b, ...(payload.new as Booking) }
                  : b,
              ),
            )
          } else if (payload.eventType === 'DELETE') {
            setBookings(prev => prev.filter(b => b.id !== (payload.old as Booking).id))
          }
        },
      )
      .subscribe()

    return () => { channelRef.current?.unsubscribe() }
  }, [clientId])

  return { bookings, loading, loadError }
}

// Booking with joined client display data
export type BookingWithClient = Booking & {
  profiles: { display_name: string | null; avatar_url: string | null } | null
}

const BARBER_SELECT = '*, profiles!bookings_client_id_fkey(display_name, avatar_url)'

export function useBarberBookings(barberId: string | undefined) {
  const [bookings, setBookings] = useState<BookingWithClient[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!barberId) return

    supabase
      .from('bookings')
      .select(BARBER_SELECT)
      .eq('barber_id', barberId)
      .order('date', { ascending: true })
      .then(({ data }) => setBookings((data ?? []) as BookingWithClient[]))

    channelRef.current = supabase
      .channel(`barber_bookings_${barberId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `barber_id=eq.${barberId}` },
        payload => {
          if (payload.eventType === 'INSERT') {
            supabase
              .from('bookings')
              .select(BARBER_SELECT)
              .eq('id', (payload.new as Booking).id)
              .single()
              .then(({ data }) => {
                if (data) setBookings(prev => [...prev, data as BookingWithClient])
              })
          } else if (payload.eventType === 'UPDATE') {
            setBookings(prev =>
              prev.map(b =>
                b.id === (payload.new as Booking).id
                  ? { ...b, ...(payload.new as Booking) }
                  : b,
              ),
            )
          }
        },
      )
      .subscribe()

    return () => { channelRef.current?.unsubscribe() }
  }, [barberId])

  const refetch = useCallback(() => {
    if (!barberId) return
    supabase
      .from('bookings')
      .select(BARBER_SELECT)
      .eq('barber_id', barberId)
      .order('date', { ascending: true })
      .then(({ data }) => { if (data) setBookings(data as BookingWithClient[]) })
  }, [barberId])

  return { bookings, refetch }
}
