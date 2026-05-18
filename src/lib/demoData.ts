export interface DemoBarber {
  id: string
  name: string
  initials: string
  city: string
  dist: number
  rating: number
  tags: string[]
  followers: number
  accent: string
  lat?: number
  lng?: number
}

export interface DemoPost {
  id: number
  barberId: string
  likes: number
  caption: string
  label: string
  timeAgo: string
  comments: number
  imageUrl?: string
}

export interface DemoDate {
  day: string
  num: number
  month: string
  date: Date
}

export const BARBERS: DemoBarber[] = [
  { id: '1', name: 'Marco Barba',   initials: 'MB', city: 'Cagliari centro', dist: 0.4, rating: 4.9, tags: ['Skin fade', 'Beard'],        followers: 1240, accent: '#5DCAA5', lat: 39.2238, lng: 9.1217 },
  { id: '2', name: 'Fadi Nour',     initials: 'FN', city: 'Poetto',          dist: 1.2, rating: 4.8, tags: ['Arabic shave', 'Fade'],       followers: 892,  accent: '#85B7EB', lat: 39.2087, lng: 9.1693 },
  { id: '3', name: 'Nico Testa',    initials: 'NT', city: 'Is Mirrionis',    dist: 2.1, rating: 4.7, tags: ['Classic', 'Texture'],         followers: 567,  accent: '#EF9F27', lat: 39.2354, lng: 9.0995 },
  { id: '4', name: 'Tariq Khalid',  initials: 'TK', city: 'Villanova',       dist: 2.8, rating: 4.9, tags: ['Taper', 'Line up'],           followers: 2103, accent: '#AFA9EC', lat: 39.2189, lng: 9.1289 },
  { id: '5', name: 'Luca Barbieri', initials: 'LB', city: 'Quartu',          dist: 4.5, rating: 4.6, tags: ['French crop', 'Beard'],       followers: 734,  accent: '#F09595', lat: 39.2402, lng: 9.2628 },
]

export const POSTS: DemoPost[] = [
  { id: 1, barberId: '1', likes: 312, caption: 'Mid skin fade, hard part, beard sculpt. Book via link in bio ✂️',       label: 'Skin fade + line up', timeAgo: '2h ago', comments: 18 },
  { id: 2, barberId: '2', likes: 187, caption: 'Arabic shave con razor fresco. Prenota dall\'app.',                     label: 'Arabic shave',        timeAgo: '3h ago', comments: 9  },
  { id: 3, barberId: '5', likes: 245, caption: 'French crop con texture. Prenota direttamente dall\'app.',              label: 'French crop',         timeAgo: '5h ago', comments: 14 },
  { id: 4, barberId: '3', likes: 198, caption: 'Classic cut, clean lines. Old school meets modern.',                    label: 'Classic cut',         timeAgo: '8h ago', comments: 11 },
]

export const CUT_LOG = [
  { date: 'May 12', barber: 'Marco Barba' },
  { date: 'Apr 28', barber: 'Fadi Nour'   },
  { date: 'Apr 10', barber: 'Marco Barba' },
  { date: 'Mar 22', barber: 'Nico Testa'  },
  { date: 'Mar 5',  barber: 'Marco Barba' },
]

export const UPCOMING = [
  { barber: 'Marco Barba', date: 'Sat 24 May',  time: '10:00', tag: 'Skin fade'  },
  { barber: 'Fadi Nour',   date: 'Mon 2 Jun',   time: '11:30', tag: 'Beard trim' },
]

// ── Barber dashboard demo data ─────────────────────────────────────────────

export interface DemoBarberBooking {
  id: string
  client: string
  initials: string
  date: string
  time: string
  service: string
  status: 'pending' | 'confirmed' | 'done'
}

export const DEMO_BARBER_BOOKINGS: DemoBarberBooking[] = [
  { id: 'b1', client: 'Andrea G.',  initials: 'AG', date: 'Mon 19 May', time: '10:00', service: 'Skin fade',   status: 'confirmed' },
  { id: 'b2', client: 'Luca R.',    initials: 'LR', date: 'Mon 19 May', time: '11:30', service: 'Beard trim',  status: 'confirmed' },
  { id: 'b3', client: 'Marco T.',   initials: 'MT', date: 'Tue 20 May', time: '09:00', service: 'Line up',     status: 'confirmed' },
  { id: 'b4', client: 'Davide M.',  initials: 'DM', date: 'Tue 20 May', time: '14:30', service: 'Classic cut', status: 'confirmed' },
  { id: 'b5', client: 'Simone P.',  initials: 'SP', date: 'Wed 21 May', time: '15:00', service: 'Taper fade',  status: 'confirmed' },
]

export interface DemoAvailRow {
  day_of_week: number
  start_time: string
  end_time: string
  break_start?: string
  break_end?: string
}

export const DEMO_AVAIL: DemoAvailRow[] = [
  { day_of_week: 1, start_time: '09:00', end_time: '18:00' },
  { day_of_week: 2, start_time: '09:00', end_time: '18:00' },
  { day_of_week: 3, start_time: '09:00', end_time: '18:00' },
  { day_of_week: 4, start_time: '09:00', end_time: '18:00' },
  { day_of_week: 5, start_time: '09:00', end_time: '17:00' },
]

export const SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','17:00']
export const TAKEN_INDICES = new Set([1, 4, 7])

const DAY_NAMES  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function getNext7Days(): DemoDate[] {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return {
      day:   i === 0 ? 'Today' : DAY_NAMES[d.getDay()],
      num:   d.getDate(),
      month: MONTH_NAMES[d.getMonth()],
      date:  d,
    }
  })
}

export function getBarberById(id: string): DemoBarber | undefined {
  return BARBERS.find(b => b.id === id)
}

// ── Admin panel demo data ──────────────────────────────────────────────────

export interface DemoAdminUser {
  id: string
  email: string
  display_name: string
  role: 'client' | 'barber' | 'admin'
  created_at: string
}

export const DEMO_ADMIN_USERS: DemoAdminUser[] = [
  { id: 'u0', email: 'admin@cutbook.it',    display_name: 'Admin',        role: 'admin',  created_at: '2026-01-01T10:00:00Z' },
  { id: 'u1', email: 'marco@cutbook.it',    display_name: 'Marco Barba',  role: 'barber', created_at: '2026-02-15T09:30:00Z' },
  { id: 'u2', email: 'fadi@cutbook.it',     display_name: 'Fadi Nour',    role: 'barber', created_at: '2026-02-20T11:00:00Z' },
  { id: 'u3', email: 'nico@cutbook.it',     display_name: 'Nico Testa',   role: 'barber', created_at: '2026-03-01T08:00:00Z' },
  { id: 'u4', email: 'andrea@cutbook.it',   display_name: 'Andrea G.',    role: 'client', created_at: '2026-03-10T14:00:00Z' },
  { id: 'u5', email: 'luca.r@cutbook.it',   display_name: 'Luca R.',      role: 'client', created_at: '2026-03-12T16:30:00Z' },
  { id: 'u6', email: 'marco.t@cutbook.it',  display_name: 'Marco T.',     role: 'client', created_at: '2026-04-01T08:00:00Z' },
  { id: 'u7', email: 'davide@cutbook.it',   display_name: 'Davide M.',    role: 'client', created_at: '2026-04-15T10:00:00Z' },
]

