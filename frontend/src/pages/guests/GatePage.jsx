import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Printer, QrCode, UserPlus } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { guestPassApi, propertyApi, tenantApi } from '../../services/apis'
import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Select, StatCard, StatusBadge, TableSkeleton, Tabs } from '../../components/ui'
import { Modal } from '../../components/modals/Modal'
import { emptyVisit, VisitFields } from '../../components/guests/VisitFields'
import { useAuthStore } from '../../store/authStore'
import { usePropertyStore } from '../../store/propertyStore'
import { ROLES } from '../../config/permissions'
import { toast } from '../../store/toastStore'
import { formatDate, formatDateTime, nameOf } from '../../utils/format'
import { asArray } from '../../utils/collections'
import { printArea } from '../../utils/print'

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'inside', label: 'Inside now' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'history', label: 'History' },
]

function PassCard({ pass, today, onAction, busy }) {
  const canCheckIn = pass.status === 'APPROVED' && pass.visitDate === today
  return (
    <Card className="grid gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink-950">{pass.visitorName}{pass.guests > 1 ? ` + ${pass.guests - 1}` : ''}{pass.relation ? <span className="font-normal text-ink-600"> · {pass.relation}</span> : null}</p>
          <p className="text-sm text-ink-600">{pass.visitorPhone} · visiting <strong className="text-ink-900">{nameOf(pass.tenant)}</strong> · {nameOf(pass.property)}</p>
          <p className="text-sm text-ink-600">
            {formatDate(pass.visitDate)}{pass.expectedTime ? `, ${pass.expectedTime}` : ''}
            {pass.checkedInAt ? ` · in ${formatDateTime(pass.checkedInAt)}` : ''}
            {pass.checkedOutAt ? ` · out ${formatDateTime(pass.checkedOutAt)}` : ''}
          </p>
          {pass.purpose ? <p className="text-sm text-ink-500">{pass.purpose}</p> : null}
        </div>
        <div className="text-right">
          <StatusBadge status={pass.status} />
          {pass.code && ['APPROVED', 'CHECKED_IN'].includes(pass.status) ? <p className="tabular mt-1 font-mono text-lg font-bold tracking-widest text-ink-950">{pass.code}</p> : null}
        </div>
      </div>
      {['PENDING', 'APPROVED', 'CHECKED_IN'].includes(pass.status) ? (
        <div className="flex flex-wrap items-center gap-2">
          {canCheckIn ? <Button size="sm" disabled={busy} onClick={() => onAction('checkIn', pass._id)}>Check in</Button> : null}
          {pass.status === 'CHECKED_IN' ? <Button size="sm" disabled={busy} onClick={() => onAction('checkOut', pass._id)}>Check out</Button> : null}
          {pass.status === 'PENDING' ? <span className="text-xs text-warning">Waiting for the resident to approve</span> : null}
          {['PENDING', 'APPROVED'].includes(pass.status) ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction('cancel', pass._id)}>Turn away</Button> : null}
        </div>
      ) : null}
    </Card>
  )
}

function GateQrModal({ open, onClose, properties, initial }) {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [chosen, setChosen] = useState('')
  const propertyId = chosen || initial || properties[0]?._id || ''
  const gate = useQuery({ queryKey: ['gate-link', propertyId], queryFn: () => guestPassApi.gate(propertyId), enabled: open && Boolean(propertyId) })
  const reset = useMutation({
    mutationFn: () => guestPassApi.resetGate(propertyId),
    onSuccess: (data) => { qc.setQueryData(['gate-link', propertyId], data); toast.success('New QR code created. Print it again.') },
    onError: (e) => toast.error(e.message),
  })
  const link = gate.data ? `${window.location.origin}/visit/${gate.data.code}` : ''
  const isLocal = /\/\/(localhost|127\.0\.0\.1)/.test(link)

  return (
    <Modal open={open} title="Gate QR code" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Close</Button><Button disabled={!gate.data} onClick={printArea}><Printer size={16} /> Print</Button></>}>
      <div className="grid gap-4">
        <Field label="Property">
          <Select value={propertyId} onChange={(e) => setChosen(e.target.value)}>
            {properties.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </Select>
        </Field>
        {gate.isError ? <p className="text-sm text-danger">{gate.error.message}</p> : null}
        {gate.data ? (
          <>
            <div className="print-area mx-auto w-full max-w-xs rounded-2xl bg-white p-6 text-center text-slate-900">
              <p className="text-lg font-bold">{gate.data.propertyName}</p>
              <p className="mb-4 text-sm">Visitors: scan to get a guest pass</p>
              <div className="flex justify-center"><QRCodeSVG value={link} size={200} /></div>
              <p className="mt-3 text-xs">The resident you are visiting approves your request.</p>
            </div>
            <p className="break-all text-center text-xs text-ink-600">{link}</p>
            {isLocal ? <p className="text-xs text-warning">This is a localhost address, so phones cannot open it. Print the QR from your live website.</p> : null}
            {user?.role === ROLES.BUSINESS_OWNER ? (
              <button type="button" className="mx-auto text-xs text-ink-600 underline hover:text-ink-950" onClick={() => { if (window.confirm('Create a new QR code? Printed copies of the old one will stop working.')) reset.mutate() }}>Replace this QR code</button>
            ) : null}
          </>
        ) : null}
      </div>
    </Modal>
  )
}

// For a visitor without a smartphone: the guard enters their details and the resident is asked as usual.
function AddVisitorModal({ open, onClose, propertyId, onDone }) {
  const [search, setSearch] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [visit, setVisit] = useState(emptyVisit)
  const tenants = useQuery({ queryKey: ['tenants', 'gate', propertyId], queryFn: () => tenantApi.list(propertyId ? { propertyId } : undefined), enabled: open })
  const matches = asArray(tenants.data)
    .filter((t) => `${t.name} ${t.phone}`.toLowerCase().includes(search.trim().toLowerCase()))
    .slice(0, 50)
  const create = useMutation({
    mutationFn: () => guestPassApi.createAtGate({ ...visit, tenantId }),
    onSuccess: (data) => {
      if (data.reachable) toast.success('Request sent to the resident.')
      else toast.warning('Saved, but this resident has no real phone number or app account, so they cannot be asked.')
      setVisit(emptyVisit()); setTenantId(''); setSearch(''); onDone(); onClose()
    },
    onError: (e) => toast.error(e.errors?.[0]?.message || e.message),
  })

  return (
    <Modal open={open} wide title="Add a visitor" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="gate-visitor" loading={create.isPending}>Ask the resident</Button></>}>
      <form id="gate-visitor" className="grid gap-4" onSubmit={(e) => { e.preventDefault(); if (!tenantId) { toast.error('Choose the resident.'); return } create.mutate() }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Find the resident"><Input value={search} onChange={(e) => { setSearch(e.target.value); setTenantId('') }} placeholder="Name or phone" /></Field>
          <Field label="Resident" required>
            <Select value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
              <option value="">{tenants.isLoading ? 'Loading…' : `Choose (${matches.length})`}</option>
              {matches.map((t) => <option key={t._id} value={t._id}>{t.name} · {nameOf(t.property)}</option>)}
            </Select>
          </Field>
        </div>
        <VisitFields value={visit} onChange={setVisit} />
      </form>
    </Modal>
  )
}

export function GatePage() {
  const qc = useQueryClient()
  const currentPropertyId = usePropertyStore((s) => s.currentPropertyId)
  const [tab, setTab] = useState('today')
  const [code, setCode] = useState('')
  const [found, setFound] = useState(null)
  const [qrOpen, setQrOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const properties = useQuery({ queryKey: ['properties'], queryFn: propertyApi.list, retry: false })
  const params = { view: tab, ...(currentPropertyId ? { propertyId: currentPropertyId } : {}) }
  const query = useQuery({ queryKey: ['guest-passes', params], queryFn: () => guestPassApi.list(params), refetchInterval: 20000 })
  const refresh = () => qc.invalidateQueries({ queryKey: ['guest-passes'] })

  const verify = useMutation({
    mutationFn: () => guestPassApi.verify(code),
    onSuccess: setFound,
    onError: (e) => { setFound(null); toast.error(e.errors?.[0]?.message || e.message) },
  })
  const action = useMutation({
    mutationFn: ({ name, id }) => guestPassApi[name](id),
    onSuccess: (pass) => { if (found?._id === pass._id) setFound(pass); toast.success(pass.status === 'CHECKED_IN' ? 'Checked in.' : pass.status === 'CHECKED_OUT' ? 'Checked out.' : 'Pass cancelled.'); refresh() },
    onError: (e) => { toast.error(e.message); refresh() },
  })
  const act = (name, id) => action.mutate({ name, id })

  const counts = query.data?.counts || {}
  const passes = asArray(query.data?.passes)

  return (
    <div>
      <PageHeader
        title="Guest passes"
        description="Residents approve their guests. Check the code at the gate."
        actions={
          <>
            <Button variant="secondary" onClick={() => setQrOpen(true)}><QrCode size={16} /> Gate QR</Button>
            <Button onClick={() => setAddOpen(true)}><UserPlus size={16} /> Add visitor</Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Inside now" value={counts.inside ?? '—'} />
        <StatCard label="Expected today" value={counts.expected ?? '—'} hint="Approved, not yet arrived" />
        <StatCard label="Waiting for approval" value={counts.waiting ?? '—'} />
      </div>

      <Card className="mt-5 grid gap-3 p-5">
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); verify.mutate() }}>
          <Field label="Check a gate code">
            <Input value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setFound(null) }} inputMode="numeric" placeholder="6 digits" className="w-44 font-mono tracking-widest" />
          </Field>
          <Button type="submit" disabled={code.length !== 6} loading={verify.isPending}>Check</Button>
        </form>
        {found ? <PassCard pass={found} today={query.data?.today} onAction={act} busy={action.isPending} /> : null}
      </Card>

      <div className="mt-6">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        <div className="mt-4 grid gap-3">
          {query.isLoading ? <TableSkeleton rows={3} /> : null}
          {query.isError ? <ErrorState message={query.error.message} onRetry={query.refetch} /> : null}
          {passes.map((p) => <PassCard key={p._id} pass={p} today={query.data.today} onAction={act} busy={action.isPending} />)}
          {query.data && !passes.length ? <EmptyState title="Nothing here" description="Visitors scan the gate QR code, or use “Add visitor”." /> : null}
        </div>
      </div>

      <GateQrModal open={qrOpen} onClose={() => setQrOpen(false)} properties={asArray(properties.data)} initial={currentPropertyId} />
      <AddVisitorModal open={addOpen} onClose={() => setAddOpen(false)} propertyId={currentPropertyId} onDone={refresh} />
    </div>
  )
}
