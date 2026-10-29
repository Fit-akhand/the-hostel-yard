import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { managerApi, propertyApi, staffApi } from '../../services/apis'
import { Button, Card, Field, Input, PageHeader, Select, StatusBadge, Textarea } from '../../components/ui'
import { DataTable } from '../../components/tables/DataTable'
import { ConfirmDialog } from '../../components/modals/Modal'
import { toast } from '../../store/toastStore'
import { nameOf } from '../../utils/format'
import { asArray } from '../../utils/collections'
import { MANAGER_ALLOWED_PERMISSIONS, PERMISSION_GROUPS, PERMISSION_LABELS, STAFF_ALLOWED_PERMISSIONS } from '../../config/permissions'
import { usePropertyStore } from '../../store/propertyStore'

function PermissionSwitch({ checked, indeterminate, onChange, label, strong = false }) {
  const ref = (el) => { if (el) el.indeterminate = Boolean(indeterminate) && !checked }
  return (
    <label className={`flex cursor-pointer items-center gap-2.5 text-sm ${strong ? 'font-semibold text-ink-950' : 'text-ink-800'}`}>
      <input ref={ref} type="checkbox" className="h-4 w-4 accent-[var(--color-brand)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

function PermissionPicker({ allowed, value, onChange }) {
  const groups = PERMISSION_GROUPS
    .map((group) => ({ ...group, keys: group.keys.filter((k) => allowed.includes(k)) }))
    .filter((group) => group.keys.length)
  const allKeys = groups.flatMap((g) => g.keys)
  const selectedCount = allKeys.filter((k) => value.includes(k)).length

  const setGroup = (keys, on) => {
    const rest = value.filter((k) => !keys.includes(k))
    onChange(on ? [...rest, ...keys] : rest)
  }

  return (
    <div className="grid gap-4">
      <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink-950">Permissions</p>
          <p className="text-xs text-ink-600">{selectedCount} of {allKeys.length} allowed</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => onChange([...allKeys])} disabled={selectedCount === allKeys.length}>Allow all</Button>
          <Button size="sm" variant="ghost" onClick={() => onChange([])} disabled={!selectedCount}>Clear all</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {groups.map((group) => {
          const picked = group.keys.filter((k) => value.includes(k)).length
          const all = picked === group.keys.length
          return (
            <fieldset key={group.label} className="bg-card rounded-xl border border-line p-4">
              <div className="mb-3 flex items-center justify-between gap-2 border-b border-line pb-2.5">
                <legend className="float-left text-xs font-semibold uppercase tracking-[0.14em] text-ink-600">{group.label}</legend>
                <PermissionSwitch
                  strong
                  checked={all}
                  indeterminate={picked > 0}
                  onChange={(on) => setGroup(group.keys, on)}
                  label={<span className="text-xs">{all ? 'All allowed' : `Allow all (${picked}/${group.keys.length})`}</span>}
                />
              </div>
              <div className="grid gap-2">
                {group.keys.map((key) => (
                  <PermissionSwitch
                    key={key}
                    checked={value.includes(key)}
                    onChange={(on) => onChange(on ? [...value, key] : value.filter((k) => k !== key))}
                    label={PERMISSION_LABELS[key] || key}
                  />
                ))}
              </div>
            </fieldset>
          )
        })}
      </div>
    </div>
  )
}

export function ManagerPage() {
  const properties = useQuery({ queryKey: ['properties'], queryFn: propertyApi.list })
  const [form, setForm] = useState({ managerName: '', phone: '', email: '', propertyId: '', permissions: [] })
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: () => managerApi.invite(form),
    onSuccess: (data) => { setResult(data); toast.success('Manager invitation created.') },
    onError: (e) => setError(e.message),
  })
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Managers"
        description="The backend does not list existing managers. You can invite a manager to a property and later update permissions with their user ID."
      />
      <Card className="p-6">
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
          <Field label="Name" required><Input value={form.managerName} onChange={(e) => setForm({ ...form, managerName: e.target.value })} /></Field>
          <Field label="Phone" required><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Property" required>
            <Select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
              <option value="">Select</option>
              {asArray(properties.data).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
          </Field>
          <PermissionPicker allowed={MANAGER_ALLOWED_PERMISSIONS} value={form.permissions} onChange={(permissions) => setForm({ ...form, permissions })} />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" loading={mutation.isPending}>Create invitation</Button>
        </form>
        {result?.invitationLink ? (
          <p className="mt-4 break-all text-sm text-ink-600">Share this link securely: {result.invitationLink}</p>
        ) : null}
      </Card>
      <ManagerPermissionUpdate />
    </div>
  )
}

function ManagerPermissionUpdate() {
  const properties = useQuery({ queryKey: ['properties'], queryFn: propertyApi.list })
  const [managerId, setManagerId] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [permissions, setPermissions] = useState([])
  return (
    <Card className="mt-6 p-6">
      <h2 className="font-display text-xl">Update manager permissions</h2>
      <p className="mb-4 text-sm text-ink-600">Requires the manager’s user ID from the invitation/activation response.</p>
      <div className="grid gap-3">
        <Field label="Manager user ID"><Input value={managerId} onChange={(e) => setManagerId(e.target.value)} /></Field>
        <Field label="Property">
          <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">Select</option>
            {asArray(properties.data).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </Select>
        </Field>
        <PermissionPicker allowed={MANAGER_ALLOWED_PERMISSIONS} value={permissions} onChange={setPermissions} />
        <Button
          onClick={() =>
            managerApi.updatePermissions(managerId, propertyId, { permissions }).then(() => toast.success('Permissions updated.')).catch((e) => toast.error(e.message))
          }
        >
          Save permissions
        </Button>
      </div>
    </Card>
  )
}

export function StaffListPage() {
  const propertyId = usePropertyStore((s) => s.currentPropertyId)
  const [status, setStatus] = useState('ACTIVE')
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: ['staff', { propertyId, status, page }],
    queryFn: () => staffApi.list({ status, page, limit: 20, ...(propertyId ? { propertyId } : {}) }),
  })
  const rows = asArray(query.data, 'staff')
  const pagination = query.data?.pagination
  return (
    <div>
      <PageHeader title="Staff" actions={<Link to="/staff/new"><Button>Invite staff</Button></Link>} />
      <Select className="mb-4 max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
        {['ACTIVE','SUSPENDED','REMOVED','ALL'].map((s) => <option key={s}>{s}</option>)}
      </Select>
      <DataTable
        loading={query.isLoading}
        error={query.error}
        rows={rows}
        rowTo={(s) => `/staff/${s._id}`}
        emptyTitle="No staff yet"
        columns={[
          { key: 'name', header: 'Name', render: (s) => s.staff?.name || s.staffName },
          { key: 'designation', header: 'Designation' },
          { key: 'property', header: 'Property', render: (s) => nameOf(s.property) },
          { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
        ]}
      />
      {pagination?.totalPages > 1 ? (
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button variant="secondary" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      ) : null}
    </div>
  )
}

export function StaffFormPage() {
  const properties = useQuery({ queryKey: ['properties'], queryFn: propertyApi.list })
  const [form, setForm] = useState({
    propertyId: '',
    staffName: '',
    phone: '',
    email: '',
    designation: '',
    permissions: [],
    joiningDate: '',
    notes: '',
  })
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: () =>
      staffApi.create({
        ...form,
        email: form.email || undefined,
        joiningDate: form.joiningDate || undefined,
      }),
    onSuccess: (data) => {
      setResult(data)
      toast.success('Staff invitation created.')
    },
    onError: (e) => setError(e.message),
  })
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Invite staff" />
      <Card className="p-6">
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
          <Field label="Property" required>
            <Select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
              <option value="">Select</option>
              {asArray(properties.data).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Name" required><Input value={form.staffName} onChange={(e) => setForm({ ...form, staffName: e.target.value })} /></Field>
          <Field label="Phone" required><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Designation" required><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></Field>
          <Field label="Joining date"><Input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} /></Field>
          <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <PermissionPicker allowed={STAFF_ALLOWED_PERMISSIONS} value={form.permissions} onChange={(permissions) => setForm({ ...form, permissions })} />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" loading={mutation.isPending}>Create invitation</Button>
        </form>
        {result?.invitationLink ? <p className="mt-4 break-all text-sm">Share securely: {result.invitationLink}</p> : null}
      </Card>
    </div>
  )
}

export function StaffDetailPage() {
  const { staffId } = useParams()
  const query = useQuery({ queryKey: ['staff', staffId], queryFn: () => staffApi.get(staffId) })
  const s = query.data?.staff || query.data
  const [designation, setDesignation] = useState('')
  const [permissions, setPermissions] = useState([])
  const [statusOpen, setStatusOpen] = useState(false)
  const [nextStatus, setNextStatus] = useState('SUSPENDED')
  useEffect(() => {
    if (!s) return
    setDesignation(s.designation || '')
    setPermissions(s.permissions || [])
  }, [s])
  const save = useMutation({
    mutationFn: () => staffApi.update(staffId, { designation, permissions }),
    onSuccess: () => toast.success('Staff updated.'),
    onError: (e) => toast.error(e.message),
  })
  const status = useMutation({
    mutationFn: () => staffApi.updateStatus(staffId, { status: nextStatus }),
    onSuccess: () => { toast.success('Status updated.'); setStatusOpen(false) },
    onError: (e) => toast.error(e.message),
  })
  return (
    <div className="max-w-3xl">
      <PageHeader title={s?.staff?.name || s?.staffName || 'Staff'} description={nameOf(s?.property)} />
      <Card className="grid gap-4 p-6">
        <p>{s?.staff?.phone || s?.phone} · {s?.staff?.email}</p>
        <StatusBadge status={s?.status} />
        <Field label="Designation"><Input value={designation} onChange={(e) => setDesignation(e.target.value)} /></Field>
        <PermissionPicker allowed={STAFF_ALLOWED_PERMISSIONS} value={permissions} onChange={setPermissions} />
        <div className="flex gap-2">
          <Button onClick={() => save.mutate()} loading={save.isPending}>Save</Button>
          <Button variant="secondary" onClick={() => setStatusOpen(true)}>Change status</Button>
        </div>
      </Card>
      <ConfirmDialog
        open={statusOpen}
        title="Change staff status?"
        description={
          <span className="grid gap-3">
            <span>Suspended or removed staff lose property access according to the backend.</span>
            <select
              className="h-11 w-full rounded-lg border border-line bg-card px-3"
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value)}
            >
              {['ACTIVE', 'SUSPENDED', 'REMOVED'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </span>
        }
        onClose={() => setStatusOpen(false)}
        onConfirm={() => status.mutate()}
      />
    </div>
  )
}
