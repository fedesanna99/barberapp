import { useState, useEffect } from 'react'
import { C } from './lib/colors'
import { IS_DEMO } from './lib/supabase'
import { useAuth } from './hooks/useAuth'
import { writeLog } from './hooks/useAdminLogs'
import { useBarberByProfile } from './hooks/useBarbers'
import { useBookingToast } from './hooks/useBookingToast'
import { useBooking } from './hooks/useBooking'
import { Toast } from './components/Toast'
import { Feed } from './screens/Feed'
import { Discover } from './screens/Discover'
import { Profile } from './screens/Profile'
import { Menu } from './screens/Menu'
import { BarberDashboard } from './screens/BarberDashboard'
import { AdminPanel } from './screens/AdminPanel'
import { BookingSheet } from './screens/BookingSheet'
import { BarberProfileSheet } from './screens/BarberProfileSheet'
import { SupportChat } from './screens/SupportChat'
import { Notifications } from './screens/Notifications'
import { MyAppointments } from './screens/MyAppointments'
import { Login } from './screens/Login'
import { Register } from './screens/Register'
import { ResetPassword } from './screens/ResetPassword'
import type { DemoBarber, DemoDate } from './lib/demoData'

type ScreenId = 'feed' | 'discover' | 'profile' | 'menu' | 'dashboard' | 'admin'
type AuthView = 'login' | 'register'

const CLIENT_NAV: { id: ScreenId; icon: string; label: string }[] = [
  { id: 'feed',     icon: 'ti-layout-grid',      label: 'Feed'      },
  { id: 'discover', icon: 'ti-map-search',        label: 'Esplora'   },
  { id: 'profile',  icon: 'ti-user',              label: 'Profilo'   },
  { id: 'menu',     icon: 'ti-menu-2',            label: 'Menu'      },
]

const BARBER_NAV: { id: ScreenId; icon: string; label: string }[] = [
  { id: 'feed',      icon: 'ti-layout-grid',       label: 'Feed'      },
  { id: 'discover',  icon: 'ti-map-search',         label: 'Esplora'   },
  { id: 'dashboard', icon: 'ti-layout-dashboard',  label: 'Dashboard' },
  { id: 'profile',   icon: 'ti-user',              label: 'Profilo'   },
  { id: 'menu',      icon: 'ti-menu-2',            label: 'Menu'      },
]

const ADMIN_NAV: { id: ScreenId; icon: string; label: string }[] = [
  { id: 'feed',    icon: 'ti-layout-grid',   label: 'Feed'     },
  { id: 'discover', icon: 'ti-map-search',   label: 'Esplora'  },
  { id: 'admin',   icon: 'ti-shield-lock',   label: 'Admin'    },
  { id: 'menu',    icon: 'ti-menu-2',        label: 'Menu'     },
]

export default function App() {
  const { session, isBarber: roleIsBarber, isAdmin: roleIsAdmin, loading, recoveryMode, clearRecoveryMode, signOut } = useAuth()
  const userId = session?.user.id

  const [loggedIn, setLoggedIn]         = useState(false)
  const [isBarber, setIsBarber]         = useState(false)
  const [isAdmin, setIsAdmin]           = useState(false)
  const [authView, setAuthView]         = useState<AuthView>('login')
  const [screen, setScreen]             = useState<ScreenId>('feed')
  const [bookingBarber, setBookingBarber] = useState<DemoBarber | null>(null)
  const [profileBarber, setProfileBarber] = useState<DemoBarber | null>(null)
  const [showLikedFeed, setShowLikedFeed] = useState(false)
  const [showSupport, setShowSupport]   = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMyAppointments, setShowMyAppointments] = useState(false)
  const [toast, setToast]               = useState<string | null>(null)

  const barberId = useBarberByProfile(isBarber ? userId : undefined)
  const { createBooking } = useBooking()

  // Real-time toast for clients when a barber confirms or cancels their booking
  useBookingToast(!isBarber ? userId : undefined, setToast)

  // C1: sync Supabase session → loggedIn (handles Google OAuth redirect).
  // Only ever set role flags to true here — never clear them — so a transient
  // SIGNED_OUT→TOKEN_REFRESHED from Supabase doesn't strip the barber/admin nav.
  // Clearing happens only in the explicit logout handler below.
  useEffect(() => {
    if (IS_DEMO || loading) return
    if (session) {
      setLoggedIn(true)
      if (roleIsBarber) setIsBarber(true)
      if (roleIsAdmin) { setIsAdmin(true); setScreen('admin') }
    }
  }, [session, roleIsBarber, roleIsAdmin, loading])

  function handleLogin(asBarber = false, asAdmin = false) {
    setLoggedIn(true)
    setIsBarber(asBarber)
    setIsAdmin(asAdmin)
    if (asAdmin)       setScreen('admin')
    else if (asBarber) setScreen('dashboard')
  }

  // C2: actually write the booking to the DB on confirm
  async function handleConfirm(barber: DemoBarber, date: DemoDate, time: string) {
    if (!IS_DEMO && userId) {
      const { error } = await createBooking({
        clientId: userId,
        barberId: barber.id,
        date:     date.date,
        timeSlot: time,
      })
      if (error) {
        const msg = error.message.includes('bookings_no_double')
          ? 'Quello slot è stato appena occupato — scegli un altro orario.'
          : `Prenotazione fallita: ${error.message}`
        writeLog('booking.conflict', `Prenotazione fallita: ${error.message}`, 'warning', { userId, metadata: { barber_id: barber.id, time_slot: time } })
        setToast(msg)
        return
      }
      writeLog('booking.created', `Nuova prenotazione da ${barber.name} alle ${time}`, 'info', { userId, metadata: { barber_id: barber.id, date: date.date, time_slot: time } })
    } else {
      writeLog('booking.created', `Nuova prenotazione da ${barber.name} alle ${time} (demo)`, 'info', { metadata: { barber: barber.name, time_slot: time } })
    }
    setBookingBarber(null)
    setProfileBarber(null)
    setToast(`${barber.name} · ${date.day} ${date.num} ${date.month} alle ${time}`)
  }

  const showLoading = !IS_DEMO && loading

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
      boxShadow: '0 0 0 0.5px rgba(0,0,0,0.08)',
    }}>

      {/* iOS safe-area top (Dynamic Island / notch) */}
      <div style={{ height: 'env(safe-area-inset-top, 0px)', flexShrink: 0, background: C.bg }} />

      {/* Screen area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {showLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-loader-2" style={{ fontSize: 36, color: C.muted, animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : recoveryMode ? (
          <ResetPassword onDone={clearRecoveryMode} />
        ) : !loggedIn ? (
          authView === 'register'
            ? <Register onRegister={asBarber => handleLogin(asBarber)} onGoToLogin={() => setAuthView('login')} />
            : <Login    onLogin={handleLogin} onGoToRegister={() => setAuthView('register')} />
        ) : profileBarber ? (
          <BarberProfileSheet
            barber={profileBarber}
            onClose={() => setProfileBarber(null)}
            onBook={setBookingBarber}
            userId={userId}
            isBarber={isBarber}
          />
        ) : (
          <>
            {screen === 'feed'      && <Feed     userId={userId} barberId={barberId} onBook={setBookingBarber} onViewProfile={setProfileBarber} isBarber={isBarber} showLiked={showLikedFeed} onShowLikedChange={setShowLikedFeed} />}
            {screen === 'discover'  && <Discover onBook={setBookingBarber} onViewProfile={setProfileBarber} />}
            {screen === 'profile'   && <Profile userId={userId} isBarber={isBarber} barberId={barberId} />}
            {isBarber && (
              <div style={{ flex: screen === 'dashboard' ? 1 : 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <BarberDashboard barberId={barberId} userId={userId} />
              </div>
            )}
            {isAdmin && (
              <div style={{ flex: screen === 'admin' ? 1 : 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <AdminPanel userId={userId} />
              </div>
            )}
            {screen === 'menu'      && <Menu
              isBarber={isBarber}
              barberId={barberId}
              userId={userId}
              onLogout={async () => {
                await signOut()
                setLoggedIn(false)
                setIsBarber(false)
                setIsAdmin(false)
                setScreen('feed')
                setAuthView('login')
              }}
              onLikedPosts={() => { setScreen('feed'); setShowLikedFeed(true) }}
              onSupport={() => setShowSupport(true)}
              onNotifications={() => setShowNotifications(true)}
              onAppointments={() => setShowMyAppointments(true)}
              onToast={setToast}
            />}
          </>
        )}

        {bookingBarber && (
          <BookingSheet
            barber={bookingBarber}
            onClose={() => setBookingBarber(null)}
            onConfirm={handleConfirm}
          />
        )}

        {showSupport && userId && (
          <SupportChat userId={userId} onClose={() => setShowSupport(false)} />
        )}

        {showNotifications && (
          <Notifications onClose={() => setShowNotifications(false)} />
        )}

        {showMyAppointments && userId && (
          <MyAppointments
            userId={userId}
            onClose={() => setShowMyAppointments(false)}
            onToast={setToast}
          />
        )}

        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </div>

      {/* Bottom navbar */}
      {loggedIn && !recoveryMode && (
        <div style={{
          borderTop: `0.5px solid ${C.border}`,
          background: C.bg,
          flexShrink: 0,
        }}>
          <div style={{ height: 64, display: 'flex' }}>
            {(isAdmin ? ADMIN_NAV : isBarber ? BARBER_NAV : CLIENT_NAV).map(({ id, icon, label }) => {
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
