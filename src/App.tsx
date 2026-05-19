import { useState, useEffect, useRef } from 'react'
import type { TouchEvent } from 'react'
import { IS_DEMO } from './lib/supabase'
import { useAuth } from './hooks/useAuth'
import { writeLog } from './hooks/useAdminLogs'
import { useBarberByProfile } from './hooks/useBarbers'
import { useBookingToast } from './hooks/useBookingToast'
import { useBooking } from './hooks/useBooking'
import { Toast, type ToastEvent } from './components/Toast'
import { Icon, type IconName } from './components/Icon'
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
import { DirectMessages } from './screens/DirectMessages'
import { Login } from './screens/Login'
import { Register } from './screens/Register'
import { ResetPassword } from './screens/ResetPassword'
import type { DemoBarber, DemoDate } from './lib/demoData'

const DEMO_BANNER_DISMISSED_KEY = 'cutbook_demo_banner_dismissed'
const PULL_REFRESH_START_ZONE_PX = 72
const PULL_DEAD_ZONE_PX = 10

function DemoBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 12px',
      background: 'var(--clay-soft)',
      color: 'var(--clay-deep)',
      fontSize: 11, fontWeight: 500, lineHeight: 1.3,
      borderBottom: '1px solid var(--ink-08)',
      flexShrink: 0,
    }}>
      <Icon name="warning" size={13} color="var(--clay-deep)" />
      <span style={{ flex: 1 }}>Modalità demo — nessun dato è persistente.</span>
      <button
        onClick={onDismiss}
        aria-label="Chiudi banner demo"
        style={{
          minWidth: 24, minHeight: 24, padding: 0,
          border: 'none', background: 'transparent', cursor: 'pointer',
          color: 'var(--clay-deep)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="close" size={12} />
      </button>
    </div>
  )
}

type ScreenId = 'feed' | 'discover' | 'profile' | 'menu' | 'dashboard' | 'admin'
type AuthView = 'login' | 'register'

const CLIENT_NAV: { id: ScreenId; icon: IconName; label: string }[] = [
  { id: 'feed',     icon: 'feed',     label: 'Feed'    },
  { id: 'discover', icon: 'map',      label: 'Esplora' },
  { id: 'profile',  icon: 'user',     label: 'Profilo' },
  { id: 'menu',     icon: 'menu',     label: 'Menu'    },
]

const BARBER_NAV: { id: ScreenId; icon: IconName; label: string }[] = [
  { id: 'feed',      icon: 'feed',     label: 'Feed'    },
  { id: 'discover',  icon: 'map',      label: 'Esplora' },
  { id: 'dashboard', icon: 'shop',     label: 'Bottega' },
  { id: 'profile',   icon: 'user',     label: 'Profilo' },
  { id: 'menu',      icon: 'menu',     label: 'Menu'    },
]

const ADMIN_NAV: { id: ScreenId; icon: IconName; label: string }[] = [
  { id: 'feed',     icon: 'feed',     label: 'Feed'    },
  { id: 'discover', icon: 'map',      label: 'Esplora' },
  { id: 'admin',    icon: 'shield',   label: 'Admin'   },
  { id: 'profile',  icon: 'user',     label: 'Profilo' },
  { id: 'menu',     icon: 'menu',     label: 'Menu'    },
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
  const [showSavedFeed, setShowSavedFeed] = useState(false)
  const [showSupport, setShowSupport]   = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMyAppointments, setShowMyAppointments] = useState(false)
  const [dmOpen, setDmOpen] = useState<null | { peerId: string; name: string | null; avatar: string | null; role: 'client' | 'barber' }>(null)
  const [showDmList, setShowDmList] = useState(false)
  const [toast, setToast]               = useState<ToastEvent | null>(null)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [pullDistance, setPullDistance] = useState(0)
  const [pullRefreshing, setPullRefreshing] = useState(false)
  const pullStartY = useRef<number | null>(null)
  const pullTracking = useRef(false)
  const [demoBannerOpen, setDemoBannerOpen] = useState(
    () => IS_DEMO && localStorage.getItem(DEMO_BANNER_DISMISSED_KEY) !== 'true'
  )

  const barberId = useBarberByProfile(isBarber ? userId : undefined)
  const { createBooking } = useBooking()

  useBookingToast(!isBarber ? userId : undefined, setToast)

  useEffect(() => {
    if (IS_DEMO || loading) return
    if (session) {
      setLoggedIn(true)
      if (roleIsBarber) setIsBarber(true)
      if (roleIsAdmin) { setIsAdmin(true); setScreen('admin') }
    }
  }, [session, roleIsBarber, roleIsAdmin, loading])

  function getScrollableAncestor(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof Element)) return null
    let el: Element | null = target
    while (el && el !== document.body) {
      if (el instanceof HTMLElement) {
        const { overflowY } = getComputedStyle(el)
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
          return el
        }
      }
      el = el.parentElement
    }
    return null
  }

  function isAtScrollableTop(target: EventTarget | null) {
    if (!(target instanceof Element)) return true
    if (target.closest('button, a, input, textarea, select, [contenteditable="true"], [role="button"]')) return false
    if (target.closest('.bb-sheet, .bb-scrim')) return false
    const scrollable = getScrollableAncestor(target)
    return !scrollable || scrollable.scrollTop <= 2
  }

  function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
    if (pullRefreshing || e.touches.length !== 1 || !isAtScrollableTop(e.target)) return
    const startY = e.touches[0].clientY
    const appTop = e.currentTarget.getBoundingClientRect().top
    if (startY > appTop + PULL_REFRESH_START_ZONE_PX) return
    pullStartY.current = startY
    pullTracking.current = true
  }

  function handleTouchMove(e: TouchEvent<HTMLDivElement>) {
    if (!pullTracking.current || pullStartY.current == null) return
    const delta = e.touches[0].clientY - pullStartY.current
    if (delta <= 0) {
      setPullDistance(0)
      return
    }
    // If the scroll container has scrolled (browser gave priority to scroll), cancel pull
    const scrollable = getScrollableAncestor(e.target)
    if (scrollable && scrollable.scrollTop > 2) {
      pullTracking.current = false
      pullStartY.current = null
      setPullDistance(0)
      return
    }
    // Dead zone: don't show indicator until > PULL_DEAD_ZONE_PX of intentional pull
    const effectiveDelta = Math.max(0, delta - PULL_DEAD_ZONE_PX)
    setPullDistance(Math.min(96, effectiveDelta * 0.55))
  }

  function handleTouchEnd() {
    if (!pullTracking.current) return
    const shouldReload = pullDistance >= 72
    pullTracking.current = false
    pullStartY.current = null
    if (!shouldReload) {
      setPullDistance(0)
      return
    }
    setPullRefreshing(true)
    setPullDistance(72)
    setRefreshNonce(n => n + 1)
    window.setTimeout(() => {
      setPullRefreshing(false)
      setPullDistance(0)
    }, 450)
  }

  function handleLogin(asBarber = false, asAdmin = false) {
    setLoggedIn(true)
    setIsBarber(asBarber)
    setIsAdmin(asAdmin)
    if (asAdmin)       setScreen('admin')
    else if (asBarber) setScreen('dashboard')
  }

  async function handleConfirm(barber: DemoBarber, date: DemoDate, time: string) {
    if (!IS_DEMO && userId) {
      const { error } = await createBooking({
        clientId: userId,
        barberId: barber.id,
        date:     date.date,
        timeSlot: time,
      })
      if (error) {
        const code = (error as { code?: string }).code
        const isConflict = code === '23P01' || error.message.includes('bookings_no_double')
        const isSelfBook = code === '23514' || /barber.*book.*herself|cannot book themselves/i.test(error.message)
        writeLog('booking.conflict', `Prenotazione fallita: ${error.message}`, 'warning', { userId, metadata: { barber_id: barber.id, time_slot: time } })
        if (isConflict) {
          setToast({ kind: 'error', title: 'Slot non più disponibile', message: 'Quello slot è stato appena occupato — scegli un altro orario.' })
        } else if (isSelfBook) {
          setToast({ kind: 'error', title: 'Operazione non consentita', message: 'Non puoi prenotare con te stesso.' })
        } else {
          setToast({ kind: 'error', title: 'Prenotazione fallita', message: error.message })
        }
        return
      }
      writeLog('booking.created', `Nuova prenotazione da ${barber.name} alle ${time}`, 'info', { userId, metadata: { barber_id: barber.id, date: date.date, time_slot: time } })
    } else {
      writeLog('booking.created', `Nuova prenotazione da ${barber.name} alle ${time} (demo)`, 'info', { metadata: { barber: barber.name, time_slot: time } })
    }
    setBookingBarber(null)
    setProfileBarber(null)
    setToast({
      kind:    'success',
      title:   'Prenotato.',
      message: `${date.day} ${date.num} ${date.month} · ${time} · ${barber.name}`,
    })
  }

  const showLoading = !IS_DEMO && loading
  const navItems = isAdmin ? ADMIN_NAV : isBarber ? BARBER_NAV : CLIENT_NAV

  return (
    <div
      className="bb-app"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        pullTracking.current = false
        pullStartY.current = null
        setPullDistance(0)
      }}
    >
      {(pullDistance > 0 || pullRefreshing) && (
        <div
          className={`bb-pull-refresh ${pullRefreshing ? 'is-refreshing' : ''}`}
          style={{ transform: `translate(-50%, ${Math.max(0, pullDistance - 44)}px)` }}
        >
          <Icon name="refresh" size={16} />
          <span>{pullRefreshing || pullDistance >= 72 ? 'Rilascia per aggiornare' : 'Tira per aggiornare'}</span>
        </div>
      )}
      <div style={{ height: 'env(safe-area-inset-top, 0px)', flexShrink: 0, background: 'var(--paper-3)' }} />

      {demoBannerOpen && (
        <DemoBanner onDismiss={() => {
          localStorage.setItem(DEMO_BANNER_DISMISSED_KEY, 'true')
          setDemoBannerOpen(false)
        }} />
      )}

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {showLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="refresh" size={28} color="var(--ink-40)" style={{ animation: 'spin 0.8s linear infinite' }} />
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
            myBarberId={barberId}
            onToast={setToast}
            onMessage={peer => { setProfileBarber(null); setDmOpen(peer) }}
          />
        ) : (
          <>
            {screen === 'feed'      && <Feed     key={`feed-${refreshNonce}`} userId={userId} barberId={barberId} onBook={setBookingBarber} onViewProfile={setProfileBarber} isBarber={isBarber} showLiked={showLikedFeed} onShowLikedChange={setShowLikedFeed} showSaved={showSavedFeed} onShowSavedChange={setShowSavedFeed} onToast={setToast} />}
            {screen === 'discover'  && <Discover key={`discover-${refreshNonce}`} onBook={setBookingBarber} onViewProfile={setProfileBarber} myBarberId={barberId} />}
            {screen === 'profile'   && <Profile key={`profile-${refreshNonce}`} userId={userId} isBarber={isBarber} barberId={barberId} onToast={setToast} />}
            {isBarber && (
              <div key={`dashboard-${refreshNonce}`} style={{ flex: screen === 'dashboard' ? 1 : 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <BarberDashboard barberId={barberId} userId={userId} onToast={setToast} />
              </div>
            )}
            {isAdmin && (
              <div key={`admin-${refreshNonce}`} style={{ flex: screen === 'admin' ? 1 : 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <AdminPanel userId={userId} />
              </div>
            )}
            {screen === 'menu'      && <Menu
              key={`menu-${refreshNonce}`}
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
              onSavedPosts={() => { setScreen('feed'); setShowSavedFeed(true); setShowLikedFeed(false) }}
              onSupport={() => setShowSupport(true)}
              onNotifications={() => setShowNotifications(true)}
              onAppointments={() => setShowMyAppointments(true)}
              onMessages={() => setShowDmList(true)}
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
          <Notifications userId={userId} onClose={() => setShowNotifications(false)} />
        )}

        {showMyAppointments && userId && (
          <MyAppointments
            userId={userId}
            onClose={() => setShowMyAppointments(false)}
            onToast={setToast}
          />
        )}

        {(dmOpen || showDmList) && (
          <DirectMessages
            userId={userId}
            onClose={() => { setDmOpen(null); setShowDmList(false) }}
            initialPeer={dmOpen ? {
              profileId:   dmOpen.peerId,
              displayName: dmOpen.name,
              avatarUrl:   dmOpen.avatar,
              role:        dmOpen.role,
            } : null}
            onToast={setToast}
          />
        )}

        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      </div>

      {loggedIn && !recoveryMode && (
        <nav className="bb-bottom-nav">
          <div className="bb-bottom-nav__row">
            {navItems.map(({ id, icon, label }) => {
              const active = screen === id
              return (
                <button
                  key={id}
                  className={`bb-bottom-nav__btn ${active ? 'active' : ''}`}
                  onClick={() => {
                    setScreen(id)
                    setProfileBarber(null)
                    setBookingBarber(null)
                    setShowLikedFeed(false)
                    setShowSavedFeed(false)
                    setShowNotifications(false)
                    setShowMyAppointments(false)
                    setShowSupport(false)
                    setDmOpen(null)
                    setShowDmList(false)
                  }}
                >
                  <Icon
                    name={icon}
                    size={22}
                    weight={active && icon !== 'menu' ? 'fill' : 'regular'}
                    color={active ? 'var(--clay)' : 'var(--ink-50)'}
                  />
                  <span className="lbl">{label}</span>
                </button>
              )
            })}
          </div>
          <div className="bb-safe-bot" />
        </nav>
      )}
    </div>
  )
}
