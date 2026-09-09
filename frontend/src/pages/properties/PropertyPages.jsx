import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { allocationApi, bedApi, propertyApi, roomApi, staffApi, tenantApi, dashboardApi } from '../../services/apis'
import { Button, Card, Field, Input, PageHeader, Select, StatCard, StatusBadge, Tabs, EmptyState, ErrorState } from '../../components/ui'
import { DataTable } from '../../components/tables/DataTable'
import { ConfirmDialog } from '../../components/modals/Modal'
import { toast } from '../../store/toastStore'
import { fieldErrors } from '../../services/apiClient'
import { formatDate, nameOf } from '../../utils/format'
import { asArray } from '../../utils/collections'
import { can } from '../../config/authz'
import { PERMISSIONS, ROLES } from '../../config/permissions'
import { useAuthStore } from '../../store/authStore'
import { usePropertyStore } from '../../store/propertyStore'

const TYPES = ['PG', 'HOSTEL', 'HOTEL', 'FLAT', 'OTHER']

export function PropertyListPage() {
  const user = useAuthStore((s) => s.user)
  const [search, setSearch] = useState('')
  const query = useQuery({ queryKey: ['properties'], queryFn: propertyApi.list })
  const rows = asArray(query.data).filter((p) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [p.name, p.city, p.address, p.type].join(' ').toLowerCase().includes(q)
  })
  return (
    <div>
      <PageHeader
        title="Properties"
        description="Hostels, PGs and buildings in your organization."
        actions={
          can(user, PERMISSIONS.EDIT_PROPERTY) || [ROLES.BUSINESS_OWNER, ROLES.LANDLORD].includes(user?.role) ? (
            <Link to="/properties/new">
              <Button>Add property</Button>
            </Link>
          ) : null
        }
      />
      <div className="mb-4">
        <Input placeholder="Search properties…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <DataTable
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        rows={rows}
        rowTo={(p) => `/properties/${p._id}`}
        emptyTitle="No properties yet"
        emptyDescription="Add your first property to start managing rooms, beds and occupancy."
        emptyAction={
          <Link to="/properties/new">
            <Button>Add property</Button>
          </Link>
        }
        columns={[
          { key: 'name', header: 'Name', render: (p) => <span className="font-medium">{p.name}</span> },
          { key: 'type', header: 'Type', render: (p) => <StatusBadge status={p.type} /> },
          { key: 'city', header: 'Location', render: (p) => `${p.city}, ${p.state}` },
          { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
        ]}
      />
    </div>
  )
}

export function PropertyFormPage({ mode }) {
  const { propertyId } = useParams()
  const navigate = useNavigate()
  const existing = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => propertyApi.get(propertyId),
    enabled: mode === 'edit' && Boolean(propertyId),
  })
  const [form, setForm] = useState({ name: '', type: 'HOSTEL', address: '', city: '', state: '', pincode: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (existing.data) {
      setForm({
        name: existing.data.name || '',
        type: existing.data.type || 'HOSTEL',
        address: existing.data.address || '',
        city: existing.data.city || '',
        state: existing.data.state || '',
        pincode: existing.data.pincode || '',
      })
    }
  }, [existing.data])

  const mutation = useMutation({
    mutationFn: (body) => (mode === 'edit' ? propertyApi.update(propertyId, body) : propertyApi.create(body)),
    onSuccess: (property) => {
      toast.success(mode === 'edit' ? 'Property updated successfully.' : 'Property created successfully.')
      navigate(`/properties/${property._id || propertyId}`)
    },
    onError: (err) => {
      setErrors(fieldErrors(err))
      setError(err.message)
    },
  })

  function submit(e) {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={mode === 'edit' ? 'Edit property' : 'Create property'} />
      <Card className="p-6">
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Name" required error={errors.name}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Type" required>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Address" required error={errors.address}>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" required error={errors.city}>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label="State" required error={errors.state}>
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </Field>
            <Field label="Pincode" required error={errors.pincode}>
              <Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
            </Field>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Save
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export function PropertyDetailPage() {
  const { propertyId } = useParams()
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [tab, setTab] = useState('overview')
  const [confirm, setConfirm] = useState(false)
  const property = useQuery({ queryKey: ['property', propertyId], queryFn: () => propertyApi.get(propertyId) })
  const overview = useQuery({
    queryKey: ['dashboard', 'overview', propertyId],
    queryFn: () => dashboardApi.overview({ propertyId }),
  })
  const rooms = useQuery({ queryKey: ['rooms', { propertyId }], queryFn: () => roomApi.list({ propertyId }) })
  const tenants = useQuery({
    queryKey: ['tenants', { propertyId, status: 'ALL' }],
    queryFn: () => tenantApi.list({ propertyId, status: 'ALL' }),
  })
  const staff = useQuery({
    queryKey: ['staff', { propertyId }],
    queryFn: () => staffApi.list({ propertyId, status: 'ALL' }),
    enabled: can(user, PERMISSIONS.VIEW_STAFF),
  })
  const allocations = useQuery({
    queryKey: ['allocations', propertyId],
    queryFn: () => allocationApi.list({ propertyId }),
  })

  const deactivate = useMutation({
    mutationFn: () => propertyApi.deactivate(propertyId),
    onSuccess: () => {
      toast.success('Property deactivated.')
      qc.invalidateQueries({ queryKey: ['properties'] })
    },
    onError: (e) => toast.error(e.message),
  })

  if (property.isLoading) return <p className="text-ink-400">Loading property…</p>
  if (property.isError) return <ErrorState message={property.error.message} onRetry={() => property.refetch()} />
  const p = property.data
  const occ = overview.data?.occupancy
  const staffRows = asArray(staff.data, 'staff')

  return (
    <div>
      <PageHeader
        title={p.name}
        description={`${p.address}, ${p.city}, ${p.state} ${p.pincode}`}
        actions={
          <>
            {[ROLES.BUSINESS_OWNER, ROLES.LANDLORD].includes(user?.role) ? (
              <Link to={`/properties/${propertyId}/edit`}>
                <Button variant="secondary">Edit</Button>
              </Link>
            ) : null}
            <Link to={`/rooms/new?propertyId=${propertyId}`}>
              <Button variant="secondary">Manage rooms</Button>
            </Link>
            {[ROLES.BUSINESS_OWNER, ROLES.LANDLORD].includes(user?.role) ? (
              <Button variant="danger" onClick={() => setConfirm(true)}>
                Deactivate
              </Button>
            ) : null}
          </>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusBadge status={p.type} />
        <StatusBadge status={p.status} />
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Rooms" value={overview.data?.rooms?.total ?? rooms.data?.length ?? '—'} />
        <StatCard label="Beds" value={occ?.totalBeds ?? '—'} />
        <StatCard label="Occupied" value={occ?.occupiedBeds ?? '—'} />
        <StatCard label="Available" value={occ?.availableBeds ?? '—'} />
        <StatCard label="Occupancy" value={occ ? `${occ.occupancyPercentage}%` : '—'} />
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'rooms', label: 'Rooms' },
          { id: 'beds', label: 'Beds' },
          { id: 'tenants', label: 'Tenants' },
          { id: 'staff', label: 'Staff' },
          { id: 'financials', label: 'Financials' },
        ]}
      />
      <div className="mt-5">
        {tab === 'overview' ? (
          <Card className="p-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Item label="Name" value={p.name} />
              <Item label="Type" value={p.type} />
              <Item label="City" value={p.city} />
              <Item label="State" value={p.state} />
              <Item label="Pincode" value={p.pincode} />
              <Item label="Created" value={formatDate(p.createdAt)} />
            </dl>
          </Card>
        ) : null}
        {tab === 'rooms' ? (
          <DataTable
            rows={rooms.data || []}
            rowTo={(r) => `/rooms/${r._id}`}
            emptyTitle="No rooms"
            emptyDescription="Create rooms to place beds and tenants."
            columns={[
              { key: 'roomNumber', header: 'Room' },
              { key: 'floor', header: 'Floor' },
              { key: 'type', header: 'Type' },
              { key: 'capacity', header: 'Capacity' },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        ) : null}
        {tab === 'beds' ? <PropertyBeds rooms={asArray(rooms.data)} /> : null}
        {tab === 'tenants' ? (
          <DataTable
            rows={tenants.data || []}
            rowTo={(t) => `/tenants/${t._id}`}
            emptyTitle="No tenants"
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'phone', header: 'Phone' },
              { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
              { key: 'moveInDate', header: 'Move-in', render: (t) => formatDate(t.moveInDate) },
            ]}
          />
        ) : null}
        {tab === 'staff' ? (
          <DataTable
            rows={staffRows}
            rowTo={(s) => `/staff/${s._id}`}
            emptyTitle="No staff assigned"
            columns={[
              { key: 'name', header: 'Name', render: (s) => s.staff?.name || s.staffName },
              { key: 'designation', header: 'Designation' },
              { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
            ]}
          />
        ) : null}
        {tab === 'financials' ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Outstanding" value={overview.data?.rent ? formatINRSafe(overview.data.rent.outstanding) : '—'} />
            <StatCard label="Collected" value={overview.data?.payments ? formatINRSafe(overview.data.payments.verified?.amount) : '—'} />
            <StatCard label="Expenses (month)" value={overview.data?.expenses ? formatINRSafe(overview.data.expenses.total) : '—'} />
            <p className="sm:col-span-3 text-sm text-ink-400">
              {allocations.data?.length || 0} allocations on this property.
            </p>
          </div>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirm}
        title="Deactivate this property?"
        description="The property will no longer appear in the active list. This cannot be undone from the UI if the backend only supports deactivation."
        danger
        confirmLabel="Deactivate"
        loading={deactivate.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={() => deactivate.mutate()}
      />
    </div>
  )
}

function formatINRSafe(v) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v) || 0)
  } catch {
    return String(v)
  }
}

function Item({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.14em] text-ink-400">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  )
}

function PropertyBeds({ rooms }) {
  return (
    <div className="grid gap-4">
      {rooms.map((room) => (
        <RoomBeds key={room._id} room={room} />
      ))}
      {!rooms.length ? <EmptyState title="No rooms" description="Add rooms before placing beds." /> : null}
    </div>
  )
}

function RoomBeds({ room }) {
  const beds = useQuery({ queryKey: ['beds', room._id], queryFn: () => bedApi.listByRoom(room._id) })
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium">Room {room.roomNumber}</h3>
        <Link to={`/rooms/${room._id}`} className="text-sm text-ink-400">
          Open
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {asArray(beds.data).map((bed) => (
          <Link
            key={bed._id}
            to={`/beds/${bed._id}`}
            className={`rounded-lg border px-3 py-2 text-sm ${
              bed.status === 'OCCUPIED'
                ? 'border-navy-900 bg-navy-900 text-white'
                : bed.status === 'AVAILABLE'
                  ? 'border-success/30 bg-success-bg'
                  : 'border-line bg-ink-50'
            }`}
          >
            {bed.bedNumber}
            <span className="ml-2 text-xs opacity-70">{bed.status}</span>
          </Link>
        ))}
      </div>
    </Card>
  )
}

export function OrganizationPage() {
  const user = useAuthStore((s) => s.user)
  return (
    <div>
      <PageHeader
        title="Organization"
        description="Organization records are created during owner setup. There is no organization update API."
      />
      <Card className="p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Item label="Signed-in owner" value={user?.name} />
          <Item label="Email" value={user?.email || '—'} />
          <Item label="Phone" value={user?.phone} />
          <Item label="Organization ID" value={String(user?.organization || '—')} />
          <Item label="Role" value={user?.role?.replaceAll('_', ' ')} />
          <Item label="Status" value={user?.status} />
        </dl>
      </Card>
    </div>
  )
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  return (
    <div className="max-w-xl">
      <PageHeader title="Profile" />
      <Card className="p-6">
        <dl className="grid gap-4">
          <Item label="Name" value={user?.name} />
          <Item label="Email" value={user?.email || '—'} />
          <Item label="Phone" value={user?.phone} />
          <Item label="Role" value={user?.role?.replaceAll('_', ' ')} />
        </dl>
      </Card>
    </div>
  )
}
