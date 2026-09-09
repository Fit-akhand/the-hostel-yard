import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bedApi, propertyApi, roomApi, tenantApi, allocationApi } from '../../services/apis'
import { Button, Card, Field, Input, PageHeader, Select, StatusBadge, Tabs } from '../../components/ui'
import { DataTable } from '../../components/tables/DataTable'
import { ConfirmDialog } from '../../components/modals/Modal'
import { toast } from '../../store/toastStore'
import { fieldErrors } from '../../services/apiClient'
import { formatDate, nameOf } from '../../utils/format'
import { asArray } from '../../utils/collections'
import { usePropertyStore } from '../../store/propertyStore'
import { can } from '../../config/authz'
import { PERMISSIONS } from '../../config/permissions'
import { useAuthStore } from '../../store/authStore'

const ROOM_TYPES = ['SINGLE', 'DOUBLE', 'TRIPLE', 'DORMITORY']
const ROOM_STATUS = ['ACTIVE', 'MAINTENANCE', 'INACTIVE']

export function RoomListPage() {
  const user = useAuthStore((s) => s.user)
  const propertyId = usePropertyStore((s) => s.currentPropertyId)
  const [status, setStatus] = useState('ACTIVE')
  const [search, setSearch] = useState('')
  const [floor, setFloor] = useState('')
  const properties = useQuery({ queryKey: ['properties'], queryFn: propertyApi.list })
  const rooms = useQuery({
    queryKey: ['rooms', { propertyId, status }],
    queryFn: () => roomApi.list({ ...(propertyId ? { propertyId } : {}), status }),
  })
  const rows = asArray(rooms.data).filter((r) => {
    if (floor !== '' && String(r.floor) !== String(floor)) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return String(r.roomNumber).toLowerCase().includes(q)
  })
  return (
    <div>
      <PageHeader
        title="Rooms"
        actions={
          can(user, PERMISSIONS.ADD_ROOMS) ? (
            <Link to="/rooms/new">
              <Button>Add room</Button>
            </Link>
          ) : null
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Input placeholder="Search room number…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          {['ACTIVE', 'MAINTENANCE', 'INACTIVE', 'ALL'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Input placeholder="Floor" value={floor} onChange={(e) => setFloor(e.target.value)} />
        <Button variant="secondary" onClick={() => { setSearch(''); setFloor(''); setStatus('ACTIVE') }}>
          Clear
        </Button>
      </div>
      <DataTable
        loading={rooms.isLoading}
        error={rooms.error}
        onRetry={() => rooms.refetch()}
        rows={rows}
        rowTo={(r) => `/rooms/${r._id}`}
        emptyTitle="No rooms yet"
        emptyDescription="Add rooms to a property so beds can be allocated."
        emptyAction={
          <Link to="/rooms/new">
            <Button>Add room</Button>
          </Link>
        }
        columns={[
          { key: 'roomNumber', header: 'Room' },
          { key: 'property', header: 'Property', render: (r) => nameOf(r.property) },
          { key: 'floor', header: 'Floor' },
          { key: 'type', header: 'Type' },
          { key: 'capacity', header: 'Capacity' },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
    </div>
  )
}

export function RoomFormPage({ mode }) {
  const { roomId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const properties = useQuery({ queryKey: ['properties'], queryFn: propertyApi.list })
  const existing = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => roomApi.get(roomId),
    enabled: mode === 'edit',
  })
  const [form, setForm] = useState({
    propertyId: params.get('propertyId') || '',
    roomNumber: '',
    floor: 0,
    type: 'DOUBLE',
    capacity: 2,
    status: 'ACTIVE',
  })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (existing.data) {
      setForm({
        propertyId: existing.data.property?._id || existing.data.property || '',
        roomNumber: existing.data.roomNumber || '',
        floor: existing.data.floor ?? 0,
        type: existing.data.type || 'DOUBLE',
        capacity: existing.data.capacity || 1,
        status: existing.data.status || 'ACTIVE',
      })
    }
  }, [existing.data])

  const mutation = useMutation({
    mutationFn: () => {
      if (mode === 'edit') {
        const { roomNumber, floor, type, capacity, status } = form
        return roomApi.update(roomId, { roomNumber, floor: Number(floor), type, capacity: Number(capacity), status })
      }
      return roomApi.create({
        propertyId: form.propertyId,
        roomNumber: form.roomNumber,
        floor: Number(form.floor),
        type: form.type,
        capacity: Number(form.capacity),
      })
    },
    onSuccess: (room) => {
      toast.success(mode === 'edit' ? 'Room updated successfully.' : 'Room created successfully.')
      navigate(`/rooms/${room._id || roomId}`)
    },
    onError: (err) => {
      setErrors(fieldErrors(err))
      setError(err.message)
    },
  })

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={mode === 'edit' ? 'Edit room' : 'Create room'} />
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
                <option value="">Select property</option>
                {asArray(properties.data).map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="Room number" required error={errors.roomNumber}>
            <Input value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} />
          </Field>
          <Field label="Floor" required error={errors.floor}>
            <Input type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {ROOM_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Capacity" required>
            <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </Field>
          {mode === 'edit' ? (
            <Field label="Status">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {ROOM_STATUS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
          ) : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" loading={mutation.isPending}>
            Save
          </Button>
        </form>
      </Card>
    </div>
  )
}

export function RoomDetailPage() {
  const { roomId } = useParams()
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)
  const room = useQuery({ queryKey: ['room', roomId], queryFn: () => roomApi.get(roomId) })
  const beds = useQuery({ queryKey: ['beds', roomId], queryFn: () => bedApi.listByRoom(roomId) })
  const allocations = useQuery({ queryKey: ['allocations'], queryFn: () => allocationApi.list() })
  const deactivate = useMutation({
    mutationFn: () => roomApi.deactivate(roomId),
    onSuccess: () => {
      toast.success('Room deactivated.')
      navigate('/rooms')
    },
    onError: (e) => toast.error(e.message),
  })
  if (room.isError) return <p className="text-danger">{room.error.message}</p>
  const r = room.data
  const occupied = asArray(beds.data).filter((b) => b.status === 'OCCUPIED').length
  const available = asArray(beds.data).filter((b) => b.status === 'AVAILABLE').length
  const roomAllocations = asArray(allocations.data).filter((a) => (a.room?._id || a.room) === roomId)

  return (
    <div>
      <PageHeader
        title={r ? `Room ${r.roomNumber}` : 'Room'}
        description={r ? `${nameOf(r.property)} · Floor ${r.floor} · ${r.type}` : ''}
        actions={
          <>
            {can(user, PERMISSIONS.EDIT_ROOMS) ? (
              <Link to={`/rooms/${roomId}/edit`}>
                <Button variant="secondary">Edit</Button>
              </Link>
            ) : null}
            {can(user, PERMISSIONS.ADD_ROOMS) ? (
              <Link to={`/beds/new?roomId=${roomId}`}>
                <Button>Add bed</Button>
              </Link>
            ) : null}
            {can(user, PERMISSIONS.REMOVE_ROOMS) ? (
              <Button variant="danger" onClick={() => setConfirm(true)}>
                Deactivate
              </Button>
            ) : null}
          </>
        }
      />
      {r ? <StatusBadge status={r.status} /> : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-ink-400">Capacity</p><p className="text-2xl">{r?.capacity}</p></Card>
        <Card className="p-4"><p className="text-xs text-ink-400">Occupied beds</p><p className="text-2xl">{occupied}</p></Card>
        <Card className="p-4"><p className="text-xs text-ink-400">Available beds</p><p className="text-2xl">{available}</p></Card>
      </div>
      <h2 className="mt-8 font-display text-2xl">Beds</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {asArray(beds.data).map((bed) => (
          <Link
            key={bed._id}
            to={`/beds/${bed._id}`}
            className={`min-w-28 rounded-lg border px-4 py-3 ${
              bed.status === 'OCCUPIED' ? 'bg-navy-900 text-white' : bed.status === 'AVAILABLE' ? 'bg-success-bg' : 'bg-warning-bg'
            }`}
          >
            <p className="font-medium">{bed.bedNumber}</p>
            <p className="text-xs opacity-80">{bed.status}</p>
          </Link>
        ))}
      </div>
      <h2 className="mt-8 font-display text-2xl">Allocations</h2>
      <DataTable
        rows={roomAllocations}
        rowTo={(a) => `/allocations/${a._id}`}
        emptyTitle="No allocations"
        columns={[
          { key: 'tenant', header: 'Tenant', render: (a) => nameOf(a.tenant) },
          { key: 'bed', header: 'Bed', render: (a) => a.bed?.bedNumber },
          { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
          { key: 'startDate', header: 'Start', render: (a) => formatDate(a.startDate) },
        ]}
      />
      <ConfirmDialog
        open={confirm}
        title="Deactivate this room?"
        description="The room will be marked inactive if the backend accepts the request."
        danger
        onClose={() => setConfirm(false)}
        onConfirm={() => deactivate.mutate()}
        loading={deactivate.isPending}
      />
    </div>
  )
}

export function BedListPage() {
  const propertyId = usePropertyStore((s) => s.currentPropertyId)
  const [status, setStatus] = useState('')
  const rooms = useQuery({
    queryKey: ['rooms', { propertyId, status: 'ALL' }],
    queryFn: () => roomApi.list({ ...(propertyId ? { propertyId } : {}), status: 'ALL' }),
  })
  const [selectedRoom, setSelectedRoom] = useState('')
  const beds = useQuery({
    queryKey: ['beds', selectedRoom, status],
    queryFn: () => bedApi.listByRoom(selectedRoom, status ? { status } : {}),
    enabled: Boolean(selectedRoom),
  })

  return (
    <div>
      <PageHeader
        title="Beds"
        description="Beds are listed per room. Choose a room to inspect occupancy."
        actions={
          <Link to={selectedRoom ? `/beds/new?roomId=${selectedRoom}` : '/rooms'}>
            <Button>Add bed</Button>
          </Link>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}>
          <option value="">Select room</option>
          {asArray(rooms.data).map((r) => (
            <option key={r._id} value={r._id}>
              {r.roomNumber} · {nameOf(r.property)}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </div>
      {!selectedRoom ? (
        <Card className="p-10 text-center text-sm text-ink-600">Select a room to view its beds.</Card>
      ) : (
        <div className="flex flex-wrap gap-3">
          {asArray(beds.data).map((bed) => (
            <Link key={bed._id} to={`/beds/${bed._id}`} className="min-w-36 rounded-xl border border-line bg-card p-4">
              <p className="font-medium">{bed.bedNumber}</p>
              <StatusBadge status={bed.status} />
            </Link>
          ))}
          {beds.data?.length === 0 ? <p className="text-sm text-ink-400">No beds in this room.</p> : null}
        </div>
      )}
    </div>
  )
}

export function BedFormPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const roomId = params.get('roomId')
  const [bedNumber, setBedNumber] = useState('')
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: () => bedApi.create(roomId, { bedNumber }),
    onSuccess: (bed) => {
      toast.success('Bed created successfully.')
      navigate(`/beds/${bed._id}`)
    },
    onError: (e) => setError(e.message),
  })
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Add bed" />
      <Card className="p-6">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          <Field label="Bed number" required>
            <Input value={bedNumber} onChange={(e) => setBedNumber(e.target.value)} />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" loading={mutation.isPending} disabled={!roomId}>
            Create
          </Button>
        </form>
      </Card>
    </div>
  )
}

export function BedDetailPage() {
  const { bedId } = useParams()
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)
  const [bedNumber, setBedNumber] = useState('')
  const [status, setStatus] = useState('AVAILABLE')
  const bed = useQuery({ queryKey: ['bed', bedId], queryFn: () => bedApi.get(bedId) })
  const allocations = useQuery({ queryKey: ['allocations'], queryFn: () => allocationApi.list() })
  useEffect(() => {
    if (bed.data) {
      setBedNumber(bed.data.bedNumber)
      setStatus(bed.data.status)
    }
  }, [bed.data])
  const update = useMutation({
    mutationFn: () => bedApi.update(bedId, { bedNumber, status }),
    onSuccess: () => toast.success('Bed updated successfully.'),
    onError: (e) => toast.error(e.message),
  })
  const deactivate = useMutation({
    mutationFn: () => bedApi.deactivate(bedId),
    onSuccess: () => {
      toast.success('Bed deactivated.')
      navigate('/beds')
    },
    onError: (e) => toast.error(e.message),
  })
  const b = bed.data
  const related = asArray(allocations.data).filter((a) => (a.bed?._id || a.bed) === bedId)
  return (
    <div className="max-w-2xl">
      <PageHeader title={b ? `Bed ${b.bedNumber}` : 'Bed'} description={b ? nameOf(b.room, 'Room') : ''} />
      <Card className="grid gap-4 p-6">
        <Field label="Bed number">
          <Input value={bedNumber} onChange={(e) => setBedNumber(e.target.value)} />
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <div className="flex gap-2">
          <Button onClick={() => update.mutate()} loading={update.isPending}>
            Save
          </Button>
          {can(user, PERMISSIONS.REMOVE_ROOMS) ? (
            <Button variant="danger" onClick={() => setConfirm(true)}>
              Deactivate
            </Button>
          ) : null}
        </div>
      </Card>
      <h2 className="mt-8 font-display text-2xl">Allocations</h2>
      <DataTable
        rows={related}
        emptyTitle="No allocation history"
        columns={[
          { key: 'tenant', header: 'Tenant', render: (a) => nameOf(a.tenant) },
          { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
          { key: 'startDate', header: 'Start', render: (a) => formatDate(a.startDate) },
        ]}
      />
      <ConfirmDialog
        open={confirm}
        title="Deactivate this bed?"
        description="Inactive beds should not receive new allocations."
        danger
        onClose={() => setConfirm(false)}
        onConfirm={() => deactivate.mutate()}
        loading={deactivate.isPending}
      />
    </div>
  )
}
