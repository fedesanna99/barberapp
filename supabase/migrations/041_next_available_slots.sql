-- =============================================================
-- Migration 041 — RPC next_available_slots (Pari V4 Blocco 4.5)
-- =============================================================
-- Cabla i quick slots della Barber Preview Card del Discover V4.
-- Calcola gli N slot piu vicini per un barbiere, ritornando un mix di
-- available+taken ordinati cronologicamente (LIMIT N).
--
-- Logica:
--   1. Vacation gate: se barbers.accepting_bookings=false → 0 righe
--   2. Slot interval: COALESCE(barbers.default_slot_minutes, 30)
--   3. Lookout: 14 giorni dal p_from (constant c_lookout_days)
--   4. Per ogni giorno aperto (JOIN availability su day_of_week), genera
--      grid via generate_series, filtra slot passati + break window
--   5. Marca taken via NOT EXISTS sulla view booking_slots (mig 032)
--   6. ORDER BY (slot_date, slot_time) LIMIT p_count
--
-- Scenario A (taken logic): match esatto su (barber_id, date, time_slot).
-- Coerente con useAvailability.ts e indice partial unique bookings_no_double
-- (mig 008/009). NON considera service duration overlap — bug system-wide
-- consistente documentato come item backlog post-handoff (vedi
-- FIX_BLOCK_4_5_NEXT_SLOTS_NOTES.md sezione "Bug overlap durata service").
--
-- Index: NON creiamo un nuovo idx_bookings_barber_date_time_active perche
-- l'indice partial unique bookings_no_double (UNIQUE su (barber_id, date,
-- time_slot) WHERE status IN ('pending','confirmed'), mig 008/009) viene
-- usato dal planner come index scan per il NOT EXISTS lookup. Verifica
-- post-deploy via EXPLAIN ANALYZE.
-- =============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.next_available_slots(
  p_barber_id uuid,
  p_count     int         DEFAULT 6,
  p_from      timestamptz DEFAULT now()
)
RETURNS TABLE (
  slot_date      date,
  slot_time      time,
  slot_available boolean
)
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public, pg_temp
AS $func$
DECLARE
  c_lookout_days constant int := 14;
  v_slot_minutes int;
  v_accepting    boolean;
BEGIN
  -- (1) Vacation gate + fetch slot interval del barbiere
  SELECT b.accepting_bookings, COALESCE(b.default_slot_minutes, 30)
    INTO v_accepting, v_slot_minutes
    FROM public.barbers b
   WHERE b.id = p_barber_id;

  IF NOT FOUND OR NOT v_accepting THEN
    RETURN;
  END IF;

  -- (2-6) Genera grid + filtri + marcatura taken + LIMIT
  RETURN QUERY
  WITH days AS (
    SELECT d::date AS d_date,
           extract(dow FROM d)::int AS dow
      FROM generate_series(
             p_from::date,
             (p_from::date + (c_lookout_days - 1)),
             '1 day'::interval
           ) AS d
  ),
  open_days AS (
    SELECT d.d_date,
           a.start_time,
           a.end_time,
           a.break_start,
           a.break_end
      FROM days d
      JOIN public.availability a
        ON a.barber_id = p_barber_id
       AND a.day_of_week = d.dow
  ),
  raw_slots AS (
    SELECT od.d_date,
           (od.start_time + (gs * (v_slot_minutes || ' minutes')::interval))::time AS s_time,
           od.break_start,
           od.break_end
      FROM open_days od
      CROSS JOIN LATERAL generate_series(
        0,
        GREATEST(
          0,
          floor(
            (extract(epoch FROM (od.end_time - od.start_time)) / 60 / v_slot_minutes)::numeric
          )::int - 1
        )
      ) AS gs
  ),
  valid_slots AS (
    SELECT rs.d_date,
           rs.s_time
      FROM raw_slots rs
     WHERE (rs.d_date + rs.s_time)::timestamptz > p_from
       AND (
         rs.break_start IS NULL OR rs.break_end IS NULL
         OR (rs.s_time + (v_slot_minutes || ' minutes')::interval)::time <= rs.break_start
         OR rs.s_time >= rs.break_end
       )
  )
  SELECT vs.d_date AS slot_date,
         vs.s_time AS slot_time,
         NOT EXISTS (
           SELECT 1
             FROM public.booking_slots bs
            WHERE bs.barber_id = p_barber_id
              AND bs.date = vs.d_date
              AND bs.time_slot = vs.s_time
         ) AS slot_available
    FROM valid_slots vs
   ORDER BY vs.d_date, vs.s_time
   LIMIT p_count;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.next_available_slots(uuid, int, timestamptz)
  TO anon, authenticated;

COMMENT ON FUNCTION public.next_available_slots(uuid, int, timestamptz) IS
  'Returns next N time slots for a barber (mixed available+taken), ordered chronologically. 14-day lookout. Vacation-aware (accepting_bookings flag). STABLE SECURITY INVOKER. NOTA: taken check matches exact (date,time_slot) only, NON considera service duration overlap — bug system-wide consistente con useAvailability.ts + bookings_no_double (mig 008/009).';

COMMIT;
