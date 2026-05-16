export interface DemoBarber {
  id: number
  name: string
  initials: string
  city: string
  dist: number
  rating: number
  tags: string[]
  followers: number
  accent: string
}

export interface DemoPost {
  id: number
  barberId: number
  likes: number
  caption: string
  label: string
  timeAgo: string
  comments: number
}

export interface DemoDate {
  day: string
  num: number
  month: string
}

export const BARBERS: DemoBarber[] = [
  { id: 1, name: 'Marco Barba',   initials: 'MB', city: 'Cagliari centro', dist: 0.4, rating: 4.9, tags: ['Skin fade', 'Beard'],        followers: 1240, accent: '#5DCAA5' },
  { id: 2, name: 'Fadi Nour',     initials: 'FN', city: 'Poetto',          dist: 1.2, rating: 4.8, tags: ['Arabic shave', 'Fade'],       followers: 892,  accent: '#85B7EB' },
  { id: 3, name: 'Nico Testa',    initials: 'NT', city: 'Is Mirrionis',    dist: 2.1, rating: 4.7, tags: ['Classic', 'Texture'],         followers: 567,  accent: '#EF9F27' },
  { id: 4, name: 'Tariq Khalid',  initials: 'TK', city: 'Villanova',       dist: 2.8, rating: 4.9, tags: ['Taper', 'Line up'],           followers: 2103, accent: '#AFA9EC' },
  { id: 5, name: 'Luca Barbieri', initials: 'LB', city: 'Quartu',          dist: 4.5, rating: 4.6, tags: ['French crop', 'Beard'],       followers: 734,  accent: '#F09595' },
]

export const POSTS: DemoPost[] = [
  { id: 1, barberId: 1, likes: 312, caption: 'Mid skin fade, hard part, beard sculpt. Book via link in bio ✂️',       label: 'Skin fade + line up', timeAgo: '2h ago', comments: 18 },
  { id: 2, barberId: 2, likes: 187, caption: 'Arabic shave con razor fresco. Prenota dall\'app.',                     label: 'Arabic shave',        timeAgo: '3h ago', comments: 9  },
  { id: 3, barberId: 5, likes: 245, caption: 'French crop con texture. Prenota direttamente dall\'app.',              label: 'French crop',         timeAgo: '5h ago', comments: 14 },
  { id: 4, barberId: 3, likes: 198, caption: 'Classic cut, clean lines. Old school meets modern.',                    label: 'Classic cut',         timeAgo: '8h ago', comments: 11 },
]

export const CUT_LOG = [
  { date: 'May 12', barber: 'Marco Barba' },
  { date: 'Apr 28', barber: 'Fadi Nour'   },
  { date: 'Apr 10', barber: 'Marco Barba' },
  { date: 'Mar 22', barber: 'Nico Testa'  },
  { date: 'Mar 5',  barber: 'Marco Barba' },
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
    }
  })
}

export function getBarberById(id: number): DemoBarber | undefined {
  return BARBERS.find(b => b.id === id)
}
