import { useState } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { Toast } from '../components/Toast'
import { useAdminUsers, type AdminUser } from '../hooks/useAdminUsers'
import { useAdminLogs } from '../hooks/useAdminLogs'
import type { UserRole, LogLevel } from '../types/supabase'

type AdminTab  = 'users' | 'logs'
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

function UsersTab({ onToast }: { onToast: (msg: string) => void }) {
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
    if (error) onToast('Errore: ' + error)
    else onToast(`${user.display_name} eliminato`)
  }

  async function handleRolePick(user: AdminUser, role: UserRole) {
    setRoleTarget(null)
    if (role === user.role) return
    setBusy(user.id)
    const { error } = await changeRole(user.id, role)
    setBusy(null)
    if (error) onToast('Errore: ' + error)
    else onToast(`Ruolo aggiornato`)
  }

  async function handleReset(user: AdminUser) {
    setExpanded(null)
    setBusy(user.id)
    const { error } = await sendPasswordReset(user.email)
    setBusy(null)
    if (error) onToast('Errore: ' + error)
    else onToast(`Email di reset inviata a ${user.email}`)
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
            if (!result.error) onToast(`${name} creato`)
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

function LogsTab({ onToast }: { onToast: (msg: string) => void }) {
  const { logs, loading, error, clearLogs, reload } = useAdminLogs()
  const [filter, setFilter] = useState<LogFilter>('all')
  const [clearing, setClearing] = useState(false)

  const filtered = filter === 'all' ? logs : logs.filter(l => l.level === filter)

  const filters: { id: LogFilter; label: string; color: string }[] = [
    { id: 'all',     label: 'Tutti',    color: C.muted  },
    { id: 'info',    label: 'Info',     color: C.green  },
    { id: 'warning', label: 'Warning',  color: '#F59E0B' },
    { id: 'error',   label: 'Errore',   color: C.red    },
  ]

  async function handleClear() {
    setClearing(true)
    const { error: e } = await clearLogs()
    setClearing(false)
    if (e) onToast('Errore: ' + e)
    else onToast('Log cancellati')
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
        <button onClick={handleClear} disabled={clearing || logs.length === 0} style={{
          padding: '5px 10px', borderRadius: 8, border: `1px solid ${C.borderMed}`,
          background: 'none', color: clearing ? C.hint : C.red,
          fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {clearing
            ? <i className="ti ti-loader-2" style={{ fontSize: 12, animation: 'spin 0.8s linear infinite' }} />
            : <i className="ti ti-trash" style={{ fontSize: 12 }} />}
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

// ── Main ───────────────────────────────────────────────────────────────────

export function AdminPanel() {
  const [tab, setTab]   = useState<AdminTab>('users')
  const [toast, setToast] = useState<string | null>(null)

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'users', label: 'Utenti',      icon: 'ti-users'     },
    { id: 'logs',  label: 'Log & Errori', icon: 'ti-terminal-2' },
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
        {tab === 'users'
          ? <UsersTab onToast={setToast} />
          : <LogsTab  onToast={setToast} />
        }
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
