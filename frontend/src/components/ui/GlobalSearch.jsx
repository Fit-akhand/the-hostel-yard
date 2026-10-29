import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, BedDouble, CornerDownLeft, FileText, Search, Users } from 'lucide-react'
import { propertyApi, roomApi, tenantApi } from '../../services/apis'
import { asArray } from '../../utils/collections'
import { NAV_GROUPS } from '../../config/navigation'
import { canAccessNavItem } from '../../config/authz'
import { useAuthStore } from '../../store/authStore'
import { usePropertyStore } from '../../store/propertyStore'
import { cx } from '../../utils/format'

const ICONS = { Tenants: Users, Rooms: BedDouble, Properties: Building2, Pages: FileText }
const norm = (v) => String(v ?? '').toLowerCase()

export function GlobalSearch() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const currentPropertyId = usePropertyStore((s) => s.currentPropertyId)
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const box = useRef(null)
  const input = useRef(null)

  // Data is only fetched once the user starts searching, then cached.
  const enabled = open
  const tenants = useQuery({ queryKey: ['tenants', {}], queryFn: () => tenantApi.list(), enabled, staleTime: 60_000 })
  const properties = useQuery({ queryKey: ['properties'], queryFn: propertyApi.list, enabled, staleTime: 60_000 })
  const rooms = useQuery({
    queryKey: ['rooms', { propertyId: currentPropertyId }],
    queryFn: () => roomApi.list(currentPropertyId ? { propertyId: currentPropertyId } : {}),
    enabled,
    staleTime: 60_000,
  })

  const groups = useMemo(() => {
    const q = norm(value).trim()
    if (q.length < 1) return []
    const has = (...fields) => fields.some((f) => norm(f).includes(q))
    const pages = NAV_GROUPS.flatMap((g) => g.items)
      .filter((i) => canAccessNavItem(user, i))
      .filter((i) => has(i.label))
      .map((i) => ({ id: i.to, title: i.label, to: i.to }))
    const out = [
      {
        label: 'Tenants',
        items: asArray(tenants.data)
          .filter((t) => has(t.name, t.phone, t.email))
          .slice(0, 6)
          .map((t) => ({ id: t._id, title: t.name, hint: t.phone, to: `/tenants/${t._id}` })),
      },
      {
        label: 'Rooms',
        items: asArray(rooms.data)
          .filter((r) => has(r.roomNumber, `room ${r.roomNumber}`))
          .slice(0, 5)
          .map((r) => ({ id: r._id, title: `Room ${r.roomNumber}`, hint: `Floor ${r.floor}`, to: `/rooms/${r._id}` })),
      },
      {
        label: 'Properties',
        items: asArray(properties.data)
          .filter((p) => has(p.name, p.city))
          .slice(0, 4)
          .map((p) => ({ id: p._id, title: p.name, hint: p.city, to: `/properties/${p._id}` })),
      },
      { label: 'Pages', items: pages.slice(0, 4) },
    ]
    return out.filter((g) => g.items.length)
  }, [value, tenants.data, rooms.data, properties.data, user])

  const flat = groups.flatMap((g) => g.items)
  const loading = enabled && value && (tenants.isLoading || rooms.isLoading)

  useEffect(() => setActive(0), [value])
  useEffect(() => {
    const onDoc = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.current?.focus() }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [])

  const go = (item) => {
    if (!item) return
    setOpen(false)
    setValue('')
    input.current?.blur()
    navigate(item.to)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); go(flat[active]) }
    else if (e.key === 'Escape') { setOpen(false); input.current?.blur() }
  }

  let index = -1
  return (
    <div ref={box} className="relative hidden min-w-0 flex-1 md:block">
      <Search size={17} strokeWidth={1.8} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
      <input
        ref={input}
        value={value}
        onChange={(e) => { setValue(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="h-10 w-full max-w-xl rounded-xl border border-line bg-ink-50 pl-10 pr-14 text-sm text-ink-950 outline-none transition-all duration-150 placeholder:text-ink-400 focus:bg-card focus:ring-4 focus:ring-brand/10"
        placeholder="Search tenants, rooms, properties, pages…"
        aria-label="Search"
        autoComplete="off"
      />
      {open && value.trim() ? (
        <div className="glass-strong absolute left-0 top-12 z-40 w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-paper/90 shadow-[0_24px_60px_rgba(15,23,42,.25)]">
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {groups.map((g) => {
              const Icon = ICONS[g.label] || FileText
              return (
                <div key={g.label} className="mb-1">
                  <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">{g.label}</p>
                  {g.items.map((item) => {
                    index += 1
                    const i = index
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(item)}
                        className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition', i === active ? 'bg-brand-soft text-ink-950' : 'text-ink-800 hover:bg-ink-50')}
                      >
                        <Icon size={16} className="shrink-0 text-ink-400" />
                        <span className="min-w-0 flex-1 truncate font-medium">{item.title}</span>
                        {item.hint ? <span className="shrink-0 text-xs text-ink-400">{item.hint}</span> : null}
                        {i === active ? <CornerDownLeft size={14} className="shrink-0 text-ink-400" /> : null}
                      </button>
                    )
                  })}
                </div>
              )
            })}
            {!groups.length ? (
              <p className="px-4 py-8 text-center text-sm text-ink-400">{loading ? 'Searching…' : `No results for “${value}”`}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
