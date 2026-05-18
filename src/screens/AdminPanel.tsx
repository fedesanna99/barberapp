import { useState, useRef, useEffect } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { Toast, type ToastEvent } from '../components/Toast'
import { useAdminUsers, type AdminUser } from '../hooks/useAdminUsers'
import { useAdminLogs } from '../hooks/useAdminLogs'
import { useSupportAdmin, useSupportAdminChat, type ConvWithUser } from '../hooks/useSupportAdmin'
import type { UserRole, LogLevel, SupportMessage } from '../types/supabase'

type AdminTab  = 'users' | 'logs' | 'support'
type LogFilter = 'all' | LogLevel

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'adesso'
  if (m < 60) return `${m}m fa`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h fa`
  return `${Math.floor(h / 24)}g fa`
}

function roleBadge(role: UserRole) {
  const map: Record<UserRole, { label: string; bg: string; color: string }> = {
    admin:  { label: 'Admin',     bg: 'rgba(201,150,58,0.15)',  color: C.accent },
    barber: { label: 'Barbiere',  bg: 'rgba(29,158,117,0.13)',  color: C.green  },
    client: { label: 'Cliente',   bg: 'rgba(120,120,140,0.13)', color: C.muted  },
  }
  const s = map[role]
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  )
}

function levelDot(level: LogLevel) {
  const color = level === 'error' ? C.red : level === 'warning' ? '#F59E0B' : C.green
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: color, flexShrink: 0, marginTop: 2,
    }} />
  )
}

// ── Add User Modal ─────────────────────────────────────────────────────────

interface AddModalProps {
  onClose: () => void
  onCreate: (email: string, pw: string, name: string, role: UserRole) => Promise<{ error: string | null }>
}

function AddUserModal({ onClose, onCreate }: AddModalProps) {
  const [email, setEmail]       = useState('')
  const [pw, setPw]             = useState('')
  const [name, setName]         = useState('')
  const [role, setRole]         = useState<UserRole>('client')
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState<string | null>(null)
  const [focused, setFocused]   = useState<string | null>(null)

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

  const inp = (active: boolean): React.CSSProperties => ({
    width: '100%', height: 44, borderRadius: 10,
    border: `1.5px solid ${active ? C.accent : C.borderMed}`,
    background: C.surface, padding: '0 12px',
    fontSize: 14, color: C.text, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s',
  })

  const ROLES: UserRole[] = ['client', 'barber', 'admin']

  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-end', zIndex: 200,
      animation: 'fadeSlideIn .2s ease',
    }}>
      <div style={{
        width: '100%', background: C.bg, borderRadius: '20px 20px 0 0',
        padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.text }}>Aggiungi utente</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <i className="ti ti-x" style={{ fontSize: 20, color: C.muted }} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input placeholder="Nome visualizzato" value={name} onChange={e => setName(e.target.value)}
            onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
            style={inp(focused === 'name')} />
          <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)}
            onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
            style={inp(focused === 'email')} />
          <input placeholder="Password (min. 6 caratteri)" type="password" value={pw} onChange={e => setPw(e.target.value)}
            onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)}
            style={inp(focused === 'pw')} />

          <div style={{ display: 'flex', gap: 8 }}>
            {ROLES.map(r => {
              const labels: Record<UserRole, string> = { client: 'Cliente', barber: 'Barbiere', admin: 'Admin' }
              const active = role === r
              return (
                <button key={r} onClick={() => setRole(r)} style={{
                  flex: 1, height: 36, borderRadius: 8, border: `1.5px solid ${active ? C.accent : C.borderMed}`,
                  background: active ? C.accentLight : C.surface,
                  color: active ? C.accent : C.muted,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all .15s',
                }}>
                  {labels[r]}
                </button>
              )
            })}
          </div>
        </div>

        {err && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 10, background: 'rgba(226,75,74,0.08)' }}>
            <i className="ti ti-alert-circle" style={{ color: C.red, fontSize: 15, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: C.red }}>{err}</span>
          </div>
        )}

        <button onClick={submit} disabled={loading} style={{
          height: 48, borderRadius: 12, border: 'none',
          background: loading ? C.accentLight : C.accent,
          color: loading ? C.accent : '#fff',
          fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {loading
            ? <><i className="ti ti-loader-2" style={{ fontSize: 17, animation: 'spin 0.8s linear infinite' }} /> Creazione…</>
            : 'Crea utente'}
        </button>
      </div>
    </div>
  )
}

// ── Confirm Delete Sheet ───────────────────────────────────────────────────

function ConfirmDeleteSheet({ user, onConfirm, onCancel }: { user: AdminUser; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-end', zIndex: 200,
    }}>
      <div style={{ width: '100%', background: C.bg, borderRadius: '20px 20px 0 0', padding: '24px 20px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(226,75,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <i className="ti ti-trash" style={{ fontSize: 22, color: C.red }} />
          </div>
          <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: C.text }}>Elimina utente</p>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
            Vuoi eliminare <strong>{user.display_name}</strong>?<br />Questa azione è irreversibile.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, height: 48, borderRadius: 12, border: `1.5px solid ${C.borderMed}`,
            background: C.surface, color: C.text, fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Annulla
          </button>
          <button onClick={onConfirm} style={{
            flex: 1, height: 48, borderRadius: 12, border: 'none',
            background: C.red, color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Elimina
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Role Picker Sheet ──────────────────────────────────────────────────────

function RoleSheet({ user, onPick, onCancel }: { user: AdminUser; onPick: (r: UserRole) => void; onCancel: () => void }) {
  const items: { role: UserRole; label: string; icon: string }[] = [
    { role: 'client', label: 'Cliente',  icon: 'ti-user'         },
    { role: 'barber', label: 'Barbiere', icon: 'ti-scissors'     },
    { role: 'admin',  label: 'Admin',    icon: 'ti-shield-lock'  },
  ]
  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-end', zIndex: 200,
    }}>
      <div style={{ width: '100%', background: C.bg, borderRadius: '20px 20px 0 0', padding: '20px 20px 32px' }}>
        <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: .5 }}>
          Cambia ruolo — {user.display_name}
        </p>
        {items.map(({ role, label, icon }) => {
          const active = user.role === role
          return (
            <button key={role} onClick={() => onPick(role)} style={{
              width: '100%', height: 50, display: 'flex', alignItems: 'center', gap: 14,
              background: active ? C.accentLight : 'none', border: 'none',
              borderRadius: 12, padding: '0 14px', cursor: 'pointer',
              fontFamily: 'inherit', marginBottom: 4,
            }}>
              <i className={`ti ${icon}`} style={{ fontSize: 20, color: active ? C.accent : C.muted }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: active ? C.accent : C.text }}>{label}</span>
              {active && <i className="ti ti-check" style={{ fontSize: 16, color: C.accent, marginLeft: 'auto' }} />}
            </button>
          )
        })}
        <button onClick={onCancel} style={{
          width: '100%', height: 44, marginTop: 8, borderRadius: 12,
          border: `1.5px solid ${C.borderMed}`, background: C.surface,
          color: C.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Annulla
        </button>
      </div>
    </div>
  )
}

// ── Users Tab ──────────────────────────────────────────────────────────────

function UsersTab({ onToast }: { onToast: (t: ToastEvent) => void }) {
  const { users, loading, error, createUser, deleteUser, changeRole, sendPasswordReset, reload } = useAdminUsers()
  const [search, setSearch]             = useState('')
  const [expanded, setExpanded]         = useState<string | null>(null)
  const [showAdd, setShowAdd]           = useState(false)
  const [confirmDel, setConfirmDel]     = useState<AdminUser | null>(null)
  const [roleTarget, setRoleTarget]     = useState<AdminUser | null>(null)
  const [busy, setBusy]                 = useState<string | null>(null)

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
    else onToast({ kind: 'success', title: 'Utente eliminato', message: user.display_name })
  }

  async function handleRolePick(user: AdminUser, role: UserRole) {
    setRoleTarget(null)
    if (role === user.role) return
    setBusy(user.id)
    const { error } = await changeRole(user.id, role)
    setBusy(null)
    if (error) onToast({ kind: 'error', title: 'Cambio ruolo fallito', message: error })
    else onToast({ kind: 'success', title: 'Ruolo aggiornato', message: `${user.display_name} è ora ${role}` })
  }

  async function handleReset(user: AdminUser) {
    setExpanded(null)
    setBusy(user.id)
    const { error } = await sendPasswordReset(user.email)
    setBusy(null)
    if (error) onToast({ kind: 'error', title: 'Invio reset fallito', message: error })
    else onToast({ kind: 'success', title: 'Email di reset inviata', message: user.email })
  }

  return (
    <>
      {/* Search */}
      <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 17, color: C.hint, pointerEvents: 'none' }} />
          <input
            placeholder="Cerca per nome o email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', height: 40, borderRadius: 10,
              border: `1.5px solid ${C.borderMed}`, background: C.surface,
              paddingLeft: 36, paddingRight: 12,
              fontSize: 13, color: C.text, fontFamily: 'inherit',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Count + reload */}
      <div style={{ padding: '8px 16px 2px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: error ? C.red : C.hint }}>
          {loading ? 'Caricamento…' : error ? 'Errore nel caricamento' : `${filtered.length} utent${filtered.length === 1 ? 'e' : 'i'}`}
        </span>
        <button onClick={reload} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.hint }}>
          <i className="ti ti-refresh" style={{ fontSize: 15 }} />
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 80px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <i className="ti ti-loader-2" style={{ fontSize: 28, color: C.muted, animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : error ? (
          <div style={{ margin: '24px 0', padding: '14px 16px', borderRadius: 12, background: 'rgba(226,75,74,0.08)', border: `1px solid rgba(226,75,74,0.2)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <i className="ti ti-alert-circle" style={{ color: C.red, fontSize: 17 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.red }}>Impossibile caricare gli utenti</span>
            </div>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{error}</p>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: C.hint, lineHeight: 1.5 }}>
              Verifica di aver eseguito la migrazione <strong>011_admin_functions.sql</strong> su Supabase.
            </p>
            <button onClick={reload} style={{
              padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.borderMed}`,
              background: C.surface, color: C.text, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Riprova
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 40, color: C.hint, fontSize: 14 }}>Nessun utente trovato</div>
        ) : filtered.map(user => {
          const isExpanded = expanded === user.id
          const isBusy = busy === user.id
          const initials = user.display_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
          const accent = user.role === 'admin' ? C.accent : user.role === 'barber' ? C.green : C.muted

          return (
            <div key={user.id} style={{ marginBottom: 6 }}>
              {/* User row */}
              <div
                onClick={() => setExpanded(isExpanded ? null : user.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: isExpanded ? '12px 12px 0 0' : 12,
                  background: C.surface, cursor: 'pointer',
                  border: `1px solid ${isExpanded ? C.borderMed : 'transparent'}`,
                  transition: 'border-color .15s',
                }}
              >
                <Avatar initials={initials} size={38} accent={accent} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.2 }}>{user.display_name}</div>
                  <div style={{ fontSize: 11, color: C.hint, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                </div>
                {roleBadge(user.role)}
                {isBusy
                  ? <i className="ti ti-loader-2" style={{ fontSize: 16, color: C.muted, animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                  : <i className={`ti ti-chevron-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: 16, color: C.hint, flexShrink: 0 }} />
                }
              </div>

              {/* Expanded actions */}
              {isExpanded && (
                <div style={{
                  display: 'flex', borderRadius: '0 0 12px 12px',
                  border: `1px solid ${C.borderMed}`, borderTop: `1px solid ${C.border}`,
                  overflow: 'hidden',
                }}>
                  {[
                    { icon: 'ti-shield-half', label: 'Ruolo',  action: () => { setExpanded(null); setRoleTarget(user) } },
                    { icon: 'ti-mail',        label: 'Reset',  action: () => handleReset(user) },
                    { icon: 'ti-trash',       label: 'Elimina', action: () => { setExpanded(null); setConfirmDel(user) }, danger: true },
                  ].map(({ icon, label, action, danger }) => (
                    <button key={label} onClick={action} style={{
                      flex: 1, height: 44, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 3,
                      background: C.surface, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      borderRight: `1px solid ${C.border}`,
                    }}>
                      <i className={`ti ${icon}`} style={{ fontSize: 17, color: danger ? C.red : C.accent }} />
                      <span style={{ fontSize: 9, color: danger ? C.red : C.muted, fontWeight: 500 }}>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* FAB add */}
      <button
        onClick={() => setShowAdd(true)}
        style={{
          position: 'absolute', bottom: 80, right: 20,
          width: 52, height: 52, borderRadius: 16,
          background: C.accent, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(201,150,58,0.4)',
        }}
      >
        <i className="ti ti-user-plus" style={{ fontSize: 22, color: '#fff' }} />
      </button>

      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          onCreate={async (email, pw, name, role) => {
            const result = await createUser(email, pw, name, role)
            if (!result.error) onToast({ kind: 'success', title: 'Utente creato', message: `${name} · ${role}` })
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

// ── Logs Tab ───────────────────────────────────────────────────────────────

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
  try { localStorage.setItem(HIDDEN_LOGS_KEY, JSON.stringify([...ids])) } catch { /* quota / private mode */ }
}

function LogsTab({ onToast }: { onToast: (t: ToastEvent) => void }) {
  const { logs, loading, error, reload } = useAdminLogs()
  const [filter, setFilter] = useState<LogFilter>('all')
  const [hidden, setHidden] = useState<Set<string>>(() => loadHiddenLogs())

  const visible  = logs.filter(l => !hidden.has(l.id))
  const filtered = filter === 'all' ? visible : visible.filter(l => l.level === filter)

  const filters: { id: LogFilter; label: string; color: string }[] = [
    { id: 'all',     label: 'Tutti',    color: C.muted  },
    { id: 'info',    label: 'Info',     color: C.green  },
    { id: 'warning', label: 'Warning',  color: '#F59E0B' },
    { id: 'error',   label: 'Errore',   color: C.red    },
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
    const titles: Record<LogFilter, string> = {
      all:     'Tutti i log nascosti',
      info:    'Log info nascosti',
      warning: 'Log warning nascosti',
      error:   'Log errore nascosti',
    }
    onToast({
      kind:    'success',
      title:   titles[filter],
      message: `${ids.length} riga${ids.length === 1 ? '' : 'he'} nascost${ids.length === 1 ? 'a' : 'e'} dalla vista`,
    })
  }

  return (
    <>
      {/* Filters + clear */}
      <div style={{ padding: '12px 16px 0', flexShrink: 0, display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flex: 1, overflowX: 'auto' }}>
          {filters.map(f => {
            const active = filter === f.id
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding: '5px 12px', borderRadius: 20, border: 'none',
                background: active ? f.color : C.surface,
                color: active ? '#fff' : C.muted,
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                flexShrink: 0, transition: 'all .15s',
              }}>
                {f.label}
              </button>
            )
          })}
        </div>
        <button onClick={handleClear} disabled={filtered.length === 0} style={{
          padding: '5px 10px', borderRadius: 8, border: `1px solid ${C.borderMed}`,
          background: 'none', color: filtered.length === 0 ? C.hint : C.red,
          fontSize: 11, fontWeight: 600,
          cursor: filtered.length === 0 ? 'default' : 'pointer',
          fontFamily: 'inherit', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <i className="ti ti-trash" style={{ fontSize: 12 }} />
          Cancella
        </button>
      </div>

      {/* Count + reload */}
      <div style={{ padding: '6px 16px 2px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: C.hint }}>
          {loading ? 'Caricamento…' : `${filtered.length} event${filtered.length === 1 ? 'o' : 'i'}`}
        </span>
        <button onClick={reload} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.hint }}>
          <i className="ti ti-refresh" style={{ fontSize: 15 }} />
        </button>
      </div>

      {/* Log list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 80px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <i className="ti ti-loader-2" style={{ fontSize: 28, color: C.muted, animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', paddingTop: 40, color: C.red, fontSize: 13 }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 40, color: C.hint, fontSize: 14 }}>Nessun evento</div>
        ) : filtered.map(log => {
          const levelColor = log.level === 'error' ? C.red : log.level === 'warning' ? '#F59E0B' : C.green
          return (
            <div key={log.id} style={{
              display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 10,
              background: C.surface, marginBottom: 6,
              borderLeft: `3px solid ${levelColor}`,
            }}>
              <div style={{ paddingTop: 4 }}>{levelDot(log.level as LogLevel)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: 'monospace' }}>{log.action}</span>
                  <span style={{ fontSize: 10, color: C.hint, flexShrink: 0 }}>{timeAgo(log.created_at)}</span>
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 2, lineHeight: 1.35 }}>{log.message}</div>
                {log.user_email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <i className="ti ti-user" style={{ fontSize: 11, color: C.hint }} />
                    <span style={{ fontSize: 10, color: C.hint }}>{log.user_email}</span>
                  </div>
                )}
                {log.metadata && (
                  <div style={{ marginTop: 4, padding: '4px 8px', borderRadius: 6, background: C.bg }}>
                    <span style={{ fontSize: 10, color: C.hint, fontFamily: 'monospace' }}>
                      {JSON.stringify(log.metadata)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── Support Tab ────────────────────────────────────────────────────────────

function SupportBubble({ msg }: { msg: SupportMessage }) {
  const isAdmin = msg.is_admin
  const time = new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  return (
    <div style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '76%', padding: '8px 12px',
        borderRadius: isAdmin ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isAdmin ? C.accent : C.surface,
        border: isAdmin ? 'none' : `1px solid ${C.border}`,
      }}>
        {!isAdmin && (
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 3 }}>Utente</div>
        )}
        <div style={{
          fontSize: 13, color: isAdmin ? '#fff' : C.text,
          lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>
        <div style={{ fontSize: 10, color: isAdmin ? 'rgba(255,255,255,0.6)' : C.hint, marginTop: 3, textAlign: 'right' }}>
          {time}
        </div>
      </div>
    </div>
  )
}

function SupportThread({
  conv,
  adminId,
  onBack,
}: { conv: ConvWithUser; adminId: string | undefined; onBack: () => void }) {
  const { messages, loading, sending, sendReply, closeConversation } = useSupportAdminChat(conv.id, adminId)
  const [text, setText] = useState('')
  const bottomRef       = useRef<HTMLDivElement>(null)
  const textareaRef     = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  const initials = conv.userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Thread header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', borderBottom: `0.5px solid ${C.border}`, flexShrink: 0,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 20, color: C.muted }} />
        </button>
        <Avatar initials={initials} size={32} accent={C.muted} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{conv.userName}</div>
          <div style={{ fontSize: 11, color: conv.status === 'open' ? C.green : C.hint }}>
            {conv.status === 'open' ? 'Aperta' : 'Chiusa'}
          </div>
        </div>
        {conv.status === 'open' && (
          <button
            onClick={async () => { await closeConversation(); onBack() }}
            style={{
              padding: '4px 10px', borderRadius: 8,
              border: `1px solid ${C.borderMed}`, background: 'none',
              color: C.muted, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Chiudi
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-loader-2" style={{ fontSize: 24, color: C.muted, animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 40, color: C.hint, fontSize: 14 }}>
            Nessun messaggio
          </div>
        ) : (
          messages.map(msg => <SupportBubble key={msg.id} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      {conv.status === 'open' && (
        <div style={{
          flexShrink: 0, padding: '8px 12px 16px',
          borderTop: `0.5px solid ${C.border}`,
          display: 'flex', gap: 8, alignItems: 'flex-end',
        }}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Rispondi all'utente…"
            rows={1}
            style={{
              flex: 1, borderRadius: 16,
              border: `1.5px solid ${C.borderMed}`,
              background: C.surface,
              padding: '9px 13px',
              fontSize: 13, color: C.text, fontFamily: 'inherit',
              outline: 'none', resize: 'none', maxHeight: 80, lineHeight: 1.4,
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: text.trim() ? C.accent : C.surface,
              border: 'none', cursor: text.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background .15s',
            }}
          >
            {sending
              ? <i className="ti ti-loader-2" style={{ fontSize: 16, color: '#fff', animation: 'spin 0.8s linear infinite' }} />
              : <i className="ti ti-send" style={{ fontSize: 16, color: text.trim() ? '#fff' : C.hint }} />
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
      <div style={{ padding: '8px 16px 2px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: C.hint }}>
          {loading ? 'Caricamento…' : `${conversations.length} conversazion${conversations.length === 1 ? 'e' : 'i'}`}
        </span>
        <button onClick={reload} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.hint }}>
          <i className="ti ti-refresh" style={{ fontSize: 15 }} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 80px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <i className="ti ti-loader-2" style={{ fontSize: 28, color: C.muted, animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 48, color: C.hint, fontSize: 14 }}>
            Nessuna conversazione
          </div>
        ) : (
          conversations.map(conv => {
            const initials = conv.userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
            const ago = timeAgo(conv.updated_at)
            return (
              <div
                key={conv.id}
                onClick={() => setSelected(conv)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 12px', borderRadius: 12,
                  background: C.surface, marginBottom: 6,
                  cursor: 'pointer',
                  border: `1px solid ${conv.status === 'open' ? C.borderMed : C.border}`,
                }}
              >
                <Avatar initials={initials} size={40} accent={conv.status === 'open' ? C.accent : C.muted} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{conv.userName}</span>
                    {conv.status === 'open' && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: C.green, background: 'rgba(29,158,117,0.12)', padding: '1px 6px', borderRadius: 10 }}>
                        APERTA
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.hint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.lastMessage ?? 'Nessun messaggio'}
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: C.hint }}>{ago}</div>
                  <i className="ti ti-chevron-right" style={{ fontSize: 14, color: C.hint, marginTop: 4, display: 'block' }} />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export function AdminPanel({ userId }: { userId?: string }) {
  const [tab, setTab]   = useState<AdminTab>('users')
  const [toast, setToast] = useState<ToastEvent | null>(null)

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'users',   label: 'Utenti',    icon: 'ti-users'      },
    { id: 'logs',    label: 'Log',       icon: 'ti-terminal-2' },
    { id: 'support', label: 'Supporto',  icon: 'ti-headset'    },
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 0', flexShrink: 0 }}>
        <i className="ti ti-shield-lock" style={{ fontSize: 20, color: C.accent }} />
        <span style={{ fontSize: 20, fontWeight: 500, color: C.text }}>Pannello Admin</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '10px 16px 0', gap: 8, flexShrink: 0 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '6px 16px', borderRadius: 20, border: 'none',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              background: tab === t.id ? C.accent : C.surface,
              color:      tab === t.id ? '#fff'   : C.muted,
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'background .15s, color .15s',
            }}
          >
            <i className={`ti ${t.icon}`} style={{ fontSize: 13 }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginTop: 8, position: 'relative' }}>
        {tab === 'users'   && <UsersTab   onToast={setToast} />}
        {tab === 'logs'    && <LogsTab    onToast={setToast} />}
        {tab === 'support' && <SupportTab adminId={userId}   />}
      </div>

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
