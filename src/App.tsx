import { useState } from 'react'
import { C } from './lib/colors'
import { useAuth } from './hooks/useAuth'
import { useBarberByProfile } from './hooks/useBarbers'
import { useBookingToast } from './hooks/useBookingToast'
import { Toast } from './components/Toast'
import { Feed } from './screens/Feed'
import { Discover } from './screens/Discover'
import { Profile } from './screens/Profile'
import { Menu } from './screens/Menu'
import { BarberDashboard } from './screens/BarberDashboard'
import { BookingSheet } from './screens/BookingSheet'
import { BarberProfileSheet } from './screens/BarberProfileSheet'
import { Login } from './screens/Login'
import { Register } from './screens/Register'
import type { DemoBarber, DemoDate } from './lib/demoData'

type ScreenId = 'feed' | 'discover' | 'profile' | 'menu' | 'dashboard'
type AuthView = 'login' | 'register'

const CLIENT_NAV: { id: ScreenId; icon: string; label: string }[] = [
  { id: 'feed',     icon: 'ti-layout-grid',      label: 'Feed'      },
  { id: 'discover', icon: 'ti-map-search',        label: 'Discover'  },
  { id: 'profile',  icon: 'ti-user',              label: 'Profile'   },
  { id: 'menu',     icon: 'ti-menu-2',            label: 'Menu'      },
]

const BARBER_NAV: { id: ScreenId; icon: string; label: string }[] = [
  { id: 'feed',      icon: 'ti-layout-grid',       label: 'Feed'      },
  { id: 'dashboard', icon: 'ti-layout-dashboard',  label: 'Dashboard' },
  { id: 'profile',   icon: 'ti-user',              label: 'Profile'   },
  { id: 'menu',      icon: 'ti-menu-2',            label: 'Menu'      },
]

export default function App() {
  const { session } = useAuth()
  const userId  = session?.user.id

  const [loggedIn, setLoggedIn]           = useState(false)
  const [isBarber, setIsBarber]           = useState(false)
  const [authView, setAuthView]           = useState<AuthView>('login')
  const [screen, setScreen]               = useState<ScreenId>('feed')
  const [bookingBarber, setBookingBarber]   = useState<DemoBarber | null>(null)
  const [profileBarber, setProfileBarber]   = useState<DemoBarber | null>(null)
  const [showLikedFeed, setShowLikedFeed]   = useState(false)
  const [toast, setToast]                 = useState<string | null>(null)

  const barberId = useBarberByProfile(isBarber ? userId : undefined)

  // Real-time toast for clients when a barber confirms or cancels their booking
  useBookingToast(!isBarber ? userId : undefined, setToast)

  function handleLogin(asBarber = false) {
    setLoggedIn(true)
    setIsBarber(asBarber)
    if (asBarber) setScreen('dashboard')
  }

  function handleConfirm(barber: DemoBarber, date: DemoDate, time: string) {
    setBookingBarber(null)
    setProfileBarber(null)
    setToast(`${barber.name} · ${date.day} ${date.num} ${date.month} at ${time}`)
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: 430,
      height: '100dvh',
      background: C.bg,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      /* Subtle separator from the gray body background on wide screens */
      boxShadow: '0 0 0 0.5px rgba(0,0,0,0.08)',
    }}>

      {/* iOS safe-area top (Dynamic Island / notch) */}
      <div style={{ height: 'env(safe-area-inset-top, 0px)', flexShrink: 0, background: C.bg }} />

      {/* Screen area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {!loggedIn ? (
          authView === 'register'
            ? <Register onRegister={asBarber => handleLogin(asBarber)} onGoToLogin={() => setAuthView('login')} />
            : <Login    onLogin={handleLogin} onGoToRegister={() => setAuthView('register')} />
        ) : profileBarber ? (
          <BarberProfileSheet
            barber={profileBarber}
            onClose={() => setProfileBarber(null)}
            onBook={setBookingBarber}
          />
        ) : (
          <>
            {screen === 'feed'      && <Feed     userId={userId} barberId={barberId} onBook={setBookingBarber} onViewProfile={setProfileBarber} isBarber={isBarber} showLiked={showLikedFeed} onShowLikedChange={setShowLikedFeed} />}
            {screen === 'discover'  && <Discover onBook={setBookingBarber} onViewProfile={setProfileBarber} />}
            {screen === 'profile'   && <Profile userId={userId} isBarber={isBarber} barberId={barberId} />}
            {screen === 'dashboard' && <BarberDashboard barberId={barberId} />}
            {screen === 'menu'      && <Menu onLogout={() => { setLoggedIn(false); setIsBarber(false); setScreen('feed'); setAuthView('login') }} onLikedPosts={() => { setScreen('feed'); setShowLikedFeed(true) }} />}
          </>
        )}

        {bookingBarber && (
          <BookingSheet
            barber={bookingBarber}
            onClose={() => setBookingBarber(null)}
            onConfirm={handleConfirm}
          />
        )}

        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </div>

      {/* Bottom navbar */}
      {loggedIn && (
        <div style={{
          borderTop: `0.5px solid ${C.border}`,
          background: C.bg,
          flexShrink: 0,
        }}>
          <div style={{ height: 64, display: 'flex' }}>
            {(isBarber ? BARBER_NAV : CLIENT_NAV).map(({ id, icon, label }) => {
              const active = screen === id
              return (
                <button
                  key={id}
                  onClick={() => { setScreen(id); setProfileBarber(null); setBookingBarber(null); setShowLikedFeed(false) }}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 2, cursor: 'pointer', border: 'none',
                    background: 'none', padding: '6px 0 0', fontFamily: 'inherit',
                  }}
                >
                  <i className={`ti ${icon}`} style={{ fontSize: 22, color: active ? C.text : C.hint }} />
                  <span style={{ fontSize: 9, color: active ? C.text : C.hint, fontWeight: active ? 500 : 400 }}>{label}</span>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: C.text, opacity: active ? 1 : 0, marginTop: 1, transition: 'opacity .2s' }} />
                </button>
              )
            })}
          </div>
          {/* iOS home indicator safe area */}
          <div style={{ height: 'env(safe-area-inset-bottom, 0px)', background: C.bg }} />
        </div>
      )}
    </div>
  )
}
