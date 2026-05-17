-- 'done' means the appointment is completed; free the slot so it can be rebooked.
drop index if exists bookings_no_double;

create unique index bookings_no_double
  on bookings (barber_id, date, time_slot)
  where status in ('pending', 'confirmed');
