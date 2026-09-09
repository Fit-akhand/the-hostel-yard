import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  allocationApi,
  bedApi,
  complaintApi,
  paymentApi,
  propertyApi,
  rentApi,
  roomApi,
  tenantApi,
} from '../../services/apis'
import { Button, Card, Field, Input, PageHeader, Select, StatusBadge, Tabs, Textarea } from '../../components/ui'
import { DataTable } from '../../components/tables/DataTable'
import { ConfirmDialog, Modal } from '../../components/modals/Modal'
import { toast } from '../../store/toastStore'
import { fieldErrors } from '../../services/apiClient'
import { formatDate, formatINR, nameOf, toInputDate } from '../../utils/format'
import { asArray } from '../../utils/collections'
import { usePropertyStore } from '../../store/propertyStore'
import { can } from '../../config/authz'
import { PERMISSIONS } from '../../config/permissions'
import { useAuthStore } from '../../store/authStore'

export function TenantListPage() {
  const user = useAuthStore((s) => s.user)
  const propertyId = usePropertyStore((s) => s.currentPropertyId)
  const [status, setStatus] = useState('ACTIVE')
  const [search, setSearch] = useState('')
  const tenants = useQuery({
    queryKey: ['tenants', { propertyId, status }],
    queryFn: () => tenantApi.list({ status, ...(propertyId ? { propertyId } : {}) }),
  })
  const rows = asArray(tenants.data).filter((t) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [t.name, t.phone, t.email].join(' ').toLowerCase().includes(q)
  })
  return (
    <div>
      <PageHeader
        title="Tenants"
        actions={
          can(user, PERMISSIONS.ADD_TENANTS) ? (
            <Link to="/tenants/new">
              <Button>Add tenant</Button>
            </Link>
          ) : null
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Input placeholder="Search tenant…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          {['ACTIVE', 'NOTICE_PERIOD', 'LEFT', 'ALL'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </div>
      <DataTable
        loading={tenants.isLoading}
        error={tenants.error}
        onRetry={() => tenants.refetch()}
        rows={rows}
        rowTo={(t) => `/tenants/${t._id}`}
        emptyTitle="No tenants yet"
        emptyDescription="Add your first tenant to start managing occupancy."
        emptyAction={
          <Link to="/tenants/new">
            <Button>Add tenant</Button>
          </Link>
        }
        columns={[
          { key: 'name', header: 'Name', render: (t) => <span className="font-medium">{t.name}</span> },
          { key: 'phone', header: 'Phone' },
          { key: 'property', header: 'Property', render: (t) => nameOf(t.property) },
          { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
          { key: 'moveInDate', header: 'Move-in', render: (t) => formatDate(t.moveInDate) },
        ]}
      />
    </div>
  )
}

export function TenantFormPage({ mode }) {
  const { tenantId } = useParams()
  const navigate = useNavigate()
  const properties = useQuery({ queryKey: ['properties'], queryFn: propertyApi.list })
  const existing = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => tenantApi.get(tenantId),
    enabled: mode === 'edit',
  })
  const [form, setForm] = useState({
    propertyId: '',
    name: '',
    phone: '',
    email: '',
    gender: 'MALE',
    address: '',
    moveInDate: toInputDate(new Date()),
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelationship: '',
  })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  useEffect(() => {
    if (existing.data) {
      const t = existing.data
      setForm({
        propertyId: t.property?._id || t.property || '',
        name: t.name || '',
        phone: t.phone || '',
        email: t.email || '',
        gender: t.gender || 'MALE',
        address: t.address || '',
        moveInDate: toInputDate(t.moveInDate),
        emergencyName: t.emergencyContact?.name || '',
        emergencyPhone: t.emergencyContact?.phone || '',
        emergencyRelationship: t.emergencyContact?.relationship || '',
      })
    }
  }, [existing.data])

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        phone: form.phone,
        email: form.email || '',
        gender: form.gender,
        address: form.address || undefined,
        moveInDate: form.moveInDate,
        emergencyContact: {
          name: form.emergencyName || undefined,
          phone: form.emergencyPhone || undefined,
          relationship: form.emergencyRelationship || undefined,
        },
      }
      if (mode === 'create') body.propertyId = form.propertyId
      return mode === 'edit' ? tenantApi.update(tenantId, body) : tenantApi.create(body)
    },
    onSuccess: (tenant) => {
      toast.success(mode === 'edit' ? 'Tenant updated successfully.' : 'Tenant created successfully.')
      navigate(`/tenants/${tenant._id || tenantId}`)
    },
    onError: (err) => {
      setErrors(fieldErrors(err))
      setError(err.message)
    },
  })

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={mode === 'edit' ? 'Edit tenant' : 'Create tenant'} />
      <Card className="p-6">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          {mode === 'create' ? (
            <Field label="Property" required error={errors.propertyId}>
              <Select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
                <option value="">Select</option>
                {asArray(properties.data).map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="Name" required error={errors.name}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" required error={errors.phone}>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Email" error={errors.email}>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
          </div>
          <Field label="Gender">
            <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              {['MALE', 'FEMALE', 'OTHER'].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </Select>
          </Field>
          <Field label="Address">
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Field label="Move-in date" required>
            <Input type="date" value={form.moveInDate} onChange={(e) => setForm({ ...form, moveInDate: e.target.value })} />
          </Field>
          <p className="text-xs uppercase tracking-[0.14em] text-ink-400">Emergency contact</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name">
              <Input value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />
            </Field>
            <Field label="Relationship">
              <Input value={form.emergencyRelationship} onChange={(e) => setForm({ ...form, emergencyRelationship: e.target.value })} />
            </Field>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" loading={mutation.isPending}>
            Save
          </Button>
        </form>
      </Card>
    </div>
  )
}

export function TenantDetailPage() {
  const { tenantId } = useParams()
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [tab, setTab] = useState('overview')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [noticeDate, setNoticeDate] = useState('')
  const [moveDate, setMoveDate] = useState(toInputDate(new Date()))
  const tenant = useQuery({ queryKey: ['tenant', tenantId], queryFn: () => tenantApi.get(tenantId) })
  const allocations = useQuery({ queryKey: ['allocations'], queryFn: () => allocationApi.list() })
  const dues = useQuery({ queryKey: ['rent-dues', tenantId], queryFn: () => rentApi.dues({ tenantId }) })
  const payments = useQuery({
    queryKey: ['payments', { tenantId }],
    queryFn: () => paymentApi.list({ tenantId }),
  })
  const complaints = useQuery({
    queryKey: ['complaints', { tenantId }],
    queryFn: () => complaintApi.list({ tenantId }),
  })
  const t = tenant.data
  const stay = asArray(allocations.data).filter((a) => (a.tenant?._id || a.tenant) === tenantId)
  const active = stay.find((a) => a.status === 'ACTIVE')

  const invite = useMutation({
    mutationFn: () => tenantApi.invite(tenantId),
    onSuccess: (link) => {
      setInviteLink(typeof link === 'string' ? link : link?.invitationLink || JSON.stringify(link))
      toast.success('Invitation created.')
    },
    onError: (e) => toast.error(e.message),
  })
  const notice = useMutation({
    mutationFn: () => tenantApi.notice(tenantId, { expectedMoveOutDate: noticeDate }),
    onSuccess: () => {
      toast.success('Notice period started.')
      setNoticeOpen(false)
      qc.invalidateQueries({ queryKey: ['tenant', tenantId] })
    },
    onError: (e) => toast.error(e.message),
  })
  const moveOut = useMutation({
    mutationFn: () => tenantApi.moveOut(tenantId, { actualMoveOutDate: moveDate }),
    onSuccess: () => {
      toast.success('Tenant moved out.')
      setMoveOpen(false)
      qc.invalidateQueries({ queryKey: ['tenant', tenantId] })
    },
    onError: (e) => toast.error(e.message),
  })

  if (tenant.isError) return <p className="text-danger">{tenant.error.message}</p>

  return (
    <div>
      <PageHeader
        title={t?.name || 'Tenant'}
        description={t ? `${nameOf(t.property)} · ${t.phone}` : ''}
        actions={
          <>
            {can(user, PERMISSIONS.EDIT_TENANTS) ? (
              <Link to={`/tenants/${tenantId}/edit`}>
                <Button variant="secondary">Edit</Button>
              </Link>
            ) : null}
            <Button variant="secondary" onClick={() => { setInviteOpen(true); setInviteLink('') }}>
              Invite
            </Button>
            {t?.status === 'ACTIVE' ? (
              <Button variant="secondary" onClick={() => setNoticeOpen(true)}>
                Start notice
              </Button>
            ) : null}
            {t?.status !== 'LEFT' ? (
              <Button variant="danger" onClick={() => setMoveOpen(true)}>
                Move out
              </Button>
            ) : null}
          </>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge status={t?.status} />
        {active ? (
          <span className="text-sm text-ink-600">
            Room {active.room?.roomNumber} · Bed {active.bed?.bedNumber}
          </span>
        ) : null}
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'stay', label: 'Stay' },
          { id: 'rent', label: 'Rent' },
          { id: 'payments', label: 'Payments' },
          { id: 'complaints', label: 'Complaints' },
        ]}
      />
      <div className="mt-5">
        {tab === 'overview' ? (
          <Card className="grid gap-4 p-6 sm:grid-cols-2">
            <Info label="Email" value={t?.email || '—'} />
            <Info label="Gender" value={t?.gender} />
            <Info label="Move-in" value={formatDate(t?.moveInDate)} />
            <Info label="Notice date" value={formatDate(t?.noticeDate)} />
            <Info label="Expected move-out" value={formatDate(t?.expectedMoveOutDate)} />
            <Info label="Actual move-out" value={formatDate(t?.actualMoveOutDate)} />
            <Info label="Emergency" value={t?.emergencyContact?.name || '—'} />
            <Info label="Emergency phone" value={t?.emergencyContact?.phone || '—'} />
            <Info label="Address" value={t?.address || '—'} />
            <Info label="Account" value={t?.user ? 'Linked' : 'Not invited / not linked'} />
          </Card>
        ) : null}
        {tab === 'stay' ? (
          <DataTable
            rows={stay}
            rowTo={(a) => `/allocations/${a._id}`}
            emptyTitle="No allocations"
            columns={[
              { key: 'room', header: 'Room', render: (a) => a.room?.roomNumber },
              { key: 'bed', header: 'Bed', render: (a) => a.bed?.bedNumber },
              { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
              { key: 'startDate', header: 'Start', render: (a) => formatDate(a.startDate) },
              { key: 'endDate', header: 'End', render: (a) => formatDate(a.endDate) },
            ]}
          />
        ) : null}
        {tab === 'rent' ? (
          <DataTable
            rows={dues.data || []}
            emptyTitle="No rent dues"
            columns={[
              { key: 'billingMonth', header: 'Month' },
              { key: 'amount', header: 'Amount', render: (d) => formatINR(d.amount) },
              { key: 'paidAmount', header: 'Paid', render: (d) => formatINR(d.paidAmount) },
              { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.status} /> },
              { key: 'dueDate', header: 'Due', render: (d) => formatDate(d.dueDate) },
            ]}
          />
        ) : null}
        {tab === 'payments' ? (
          <DataTable
            rows={payments.data || []}
            rowTo={(p) => `/payments/${p._id}`}
            emptyTitle="No payments"
            columns={[
              { key: 'amount', header: 'Amount', render: (p) => formatINR(p.amount) },
              { key: 'method', header: 'Method' },
              { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
              { key: 'paymentDate', header: 'Date', render: (p) => formatDate(p.paymentDate) },
            ]}
          />
        ) : null}
        {tab === 'complaints' ? (
          <DataTable
            rows={complaints.data || []}
            rowTo={(c) => `/complaints/${c._id}`}
            emptyTitle="No complaints"
            columns={[
              { key: 'title', header: 'Title' },
              { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
              { key: 'createdAt', header: 'Created', render: (c) => formatDate(c.createdAt) },
            ]}
          />
        ) : null}
      </div>

      <Modal
        open={inviteOpen}
        title="Invite tenant to the portal"
        onClose={() => setInviteOpen(false)}
        footer={
          !inviteLink ? (
            <>
              <Button variant="secondary" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button loading={invite.isPending} onClick={() => invite.mutate()}>Send invitation</Button>
            </>
          ) : (
            <Button onClick={() => setInviteOpen(false)}>Done</Button>
          )
        }
      >
        {inviteLink ? (
          <p className="break-all text-sm text-ink-600">Share this activation link securely: {inviteLink}</p>
        ) : (
          <p className="text-sm text-ink-600">This creates a portal invitation. The tenant sets a password from the link.</p>
        )}
      </Modal>
      <Modal
        open={noticeOpen}
        title="Start notice period"
        onClose={() => setNoticeOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setNoticeOpen(false)}>Cancel</Button>
            <Button loading={notice.isPending} onClick={() => notice.mutate()}>Confirm</Button>
          </>
        }
      >
        <Field label="Expected move-out date" required>
          <Input type="date" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} />
        </Field>
      </Modal>
      <ConfirmDialog
        open={moveOpen}
        title="Move this tenant out?"
        description="This ends the tenancy. Allocations may also need to be ended separately."
        danger
        confirmLabel="Move out"
        loading={moveOut.isPending}
        onClose={() => setMoveOpen(false)}
        onConfirm={() => moveOut.mutate()}
      />
      {moveOpen ? (
        <div className="mt-2 max-w-xs">
          <Field label="Actual move-out date">
            <Input type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} />
          </Field>
        </div>
      ) : null}
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-ink-400">{label}</p>
      <p className="mt-1">{value}</p>
    </div>
  )
}

export function AllocationListPage() {
  const user = useAuthStore((s) => s.user)
  const propertyId = usePropertyStore((s) => s.currentPropertyId)
  const query = useQuery({
    queryKey: ['allocations', propertyId],
    queryFn: () => allocationApi.list(propertyId ? { propertyId } : {}),
  })
  return (
    <div>
      <PageHeader
        title="Allocations"
        description="Assign a tenant to an available bed."
        actions={
          can(user, PERMISSIONS.ADD_ALLOCATIONS) ? (
            <Link to="/allocations/new">
              <Button>New allocation</Button>
            </Link>
          ) : null
        }
      />
      <DataTable
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        rows={query.data || []}
        rowTo={(a) => `/allocations/${a._id}`}
        emptyTitle="No allocations"
        emptyDescription="Allocate a tenant to an available bed to occupy inventory."
        columns={[
          { key: 'tenant', header: 'Tenant', render: (a) => nameOf(a.tenant) },
          { key: 'property', header: 'Property', render: (a) => nameOf(a.property) },
          { key: 'room', header: 'Room', render: (a) => a.room?.roomNumber },
          { key: 'bed', header: 'Bed', render: (a) => a.bed?.bedNumber },
          { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
          { key: 'startDate', header: 'Start', render: (a) => formatDate(a.startDate) },
        ]}
      />
    </div>
  )
}

export function AllocationCreatePage() {
  const navigate = useNavigate()
  const properties = useQuery({ queryKey: ['properties'], queryFn: propertyApi.list })
  const [propertyId, setPropertyId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [bedId, setBedId] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [startDate, setStartDate] = useState(toInputDate(new Date()))
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const rooms = useQuery({
    queryKey: ['rooms', { propertyId }],
    queryFn: () => roomApi.list({ propertyId, status: 'ACTIVE' }),
    enabled: Boolean(propertyId),
  })
  const beds = useQuery({
    queryKey: ['beds', roomId, 'AVAILABLE'],
    queryFn: () => bedApi.listByRoom(roomId, { status: 'AVAILABLE' }),
    enabled: Boolean(roomId),
  })
  const tenants = useQuery({
    queryKey: ['tenants', { propertyId, status: 'ACTIVE' }],
    queryFn: () => tenantApi.list({ propertyId, status: 'ACTIVE' }),
    enabled: Boolean(propertyId),
  })
  const mutation = useMutation({
    mutationFn: () => allocationApi.create({ tenantId, bedId, startDate, notes: notes || undefined }),
    onSuccess: (a) => {
      toast.success('Bed allocated successfully.')
      navigate(`/allocations/${a._id}`)
    },
    onError: (e) => setError(e.message),
  })

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Allocate a bed" description="Property → room → available bed → tenant." />
      <Card className="p-6">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          <Field label="Property" required>
            <Select value={propertyId} onChange={(e) => { setPropertyId(e.target.value); setRoomId(''); setBedId(''); setTenantId('') }}>
              <option value="">Select</option>
              {asArray(properties.data).map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Room" required>
            <Select value={roomId} onChange={(e) => { setRoomId(e.target.value); setBedId('') }} disabled={!propertyId}>
              <option value="">Select</option>
              {asArray(rooms.data).map((r) => (
                <option key={r._id} value={r._id}>{r.roomNumber}</option>
              ))}
            </Select>
          </Field>
          <Field label="Available bed" required>
            <Select value={bedId} onChange={(e) => setBedId(e.target.value)} disabled={!roomId}>
              <option value="">Select</option>
              {asArray(beds.data).map((b) => (
                <option key={b._id} value={b._id}>{b.bedNumber}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tenant" required>
            <Select value={tenantId} onChange={(e) => setTenantId(e.target.value)} disabled={!propertyId}>
              <option value="">Select</option>
              {asArray(tenants.data).map((t) => (
                <option key={t._id} value={t._id}>{t.name} · {t.phone}</option>
              ))}
            </Select>
          </Field>
          <Field label="Start date" required>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" loading={mutation.isPending} disabled={!bedId || !tenantId}>
            Confirm allocation
          </Button>
        </form>
      </Card>
    </div>
  )
}

export function AllocationDetailPage() {
  const { allocationId } = useParams()
  const [endOpen, setEndOpen] = useState(false)
  const [endDate, setEndDate] = useState(toInputDate(new Date()))
  const query = useQuery({ queryKey: ['allocation', allocationId], queryFn: () => allocationApi.get(allocationId) })
  const qc = useQueryClient()
  const end = useMutation({
    mutationFn: () => allocationApi.end(allocationId, { endDate }),
    onSuccess: () => {
      toast.success('Allocation ended.')
      setEndOpen(false)
      qc.invalidateQueries({ queryKey: ['allocation', allocationId] })
    },
    onError: (e) => toast.error(e.message),
  })
  const a = query.data
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Allocation"
        actions={
          a?.status === 'ACTIVE' ? (
            <Button variant="danger" onClick={() => setEndOpen(true)}>
              End allocation
            </Button>
          ) : null
        }
      />
      <Card className="grid gap-3 p-6">
        <Info label="Tenant" value={nameOf(a?.tenant)} />
        <Info label="Property" value={nameOf(a?.property)} />
        <Info label="Room" value={a?.room?.roomNumber} />
        <Info label="Bed" value={a?.bed?.bedNumber} />
        <Info label="Status" value={<StatusBadge status={a?.status} />} />
        <Info label="Start" value={formatDate(a?.startDate)} />
        <Info label="End" value={formatDate(a?.endDate)} />
        <Info label="Notes" value={a?.notes || '—'} />
      </Card>
      <Modal
        open={endOpen}
        title="End this allocation?"
        onClose={() => setEndOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEndOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={end.isPending} onClick={() => end.mutate()}>End allocation</Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-ink-600">The bed should become available again after the backend processes this.</p>
        <Field label="End date">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </Modal>
    </div>
  )
}
