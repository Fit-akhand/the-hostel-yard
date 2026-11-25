import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Phone, Plus } from 'lucide-react'
import { enquiryApi, propertyApi } from '../../services/apis'
import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Select, StatusBadge, TableSkeleton, Tabs, Textarea } from '../../components/ui'
import { Modal } from '../../components/modals/Modal'
import { usePropertyStore } from '../../store/propertyStore'
import { useAuthStore } from '../../store/authStore'
import { can } from '../../config/authz'
import { PERMISSIONS } from '../../config/permissions'
import { toast } from '../../store/toastStore'
import { formatDate, formatDateTime, nameOf, toInputDate } from '../../utils/format'
import { asArray } from '../../utils/collections'
import { todayIndia } from '../../utils/dates'

const STATUS = { NEW: 'New', CONTACTED: 'Contacted', VISIT_SCHEDULED: 'Visit planned', CONVERTED: 'Joined', LOST: 'Not joining' }
const SHARING = { SINGLE: 'Single', DOUBLE: 'Double', TRIPLE: 'Triple', DORMITORY: 'Dormitory', ANY: 'Any' }
const SOURCES = { WALK_IN: 'Walk-in', PHONE: 'Phone call', WHATSAPP: 'WhatsApp', REFERRAL: 'Referral', WEBSITE: 'Public page', OTHER: 'Other' }

const blank = (propertyId) => ({ propertyId, name: '', phone: '', gender: '', sharing: '', moveInDate: '', source: 'PHONE', message: '' })

function AddModal({ open, onClose, properties, defaultProperty, onDone }) {
  const [form, setForm] = useState(() => blank(defaultProperty))
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const create = useMutation({
    mutationFn: () => enquiryApi.create({ ...form, propertyId: form.propertyId || defaultProperty || properties[0]?._id, gender: form.gender || null, sharing: form.sharing || null, moveInDate: form.moveInDate || null }),
    onSuccess: () => { toast.success('Enquiry added.'); setForm(blank(defaultProperty)); onDone(); onClose() },
    onError: (e) => toast.error(e.errors?.[0]?.message || e.message),
  })

  return (
    <Modal open={open} wide title="Add an enquiry" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="add-enquiry" loading={create.isPending}>Add</Button></>}>
      <form id="add-enquiry" className="grid gap-4" onSubmit={(e) => { e.preventDefault(); create.mutate() }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required><Input value={form.name} onChange={set('name')} required minLength={2} maxLength={100} /></Field>
          <Field label="Mobile number" required><Input type="tel" value={form.phone} onChange={set('phone')} required maxLength={16} /></Field>
          <Field label="Property" required>
            <Select value={form.propertyId || defaultProperty || properties[0]?._id || ''} onChange={set('propertyId')}>
              {properties.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="How did they reach you?"><Select value={form.source} onChange={set('source')}>{Object.entries(SOURCES).filter(([k]) => k !== 'WEBSITE').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field label="Sharing wanted"><Select value={form.sharing} onChange={set('sharing')}><option value="">—</option>{Object.entries(SHARING).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field label="Wants to move in on"><Input type="date" value={form.moveInDate} onChange={set('moveInDate')} /></Field>
          <Field label="Gender"><Select value={form.gender} onChange={set('gender')}><option value="">—</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></Select></Field>
        </div>
        <Field label="What they asked"><Textarea rows={2} value={form.message} onChange={set('message')} maxLength={1000} /></Field>
      </form>
    </Modal>
  )
}

function DetailModal({ id, onClose, onDone, editable }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ['enquiry', id], queryFn: () => enquiryApi.get(id), enabled: Boolean(id) })
  const [note, setNote] = useState('')
  const update = useMutation({
    mutationFn: (body) => enquiryApi.update(id, body),
    onSuccess: (data) => { qc.setQueryData(['enquiry', id], data); setNote(''); onDone(); toast.success('Saved.') },
    onError: (e) => toast.error(e.errors?.[0]?.message || e.message),
  })
  const e = query.data
  const digits = String(e?.phone || '').replace(/\D/g, '')
  const convert = () => {
    const params = new URLSearchParams({ enquiryId: e._id, name: e.name, phone: digits.slice(-10), propertyId: e.property?._id || '' })
    if (e.gender) params.set('gender', e.gender)
    if (e.email) params.set('email', e.email)
    navigate(`/tenants/new?${params}`)
  }

  return (
    <Modal open={Boolean(id)} wide title={e?.name || 'Enquiry'} onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      {query.isError ? <p className="text-sm text-danger">{query.error.message}</p> : null}
      {e ? (
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-600">{nameOf(e.property)} · {SOURCES[e.source]} · {formatDateTime(e.createdAt)}</p>
            <StatusBadge status={e.status} />
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`tel:${e.phone}`}><Button size="sm" variant="secondary"><Phone size={15} /> {e.phone}</Button></a>
            <a href={`https://wa.me/${digits}?text=${encodeURIComponent(`Hi ${e.name}, thank you for asking about ${nameOf(e.property)}.`)}`} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary"><MessageCircle size={15} /> WhatsApp</Button></a>
            {editable && e.status !== 'CONVERTED' ? <Button size="sm" onClick={convert}>Add as tenant</Button> : null}
            {e.tenant ? <Link to={`/tenants/${e.tenant._id}`} className="self-center text-sm text-brand hover:underline">Open tenant: {e.tenant.name}</Link> : null}
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-ink-500">Sharing</dt><dd>{SHARING[e.sharing] || '—'}</dd></div>
            <div><dt className="text-ink-500">Move in</dt><dd>{e.moveInDate ? formatDate(e.moveInDate) : '—'}</dd></div>
            {e.message ? <div className="sm:col-span-2"><dt className="text-ink-500">Message</dt><dd>{e.message}</dd></div> : null}
          </dl>
          {editable ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Status">
                <Select value={e.status} onChange={(ev) => update.mutate({ status: ev.target.value })}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
              </Field>
              <Field label="Visit on"><Input type="date" value={e.visitOn ? toInputDate(e.visitOn) : ''} onChange={(ev) => update.mutate({ visitOn: ev.target.value || null })} /></Field>
              <Field label="Call again on"><Input type="date" value={e.followUpOn ? toInputDate(e.followUpOn) : ''} onChange={(ev) => update.mutate({ followUpOn: ev.target.value || null })} /></Field>
            </div>
          ) : null}
          <div className="grid gap-2">
            <h3 className="font-semibold text-ink-950">Notes</h3>
            {e.notes.map((n) => <p key={n._id} className="rounded-lg bg-ink-50 p-3 text-sm">{n.text}<span className="mt-1 block text-xs text-ink-500">{n.byName || 'Note'} · {formatDateTime(n.at)}</span></p>)}
            {!e.notes.length ? <p className="text-sm text-ink-500">No notes yet.</p> : null}
            {editable ? (
              <form className="flex gap-2" onSubmit={(ev) => { ev.preventDefault(); if (note.trim()) update.mutate({ note: note.trim() }) }}>
                <Input value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Add a note" maxLength={1000} />
                <Button type="submit" variant="secondary" loading={update.isPending} disabled={!note.trim()}>Add</Button>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </Modal>
  )
}

export function EnquiryPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const currentPropertyId = usePropertyStore((s) => s.currentPropertyId)
  const [tab, setTab] = useState('OPEN')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [openId, setOpenId] = useState(null)
  const properties = useQuery({ queryKey: ['properties'], queryFn: propertyApi.list, retry: false })
  const params = { status: tab, ...(currentPropertyId ? { propertyId: currentPropertyId } : {}), ...(search.trim() ? { search: search.trim() } : {}) }
  const query = useQuery({ queryKey: ['enquiries', params], queryFn: () => enquiryApi.list(params), placeholderData: (previous) => previous })
  const refresh = () => qc.invalidateQueries({ queryKey: ['enquiries'] })
  const editable = can(user, PERMISSIONS.MANAGE_BOOKINGS)
  const counts = query.data?.counts || {}
  const openCount = (counts.NEW || 0) + (counts.CONTACTED || 0) + (counts.VISIT_SCHEDULED || 0)
  const rows = asArray(query.data?.enquiries)
  const today = todayIndia()

  return (
    <div>
      <PageHeader
        title="Enquiries"
        description="People asking about a bed, from your public page, calls and visits."
        actions={editable ? <Button onClick={() => setAddOpen(true)}><Plus size={16} /> Add enquiry</Button> : null}
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'OPEN', label: `Open (${openCount})` },
          ...Object.entries(STATUS).map(([id, label]) => ({ id, label: `${label} (${counts[id] || 0})` })),
          { id: 'ALL', label: 'All' },
        ]}
      />
      <div className="mt-4 max-w-sm"><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone" aria-label="Search enquiries" /></div>
      <div className="mt-4 grid gap-3">
        {query.isLoading ? <TableSkeleton rows={3} /> : null}
        {query.isError ? <ErrorState message={query.error.message} onRetry={query.refetch} /> : null}
        {rows.map((e) => {
          const due = e.followUpOn && toInputDate(e.followUpOn) <= today && !['CONVERTED', 'LOST'].includes(e.status)
          return (
            <button key={e._id} type="button" className="text-left" onClick={() => setOpenId(e._id)}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-brand">
                <div>
                  <p className="font-semibold text-ink-950">{e.name} <span className="font-normal text-ink-600">· {e.phone}</span></p>
                  <p className="text-sm text-ink-600">{nameOf(e.property)}{e.sharing ? ` · ${SHARING[e.sharing]} sharing` : ''}{e.moveInDate ? ` · from ${formatDate(e.moveInDate)}` : ''} · {SOURCES[e.source]} · {formatDate(e.createdAt)}</p>
                  {due ? <p className="text-xs font-semibold text-warning">Call again today</p> : null}
                </div>
                <StatusBadge status={e.status} />
              </Card>
            </button>
          )
        })}
        {query.data && !rows.length ? <EmptyState title="No enquiries here" description="Publish your public page so people can send enquiries." /> : null}
      </div>
      <AddModal open={addOpen} onClose={() => setAddOpen(false)} properties={asArray(properties.data)} defaultProperty={currentPropertyId} onDone={refresh} />
      <DetailModal key={openId || 'none'} id={openId} onClose={() => setOpenId(null)} onDone={refresh} editable={editable} />
    </div>
  )
}
