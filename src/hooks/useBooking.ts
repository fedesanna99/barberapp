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
  }) {
    setLoading(true)
    const d = params.date
    // H1: format in local time so the date string matches day-of-week used for availability
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        client_id: params.clientId,
        barber_id: params.barberId,
        date:      dateStr,
        time_slot: params.timeSlot,
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

  const cancelBooking  = (bookingId: string) => updateStatus(bookingId, 'cancelled')
  const confirmBooking = (bookingId: string) => updateStatus(bookingId, 'confirmed')
  // 'declined' is the barber-side rejection of a pending booking, semantically
  // distinct from 'cancelled' (which is the client's annulment).
  const declineBooking = (bookingId: string) => updateStatus(bookingId, 'declined')
  const markDone       = (bookingId: string) => updateStatus(bookingId, 'done')

  return { createBooking, cancelBooking, declineBooking, confirmBooking, markDone, loading }
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
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!clientId) return

    supabase
      .from('bookings')
      .select(CLIENT_SELECT)
      .eq('client_id', clientId)
      .order('date', { ascending: true })
      .then(({ data }) => {
        if (data) setBookings(data as BookingWithBarber[])
      })

    channelRef.current = supabase
      .channel(`client_bookings_${clientId}`)
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

  return { bookings }
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
