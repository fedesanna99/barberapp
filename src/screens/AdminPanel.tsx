import { useState, useRef, useEffect } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { Toast, type ToastEvent } from '../components/Toast'
import { useAdminUsers, type AdminUser } from '../hooks/useAdminUsers'
import { useAdminLogs } from '../hooks/useAdminLogs'
import { useSupportAdmin, useSupportAdminChat, type ConvWithUser } from '../hooks/useSupportAdmin'
import { sendNotification } from '../hooks/useNotifications'
import { sanitizeNotificationHtml } from '../lib/sanitizeHtml'
import type { UserRole, LogLevel, SupportMessage } from '../types/supabase'

type AdminTab  = 'users' | 'logs' | 'support' | 'notify'
type LogFilter = 'all' | LogLevel

/* ---- helpers --------------------------------------------------------- */

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'adesso'
  if (m < 60) return `${m} m fa`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} h fa`
  return `${Math.floor(h / 24)} g fa`
}

function pill(bg: string, fg: string, label: string, icon?: string) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 9999,
      background: bg, color: fg,
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {icon && <i className={icon} style={{ fontSize: 11 }} />}
      {label}
    </span>
  )
}

function roleBadge(role: UserRole) {
  return role === 'barber'
    ? pill(C.greenSoft, C.green, 'Barbiere')
    : pill(C.surfaceAlt, C.muted, 'Cliente')
}

function adminBadge() {
  return pill(C.accentLight, C.accentDeep, 'Admin', 'ph-thin ph-shield-check')
}

/* ---- Add user modal -------------------------------------------------- */

function AddUserModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (email: string, pw: string, name: string, role: UserRole) => Promise<{ error: string | null }>
}) {
  const [email, setEmail]       = useState('')
  const [pw, setPw]             = useState('')
  const [name, setName]         = useState('')
  const [role, setRole]         = useState<UserRole>('client')
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState<string | null>(null)

  async function submit() {
    if (!email.trim()) { setErr('Email obbligatoria'); return }
    if (!pw || pw.length < 6) { setErr('Password minimo 6 caratteri'); return }
    if (!name.trim()) { setErr('Nome obbligatorio'); return }
    setLoading(true)
    const { error } = await onCreate(email.trim(), pw, name.trim(), role)
    setLoading(false)
    if (error) { setErr(error); return }
    onClose()
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 'var(--r-md)',
    border: `1px solid ${C.border}`, background: C.bg,
    fontSize: 14, color: C.text, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'var(--scrim)',
      display: 'flex', alignItems: 'flex-end', zIndex: 200,
      animation: 'scrimIn 200ms var(--ease)',
    }}>
      <div style={{
        width: '100%', background: C.bg, borderRadius: '20px 20px 0 0',
        padding: '20px 20px 28px', display: 'flex', flexDirection: 'column', gap: 14,
        boxShadow: 'var(--shadow-sheet)',
        animation: 'sheetUp 260ms var(--ease)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
            Aggiungi utente
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <i className="ph-thin ph-x" style={{ fontSize: 20, color: C.muted }} />
          </button>
        </div>

        <input placeholder="Nome visualizzato" value={name} onChange={e => setName(e.target.value)} style={inp} />
        <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} />
        <input placeholder="Password (min. 6 caratteri)" type="password" value={pw} onChange={e => setPw(e.target.value)} style={inp} />

        <div style={{ display: 'flex', gap: 6 }}>
          {(['client', 'barber'] as UserRole[]).map(r => {
            const active = role === r
            return (
              <button key={r} onClick={() => setRole(r)} style={{
                flex: 1, padding: '9px 0', borderRadius: 'var(--r-md)',
                border: `1px solid ${active ? C.text : C.border}`,
                background: active ? C.text : C.bg,
                color: active ? C.bg : C.muted,
                fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {r === 'client' ? 'Cliente' : 'Barbiere'}
              </button>
            )
          })}
        </div>

        {err && (
          <div style={{ fontSize: 12.5, color: C.red, padding: '10px 12px', borderRadius: 'var(--r-md)', background: C.redSoft }}>
            {err}
          </div>
        )}

        <button onClick={submit} disabled={loading} style={{
          padding: '13px 20px', borderRadius: 'var(--r-md)',
          background: loading ? C.surface : C.text,
          color:      loading ? C.muted : C.bg,
          border: `1px solid ${loading ? C.border : C.text}`,
          fontSize: 14, fontWeight: 500, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {loading
            ? <><i className="ph-thin ph-spinner-gap" style={{ fontSize: 16, animation: 'spin .8s linear infinite' }} /> Creazione…</>
            : 'Crea utente'}
        </button>
      </div>
    </div>
  )
}

/* ---- Confirm delete sheet ------------------------------------------- */

function ConfirmDeleteSheet({ user, onConfirm, onCancel }: { user: AdminUser; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'var(--scrim)',
      display: 'flex', alignItems: 'flex-end', zIndex: 200,
      animation: 'scrimIn 200ms var(--ease)',
    }}>
      <div style={{
        width: '100%', background: C.bg, borderRadius: '20px 20px 0 0',
        padding: '24px 20px 28px',
        boxShadow: 'var(--shadow-sheet)',
        animation: 'sheetUp 260ms var(--ease)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.redSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <i className="ph-thin ph-trash" style={{ fontSize: 24, color: C.red }} />
          </div>
          <p style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: C.text }}>
            Elimina utente
          </p>
          <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
            Vuoi eliminare <strong>{user.display_name}</strong>?<br />Questa azione è irreversibile.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '12px 0', borderRadius: 'var(--r-md)',
            border: `1px solid ${C.borderMed}`,
            background: C.bg, color: C.text, fontSize: 14, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Annulla
          </button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '12px 0', borderRadius: 'var(--r-md)',
            background: C.red, color: C.bg, border: `1px solid ${C.red}`,
            fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Elimina
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---- Role picker sheet ---------------------------------------------- */

function RoleSheet({ user, onPick, onCancel }: { user: AdminUser; onPick: (r: UserRole) => void; onCancel: () => void }) {
  const items: { role: UserRole; label: string }[] = [
    { role: 'client', label: 'Cliente'  },
    { role: 'barber', label: 'Barbiere' },
  ]
  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'var(--scrim)',
      display: 'flex', alignItems: 'flex-end', zIndex: 200,
      animation: 'scrimIn 200ms var(--ease)',
    }}>
      <div style={{
        width: '100%', background: C.bg, borderRadius: '20px 20px 0 0',
        padding: '20px 20px 28px',
        boxShadow: 'var(--shadow-sheet)',
        animation: 'sheetUp 260ms var(--ease)',
      }}>
        <p style={{ margin: '0 0 14px', fontSize: 12.5, fontWeight: 500, color: C.muted }}>
          Cambia ruolo — {user.display_name}
        </p>
        {items.map(({ role, label }) => {
          const active = user.role === role
          return (
            <button key={role} onClick={() => onPick(role)} style={{
              width: '100%', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
              background: active ? C.surface : C.bg, border: `1px solid ${active ? C.borderMed : C.border}`,
              borderRadius: 'var(--r-md)', cursor: 'pointer',
              fontFamily: 'inherit', marginBottom: 8, fontSize: 14, fontWeight: active ? 600 : 500,
              color: C.text,
            }}>
              <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
              {active && <i className="ph-thin ph-check" style={{ fontSize: 16, color: C.accent }} />}
            </button>
          )
        })}
        <button onClick={onCancel} style={{
          width: '100%', padding: '12px 0', marginTop: 4, borderRadius: 'var(--r-md)',
          border: `1px solid ${C.borderMed}`, background: C.bg,
          color: C.muted, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Annulla
        </button>
      </div>
    </div>
  )
}

/* ---- Users tab ------------------------------------------------------- */

function UsersTab({ onToast }: { onToast: (t: ToastEvent) => void }) {
  const { users, loading, error, createUser, deleteUser, changeRole, setIsAdmin, sendPasswordReset, reload } = useAdminUsers()
  const [search, setSearch]         = useState('')
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [showAdd, setShowAdd]       = useState(false)
  const [confirmDel, setConfirmDel] = useState<AdminUser | null>(null)
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null)
  const [busy, setBusy]             = useState<string | null>(null)

  const filtered = users.filter(u =>
    u.display_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete(user: AdminUser) {
    setConfirmDel(null)
    setBusy(user.id)
    const { error } = await deleteUser(user.id)
    setBusy(null)
    if (error) onToast({ kind: 'error', title: 'Eliminazione fallita', message: error })
    else onToast({ kind: 'success', title: 'Utente eliminato.', message: user.display_name })
  }

  async function handleRolePick(user: AdminUser, role: UserRole) {
    setRoleTarget(null)
    if (role === user.role) return
    setBusy(user.id)
    const { error } = await changeRole(user.id, role)
    setBusy(null)
    if (error) onToast({ kind: 'error', title: 'Cambio ruolo fallito', message: error })
    else onToast({ kind: 'success', title: 'Ruolo aggiornato.', message: `${user.display_name} è ora ${role === 'barber' ? 'barbiere' : 'cliente'}` })
  }

  async function handleReset(user: AdminUser) {
    setExpanded(null)
    setBusy(user.id)
    const { error } = await sendPasswordReset(user.email)
    setBusy(null)
    if (error) onToast({ kind: 'error', title: 'Invio reset fallito', message: error })
    else onToast({ kind: 'success', title: 'Email di reset inviata.', message: user.email })
  }

  async function handleToggleAdmin(user: AdminUser) {
    setExpanded(null)
    setBusy(user.id)
    const { error } = await setIsAdmin(user.id, !user.is_admin)
    setBusy(null)
    if (error) onToast({ kind: 'error', title: 'Toggle admin fallito', message: error })
    else onToast({
      kind:    'success',
      title:   user.is_admin ? 'Permessi admin rimossi.' : 'Promosso ad admin.',
      message: user.display_name,
    })
  }

  return (
    <>
      <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <i className="ph-thin ph-magnifying-glass" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: C.muted, pointerEvents: 'none' }} />
          <input
            placeholder="Cerca per nome o email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '11px 14px 11px 40px', borderRadius: 'var(--r-md)',
              border: `1px solid ${C.border}`, background: C.surfaceAlt,
              fontSize: 14, color: C.text, fontFamily: 'inherit',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      <div style={{ padding: '10px 20px 2px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11.5, color: error ? C.red : C.muted }}>
          {loading ? 'Caricamento…' : error ? 'Errore nel caricamento' : `${filtered.length} utent${filtered.length === 1 ? 'e' : 'i'}`}
        </span>
        <button onClick={reload} aria-label="Ricarica" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.muted }}>
          <i className="ph-thin ph-arrows-clockwise" style={{ fontSize: 16 }} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 80px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <i className="ph-thin ph-spinner-gap" style={{ fontSize: 28, color: C.muted, animation: 'spin .8s linear infinite' }} />
          </div>
        ) : error ? (
          <div style={{ margin: '24px 0', padding: '14px 16px', borderRadius: 'var(--r-md)', background: C.redSoft }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.red, marginBottom: 6 }}>Impossibile caricare gli utenti</div>
            <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.55 }}>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 48, color: C.muted, fontSize: 13.5 }}>Nessun utente trovato.</div>
        ) : filtered.map(user => {
          const isExpanded = expanded === user.id
          const isBusy = busy === user.id
          const ini = user.display_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

          return (
            <div key={user.id} style={{ marginBottom: 8 }}>
              <div
                onClick={() => setExpanded(isExpanded ? null : user.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  borderRadius: isExpanded ? '10px 10px 0 0' : 'var(--r-md)',
                  background: C.surface, cursor: 'pointer',
                  border: `1px solid ${C.border}`,
                  borderBottom: isExpanded ? 'none' : `1px solid ${C.border}`,
                }}
              >
                <Avatar initials={ini} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.2 }}>{user.display_name}</div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {roleBadge(user.role)}
                  {user.is_admin && adminBadge()}
                </div>
                {isBusy
                  ? <i className="ph-thin ph-spinner-gap" style={{ fontSize: 16, color: C.muted, animation: 'spin .8s linear infinite', flexShrink: 0 }} />
                  : <i className={`ph-thin ph-caret-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: 14, color: C.hint, flexShrink: 0 }} />
                }
              </div>

              {isExpanded && (
                <div style={{
                  display: 'flex',
                  borderRadius: '0 0 10px 10px',
                  border: `1px solid ${C.border}`, borderTop: 'none',
                  overflow: 'hidden', background: C.surface,
                }}>
                  {[
                    { label: 'Ruolo',                action: () => { setExpanded(null); setRoleTarget(user) } },
                    { label: user.is_admin ? 'Togli admin' : 'Admin', action: () => handleToggleAdmin(user) },
                    { label: 'Reset password',       action: () => handleReset(user) },
                    { label: 'Elimina',              action: () => { setExpanded(null); setConfirmDel(user) }, danger: true },
                  ].map(({ label, action, danger }, i, arr) => (
                    <button key={label} onClick={action} style={{
                      flex: 1, padding: '12px 0',
                      background: 'transparent', border: 'none',
                      borderRight: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                      cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 11.5, fontWeight: 500,
                      color: danger ? C.red : C.text,
                    }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={() => setShowAdd(true)}
        aria-label="Aggiungi utente"
        style={{
          position: 'absolute', bottom: 80, right: 20,
          width: 52, height: 52, borderRadius: '50%',
          background: C.text, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(10,10,10,0.18)',
        }}
      >
        <i className="ph-thin ph-plus" style={{ fontSize: 22, color: C.bg }} />
      </button>

      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          onCreate={async (email, pw, name, role) => {
            const result = await createUser(email, pw, name, role)
            if (!result.error) onToast({ kind: 'success', title: 'Utente creato.', message: `${name} · ${role === 'barber' ? 'barbiere' : 'cliente'}` })
            return result
          }}
        />
      )}
      {confirmDel && (
        <ConfirmDeleteSheet
          user={confirmDel}
          onConfirm={() => handleDelete(confirmDel)}
          onCancel={() => setConfirmDel(null)}
        />
      )}
      {roleTarget && (
        <RoleSheet
          user={roleTarget}
          onPick={role => handleRolePick(roleTarget, role)}
          onCancel={() => setRoleTarget(null)}
        />
      )}
    </>
  )
}

/* ---- Logs tab -------------------------------------------------------- */

const HIDDEN_LOGS_KEY = 'cutbook.admin.logs.hidden'

function loadHiddenLogs(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_LOGS_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    return Array.isArray(arr) ? new Set(arr.filter((x): x is string => typeof x === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

function saveHiddenLogs(ids: Set<string>) {
  try { localStorage.setItem(HIDDEN_LOGS_KEY, JSON.stringify([...ids])) } catch { /* quota */ }
}

function LogsTab({ onToast }: { onToast: (t: ToastEvent) => void }) {
  const { logs, loading, error, reload } = useAdminLogs()
  const [filter, setFilter] = useState<LogFilter>('all')
  const [hidden, setHidden] = useState<Set<string>>(() => loadHiddenLogs())

  const visible  = logs.filter(l => !hidden.has(l.id))
  const filtered = filter === 'all' ? visible : visible.filter(l => l.level === filter)

  const filters: { id: LogFilter; label: string }[] = [
    { id: 'all',     label: 'Tutti'    },
    { id: 'info',    label: 'Info'     },
    { id: 'warning', label: 'Warning'  },
    { id: 'error',   label: 'Errore'   },
  ]

  function handleClear() {
    if (filtered.length === 0) return
    const ids = filtered.map(l => l.id)
    setHidden(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      saveHiddenLogs(next)
      return next
    })
    onToast({
      kind:    'info',
      title:   'Log nascosti.',
      message: `${ids.length} riga${ids.length === 1 ? '' : 'he'} nascost${ids.length === 1 ? 'a' : 'e'} dalla vista`,
    })
  }

  function levelColor(level: LogLevel): string {
    if (level === 'error') return C.red
    if (level === 'warning') return C.accent
    return C.green
  }

  return (
    <>
      <div style={{ padding: '12px 20px 0', flexShrink: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flex: 1, overflowX: 'auto' }}>
          {filters.map(f => {
            const active = filter === f.id
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding: '6px 12px', borderRadius: 'var(--r-pill)',
                border: `1px solid ${active ? C.text : C.border}`,
                background: active ? C.text : C.surface,
                color:      active ? C.bg : C.muted,
                fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                flexShrink: 0,
              }}>
                {f.label}
              </button>
            )
          })}
        </div>
        <button onClick={handleClear} disabled={filtered.length === 0} style={{
          padding: '6px 10px', borderRadius: 'var(--r-md)', border: `1px solid ${filtered.length === 0 ? C.border : C.red}`,
          background: 'none', color: filtered.length === 0 ? C.hint : C.red,
          fontSize: 11.5, fontWeight: 500,
          cursor: filtered.length === 0 ? 'default' : 'pointer',
          fontFamily: 'inherit', flexShrink: 0,
        }}>
          Cancella
        </button>
      </div>

      <div style={{ padding: '8px 20px 4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11.5, color: C.muted }}>
          {loading ? 'Caricamento…' : `${filtered.length} event${filtered.length === 1 ? 'o' : 'i'}`}
        </span>
        <button onClick={reload} aria-label="Ricarica" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.muted }}>
          <i className="ph-thin ph-arrows-clockwise" style={{ fontSize: 16 }} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 80px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <i className="ph-thin ph-spinner-gap" style={{ fontSize: 28, color: C.muted, animation: 'spin .8s linear infinite' }} />
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', paddingTop: 40, color: C.red, fontSize: 13 }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 48, color: C.muted, fontSize: 13.5 }}>Nessun evento.</div>
        ) : filtered.map(log => (
          <div key={log.id} style={{
            display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 'var(--r-md)',
            background: C.surface, marginBottom: 6,
            borderLeft: `3px solid ${levelColor(log.level as LogLevel)}`,
            border: `1px solid ${C.border}`,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: C.text }}>{log.action}</span>
                <span style={{ fontSize: 11, color: C.hint, flexShrink: 0 }}>{timeAgo(log.created_at)}</span>
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{log.message}</div>
              {log.user_email && (
                <div style={{ fontSize: 11, color: C.hint, marginTop: 4 }}>{log.user_email}</div>
              )}
              {log.metadata && (
                <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 'var(--r-sm)', background: C.bg }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: C.muted }}>
                    {JSON.stringify(log.metadata)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/* ---- Support tab ---------------------------------------------------- */

function SupportBubble({ msg }: { msg: SupportMessage }) {
  const isAdmin = msg.is_admin
  const time = new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  return (
    <div style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '78%', padding: '9px 13px',
        borderRadius: isAdmin ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isAdmin ? C.text : C.surface,
        border: isAdmin ? 'none' : `1px solid ${C.border}`,
      }}>
        {!isAdmin && (
          <div style={{ fontSize: 10.5, fontWeight: 600, color: C.muted, marginBottom: 4 }}>Utente</div>
        )}
        <div style={{
          fontSize: 13.5, color: isAdmin ? C.bg : C.text,
          lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: isAdmin ? 'rgba(255,255,255,0.6)' : C.hint, marginTop: 4, textAlign: 'right' }}>
          {time}
        </div>
      </div>
    </div>
  )
}

function SupportThread({ conv, adminId, onBack }: { conv: ConvWithUser; adminId: string | undefined; onBack: () => void }) {
  const { messages, loading, sending, sendReply, closeConversation } = useSupportAdminChat(conv.id, adminId)
  const [text, setText] = useState('')
  const bottomRef       = useRef<HTMLDivElement>(null)
  const textareaRef     = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function handleSend() {
    const t = text.trim()
    if (!t || sending) return
    setText('')
    textareaRef.current?.focus()
    await sendReply(t)
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const ini = conv.userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={onBack} aria-label="Indietro" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <i className="ph-thin ph-arrow-left" style={{ fontSize: 20, color: C.muted }} />
        </button>
        <Avatar initials={ini} size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{conv.userName}</div>
          <div style={{ fontSize: 11, color: conv.status === 'open' ? C.green : C.hint }}>
            {conv.status === 'open' ? 'Aperta' : 'Chiusa'}
          </div>
        </div>
        {conv.status === 'open' && (
          <button
            onClick={async () => { await closeConversation(); onBack() }}
            style={{
              padding: '6px 10px', borderRadius: 'var(--r-md)',
              border: `1px solid ${C.borderMed}`, background: C.bg,
              color: C.text, fontSize: 11.5, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Chiudi
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ph-thin ph-spinner-gap" style={{ fontSize: 24, color: C.muted, animation: 'spin .8s linear infinite' }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 40, color: C.muted, fontSize: 13.5 }}>
            Nessun messaggio.
          </div>
        ) : (
          messages.map(msg => <SupportBubble key={msg.id} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {conv.status === 'open' && (
        <div style={{
          flexShrink: 0, padding: '10px 16px 16px',
          borderTop: `1px solid ${C.border}`,
          display: 'flex', gap: 10, alignItems: 'flex-end',
        }}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Rispondi all'utente…"
            rows={1}
            style={{
              flex: 1, borderRadius: 'var(--r-pill)',
              border: `1px solid ${C.border}`, background: C.surfaceAlt,
              padding: '10px 14px', fontSize: 13.5, color: C.text, fontFamily: 'inherit',
              outline: 'none', resize: 'none', maxHeight: 80, lineHeight: 1.4,
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            aria-label="Invia"
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: text.trim() ? C.text : C.surface,
              border: 'none', cursor: text.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {sending
              ? <i className="ph-thin ph-spinner-gap" style={{ fontSize: 16, color: C.bg, animation: 'spin .8s linear infinite' }} />
              : <i className="ph-thin ph-paper-plane-tilt" style={{ fontSize: 16, color: text.trim() ? C.bg : C.hint }} />
            }
          </button>
        </div>
      )}
    </div>
  )
}

function SupportTab({ adminId }: { adminId: string | undefined }) {
  const { conversations, loading, reload } = useSupportAdmin()
  const [selected, setSelected] = useState<ConvWithUser | null>(null)

  if (selected) {
    return (
      <SupportThread
        conv={selected}
        adminId={adminId}
        onBack={() => { setSelected(null); reload() }}
      />
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '10px 20px 4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11.5, color: C.muted }}>
          {loading ? 'Caricamento…' : `${conversations.length} conversazion${conversations.length === 1 ? 'e' : 'i'}`}
        </span>
        <button onClick={reload} aria-label="Ricarica" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.muted }}>
          <i className="ph-thin ph-arrows-clockwise" style={{ fontSize: 16 }} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 80px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <i className="ph-thin ph-spinner-gap" style={{ fontSize: 28, color: C.muted, animation: 'spin .8s linear infinite' }} />
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 48, color: C.muted, fontSize: 13.5 }}>
            Nessuna conversazione.
          </div>
        ) : (
          conversations.map(conv => {
            const ini = conv.userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
            const ago = timeAgo(conv.updated_at)
            return (
              <div
                key={conv.id}
                onClick={() => setSelected(conv)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 'var(--r-md)',
                  background: C.surface, marginBottom: 6,
                  cursor: 'pointer',
                  border: `1px solid ${C.border}`,
                }}
              >
                <Avatar initials={ini} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{conv.userName}</span>
                    {conv.status === 'open' && pill(C.greenSoft, C.green, 'Aperta')}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.lastMessage ?? 'Nessun messaggio'}
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right', fontSize: 11, color: C.hint }}>
                  {ago}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

/* ---- Notify tab ----------------------------------------------------- */

function NotifyTab({ onToast }: { onToast: (t: ToastEvent) => void }) {
  const { users, loading } = useAdminUsers()
  const [target, setTarget]   = useState<'broadcast' | string>('broadcast')
  const [search, setSearch]   = useState('')
  const [title, setTitle]     = useState('')
  const [body, setBody]       = useState('')
  const [sending, setSending] = useState(false)
  const [preview, setPreview] = useState(false)

  const filteredUsers = users.filter(u =>
    u.display_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()),
  )

  const canSend = title.trim().length > 0 && !sending

  async function handleSend() {
    if (!canSend) return
    setSending(true)
    const { error } = await sendNotification({
      recipientId: target === 'broadcast' ? null : target,
      title:       title.trim(),
      bodyHtml:    body.trim() || null,
    })
    setSending(false)
    if (error) { onToast({ kind: 'error', title: 'Invio fallito', message: error }); return }
    onToast({
      kind:    'success',
      title:   target === 'broadcast' ? 'Annuncio broadcast inviato.' : 'Notifica inviata.',
      message: target === 'broadcast'
        ? `Visibile a tutti gli utenti`
        : users.find(u => u.id === target)?.display_name ?? '',
    })
    setTitle('')
    setBody('')
  }

  const safePreview = sanitizeNotificationHtml(body)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 80px' }}>
      <p style={{ margin: '0 0 14px', fontSize: 12, color: C.muted, lineHeight: 1.55 }}>
        Invia una notifica a un singolo utente o a tutti (broadcast). L'HTML del corpo viene sanitizzato (solo tag base).
      </p>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12.5, fontWeight: 500, color: C.muted }}>Destinatario</label>
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <button onClick={() => setTarget('broadcast')} style={chip(target === 'broadcast')}>Tutti</button>
          <button onClick={() => setTarget(target === 'broadcast' ? (filteredUsers[0]?.id ?? '') : 'broadcast')} style={chip(target !== 'broadcast')}>
            Utente singolo
          </button>
        </div>
      </div>

      {target !== 'broadcast' && (
        <div style={{ marginBottom: 12 }}>
          <input
            placeholder="Cerca utente per nome o email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '11px 14px', borderRadius: 'var(--r-md)',
              border: `1px solid ${C.border}`, background: C.surfaceAlt,
              fontSize: 14, color: C.text, fontFamily: 'inherit',
              outline: 'none', boxSizing: 'border-box', marginBottom: 8,
            }}
          />
          <div style={{ maxHeight: 200, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: 'var(--r-md)' }}>
            {loading
              ? <div style={{ padding: 14, textAlign: 'center', color: C.muted, fontSize: 12.5 }}>Caricamento utenti…</div>
              : filteredUsers.length === 0
                ? <div style={{ padding: 14, textAlign: 'center', color: C.muted, fontSize: 12.5 }}>Nessun utente</div>
                : filteredUsers.slice(0, 20).map((u, i, arr) => {
                    const active = target === u.id
                    return (
                      <div
                        key={u.id}
                        onClick={() => setTarget(u.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px',
                          background: active ? C.surface : 'transparent',
                          borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <Avatar initials={u.display_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'} size={32} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, color: C.text, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {u.display_name}
                          </div>
                          <div style={{ fontSize: 11.5, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {u.email}
                          </div>
                        </div>
                        {active && <i className="ph-thin ph-check" style={{ fontSize: 16, color: C.accent }} />}
                      </div>
                    )
                  })}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12.5, fontWeight: 500, color: C.muted }}>Titolo</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="es. Manutenzione programmata"
          maxLength={120}
          style={{
            width: '100%', marginTop: 6, padding: '11px 14px', borderRadius: 'var(--r-md)',
            border: `1px solid ${C.border}`, background: C.bg,
            fontSize: 14, color: C.text, fontFamily: 'inherit',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: 12.5, fontWeight: 500, color: C.muted }}>Corpo (HTML semplice, opzionale)</label>
          <button
            onClick={() => setPreview(p => !p)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.accent, fontSize: 12, fontFamily: 'inherit', padding: 4,
            }}
          >
            {preview ? 'Modifica' : 'Anteprima'}
          </button>
        </div>
        {preview ? (
          <div
            style={{
              marginTop: 6, minHeight: 100,
              padding: 14, borderRadius: 'var(--r-md)',
              border: `1px solid ${C.border}`, background: C.surface,
              fontSize: 13, color: C.text, lineHeight: 1.55,
            }}
            dangerouslySetInnerHTML={{ __html: safePreview || '<em style="color:#999">— vuoto —</em>' }}
          />
        ) : (
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="<p>Ciao!</p><p>Domani l'app sarà offline per 30 min.</p>"
            rows={8}
            style={{
              width: '100%', marginTop: 6, borderRadius: 'var(--r-md)',
              border: `1px solid ${C.border}`, background: C.bg,
              padding: '12px 14px', fontSize: 13, color: C.text, fontFamily: 'var(--font-mono)',
              outline: 'none', boxSizing: 'border-box', resize: 'vertical',
            }}
          />
        )}
      </div>

      <button
        onClick={handleSend}
        disabled={!canSend}
        style={{
          width: '100%', padding: '14px 20px', borderRadius: 'var(--r-md)',
          background: canSend ? C.text : C.surface,
          color:      canSend ? C.bg : C.hint,
          border: `1px solid ${canSend ? C.text : C.border}`,
          fontSize: 14.5, fontWeight: 500,
          cursor: canSend ? 'pointer' : 'default',
          fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {sending
          ? <><i className="ph-thin ph-spinner-gap" style={{ fontSize: 17, animation: 'spin .8s linear infinite' }} /> Invio…</>
          : 'Invia notifica'}
      </button>
    </div>
  )
}

function chip(active: boolean): React.CSSProperties {
  return {
    padding: '8px 14px', borderRadius: 'var(--r-pill)',
    border: `1px solid ${active ? C.text : C.border}`,
    background: active ? C.text : C.surface,
    color:      active ? C.bg : C.muted,
    fontSize: 12.5, fontWeight: 500,
    cursor: 'pointer', fontFamily: 'inherit',
  }
}

/* ---- Main ------------------------------------------------------------ */

export function AdminPanel({ userId }: { userId?: string }) {
  const [tab, setTab]   = useState<AdminTab>('users')
  const [toast, setToast] = useState<ToastEvent | null>(null)

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'users',   label: 'Utenti'    },
    { id: 'notify',  label: 'Notifiche' },
    { id: 'logs',    label: 'Log'       },
    { id: 'support', label: 'Supporto'  },
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 20px 12px', flexShrink: 0 }}>
        <i className="ph-thin ph-shield-check" style={{ fontSize: 22, color: C.accent }} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.025em', color: C.text }}>
          Admin
        </span>
      </div>

      <div style={{ padding: '0 20px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', background: C.surface, borderRadius: 'var(--r-md)', padding: 3, border: `1px solid ${C.border}` }}>
          {tabs.map(t => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1, padding: '8px 0',
                  background: active ? C.bg : 'transparent',
                  color:      active ? C.text : C.muted,
                  border: 'none', borderRadius: 8,
                  fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500,
                  cursor: 'pointer',
                  boxShadow: active ? '0 1px 2px rgba(10,10,10,0.06)' : 'none',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {tab === 'users'   && <UsersTab   onToast={setToast} />}
        {tab === 'notify'  && <NotifyTab  onToast={setToast} />}
        {tab === 'logs'    && <LogsTab    onToast={setToast} />}
        {tab === 'support' && <SupportTab adminId={userId}   />}
      </div>

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
