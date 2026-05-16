import { useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useEffect, useRef } from 'react'
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
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        client_id: params.clientId,
        barber_id: params.barberId,
        date:      params.date.toISOString().split('T')[0],
        time_slot: params.timeSlot,
        status:    'pending' as const,
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
  }

  const cancelBooking = (bookingId: string) => updateStatus(bookingId, 'cancelled')
  const confirmBooking = (bookingId: string) => updateStatus(bookingId, 'confirmed')

  return { createBooking, cancelBooking, confirmBooking, loading }
}

// ── Queries ────────────────────────────────────────────────────────────────

export function useClientBookings(clientId: string | undefined) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!clientId) return

    supabase
      .from('bookings')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: true })
      .then(({ data }) => setBookings((data ?? []) as Booking[]))

    // Real-time updates for booking status changes
    channelRef.current = supabase
      .channel(`client_bookings_${clientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `client_id=eq.${clientId}` },
        payload => {
          if (payload.eventType === 'INSERT') {
            setBookings(prev => [...prev, payload.new as Booking])
          } else if (payload.eventType === 'UPDATE') {
            setBookings(prev =>
              prev.map(b => b.id === (payload.new as Booking).id ? payload.new as Booking : b),
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

export function useBarberBookings(barberId: string | undefined) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!barberId) return

    supabase
      .from('bookings')
      .select('*')
      .eq('barber_id', barberId)
      .order('date', { ascending: true })
      .then(({ data }) => setBookings((data ?? []) as Booking[]))

    channelRef.current = supabase
      .channel(`barber_bookings_${barberId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `barber_id=eq.${barberId}` },
        payload => {
          if (payload.eventType === 'INSERT') {
            setBookings(prev => [...prev, payload.new as Booking])
          } else if (payload.eventType === 'UPDATE') {
            setBookings(prev =>
              prev.map(b => b.id === (payload.new as Booking).id ? payload.new as Booking : b),
            )
          }
        },
      )
      .subscribe()

    return () => { channelRef.current?.unsubscribe() }
  }, [barberId])

  return { bookings }
}
