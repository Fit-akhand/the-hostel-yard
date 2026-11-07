import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { managerApi, propertyApi, staffApi } from '../../services/apis'
import { InviteShare } from '../../components/ui/InviteShare'
import { Badge, Button, Card, Field, Input, PageHeader, Select, StatusBadge, Textarea } from '../../components/ui'
import { DataTable } from '../../components/tables/DataTable'
import { ConfirmDialog, Modal } from '../../components/modals/Modal'
import { toast } from '../../store/toastStore'
import { formatDate, nameOf } from '../../utils/format'
import { asArray } from '../../utils/collections'
import { MANAGER_ALLOWED_PERMISSIONS, PERMISSION_GROUPS, PERMISSION_LABELS, STAFF_ALLOWED_PERMISSIONS } from '../../config/permissions'
import { usePropertyStore } from '../../store/propertyStore'
import { useAuthStore } from '../../store/authStore'

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

export function ManagerListPage() {
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ['managers'], queryFn: managerApi.list })
  const managers = asArray(query.data?.managers)
  const invitations = asArray(query.data?.invitations)
  const cancel = useMutation({
    mutationFn: (id) => managerApi.cancelInvitation(id),
    onSuccess: () => { toast.success('Invitation cancelled.'); qc.invalidateQueries({ queryKey: ['managers'] }) },
    onError: (e) => toast.error(e.message),
  })

  return (
    <div>
      <PageHeader
        title="Managers"
        description="People who run your properties day to day. Open a manager to change their details and what they can do."
        actions={<Link to="/managers/new"><Button>Add manager</Button></Link>}
      />
      <DataTable
        loading={query.isLoading}
        error={query.error}
        rows={managers}
        rowTo={(m) => `/managers/${m._id}`}
        emptyTitle="No managers yet"
        emptyDescription="Add a manager to give someone access to one of your properties."
        columns={[
          { key: 'name', header: 'Name', render: (m) => <div><p className="font-medium">{m.name}</p><p className="text-xs text-ink-600">{m.phone}</p></div> },
          { key: 'properties', header: 'Properties', render: (m) => (m.properties.length ? m.properties.map((p) => p.name).join(', ') : <span className="text-ink-400">None</span>) },
          { key: 'access', header: 'Access', render: (m) => `${new Set(m.properties.flatMap((p) => p.permissions)).size} permissions` },
          { key: 'status', header: 'Status', render: (m) => <Badge tone={m.status === 'ACTIVE' ? 'success' : 'warning'}>{m.status === 'ACTIVE' ? 'Active' : 'Suspended'}</Badge> },
        ]}
      />

      {invitations.length ? (
        <div className="mt-8">
          <h2 className="mb-1 font-display text-xl">Waiting to join</h2>
          <p className="mb-3 text-sm text-ink-600">Invited, but they have not set up their account yet.</p>
          <Card className="divide-y divide-line">
            {invitations.map((i) => (
              <div key={i._id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-medium">{i.managerName}</p>
                  <p className="text-xs text-ink-600">{i.phone} · {i.property?.name} · link expires {formatDate(i.expiresAt)}</p>
                </div>
                <Button size="sm" variant="ghost" loading={cancel.isPending && cancel.variables === i._id} onClick={() => cancel.mutate(i._id)}>Cancel invitation</Button>
              </div>
            ))}
          </Card>
        </div>
      ) : null}
    </div>
  )
}

export function ManagerInvitePage() {
  const user = useAuthStore((s) => s.user)
  const properties = useQuery({ queryKey: ['properties'], queryFn: propertyApi.list })
  const qc = useQueryClient()
  const [form, setForm] = useState({ managerName: '', phone: '', email: '', propertyId: '', permissions: [] })
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: () => managerApi.invite(form),
    onSuccess: (data) => { setResult(data); toast.success('Manager invitation created.'); qc.invalidateQueries({ queryKey: ['managers'] }) },
    onError: (e) => setError(e.message),
  })
  const propertyName = result?.property?.name || asArray(properties.data).find((p) => p._id === form.propertyId)?.name

  return (
    <div className="max-w-3xl">
      <PageHeader title="Add manager" description="They get a one-time link to set their password. Send it on WhatsApp." actions={<Link to="/managers"><Button variant="secondary">Back to managers</Button></Link>} />
      <Card className="p-6">
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); setError(''); mutation.mutate() }}>
          <Field label="Name" required><Input value={form.managerName} onChange={(e) => setForm({ ...form, managerName: e.target.value })} /></Field>
          <Field label="Phone" required><Input value={form.phone} inputMode="tel" onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Property" required>
            <Select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
              <option value="">Select</option>
              {asArray(properties.data).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
          </Field>
          <PermissionPicker allowed={MANAGER_ALLOWED_PERMISSIONS} value={form.permissions} onChange={(permissions) => setForm({ ...form, permissions })} />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" loading={mutation.isPending} disabled={!form.managerName || !form.phone || !form.propertyId || !form.permissions.length}>Create invitation</Button>
        </form>
        {result?.invitationLink ? (
          <InviteShare link={result.invitationLink} name={result.manager?.name || form.managerName} phone={result.manager?.phone || form.phone} role="a property manager" property={propertyName} inviter={user?.name} />
        ) : null}
      </Card>
    </div>
  )
}

export function ManagerDetailPage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const properties = useQuery({ queryKey: ['properties'], queryFn: propertyApi.list })
  const query = useQuery({ queryKey: ['manager', id], queryFn: () => managerApi.get(id) })
  const m = query.data
  const [profile, setProfile] = useState(null)
  const [drafts, setDrafts] = useState({})
  const [addOpen, setAddOpen] = useState(false)
  const [add, setAdd] = useState({ propertyId: '', permissions: [] })

  useEffect(() => {
    if (!m) return
    setProfile({ name: m.name, phone: m.phone, email: m.email || '' })
    setDrafts(Object.fromEntries(m.properties.map((p) => [p._id, p.permissions])))
  }, [m])

  const refresh = () => { qc.invalidateQueries({ queryKey: ['manager', id] }); qc.invalidateQueries({ queryKey: ['managers'] }) }
  const fail = (e) => toast.error(e.message)

  const saveProfile = useMutation({
    mutationFn: () => managerApi.update(id, { name: profile.name, phone: profile.phone, ...(profile.email ? { email: profile.email } : {}) }),
    onSuccess: () => { toast.success('Details saved.'); refresh() }, onError: fail,
  })
  const setStatus = useMutation({
    mutationFn: (status) => managerApi.setStatus(id, status),
    onSuccess: (_d, status) => { toast.success(status === 'SUSPENDED' ? 'Manager suspended. They can no longer sign in.' : 'Manager reactivated.'); refresh() }, onError: fail,
  })
  const savePerms = useMutation({
    mutationFn: (propertyId) => managerApi.updatePermissions(id, propertyId, { permissions: drafts[propertyId] }),
    onSuccess: () => { toast.success('Permissions saved.'); refresh() }, onError: fail,
  })
  const remove = useMutation({
    mutationFn: (propertyId) => managerApi.unassign(id, propertyId),
    onSuccess: () => { toast.success('Removed from the property.'); refresh() }, onError: fail,
  })
  const assign = useMutation({
    mutationFn: () => managerApi.assign(id, add),
    onSuccess: () => { toast.success('Property assigned.'); setAddOpen(false); setAdd({ propertyId: '', permissions: [] }); refresh() }, onError: fail,
  })

  if (query.isLoading) return <p className="text-sm text-ink-600">Loading…</p>
  if (query.error) return <p className="text-sm text-danger">{query.error.message}</p>
  if (!profile) return null

  const free = asArray(properties.data).filter((p) => !m.properties.some((a) => a._id === p._id))

  return (
    <div className="grid max-w-4xl gap-5">
      <PageHeader
        title={m.name}
        description={`Manager · last signed in ${m.lastLoginAt ? formatDate(m.lastLoginAt) : 'never'}`}
        actions={
          <div className="flex gap-2">
            <Link to="/managers"><Button variant="secondary">All managers</Button></Link>
            <Button variant={m.status === 'ACTIVE' ? 'danger' : 'primary'} loading={setStatus.isPending} onClick={() => setStatus.mutate(m.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}>
              {m.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
            </Button>
          </div>
        }
      />
      {m.status !== 'ACTIVE' ? <p className="rounded-xl bg-warning-bg px-4 py-3 text-sm text-warning">This manager is suspended and cannot sign in.</p> : null}

      <Card className="p-6">
        <h2 className="mb-4 font-display text-xl">Details</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Name"><Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
          <Field label="Phone"><Input value={profile.phone} inputMode="tel" onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field>
          <Field label="E-mail"><Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></Field>
        </div>
        <Button className="mt-4" loading={saveProfile.isPending} disabled={profile.name.trim().length < 2 || profile.phone.trim().length < 10} onClick={() => saveProfile.mutate()}>Save details</Button>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Properties and access</h2>
        <Button size="sm" variant="secondary" disabled={!free.length} onClick={() => setAddOpen(true)}>Assign another property</Button>
      </div>
      {!m.properties.length ? <p className="text-sm text-ink-600">Not assigned to any property.</p> : null}
      {m.properties.map((p) => (
        <Card key={p._id} className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-lg">{p.name}</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" loading={remove.isPending && remove.variables === p._id} onClick={() => remove.mutate(p._id)}>Remove from property</Button>
              <Button size="sm" loading={savePerms.isPending && savePerms.variables === p._id} disabled={!(drafts[p._id] || []).length} onClick={() => savePerms.mutate(p._id)}>Save permissions</Button>
            </div>
          </div>
          <PermissionPicker allowed={MANAGER_ALLOWED_PERMISSIONS} value={drafts[p._id] || []} onChange={(permissions) => setDrafts({ ...drafts, [p._id]: permissions })} />
        </Card>
      ))}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Assign another property" wide>
        <div className="grid gap-4">
          <Field label="Property" required>
            <Select value={add.propertyId} onChange={(e) => setAdd({ ...add, propertyId: e.target.value })}>
              <option value="">Select</option>
              {free.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
          </Field>
          <PermissionPicker allowed={MANAGER_ALLOWED_PERMISSIONS} value={add.permissions} onChange={(permissions) => setAdd({ ...add, permissions })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button loading={assign.isPending} disabled={!add.propertyId || !add.permissions.length} onClick={() => assign.mutate()}>Assign</Button>
          </div>
        </div>
      </Modal>
    </div>
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
  const authUser = useAuthStore((s) => s.user)
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
        {result?.invitationLink ? (
          <InviteShare link={result.invitationLink} name={result.staff?.name || form.staffName} phone={result.staff?.phone || form.phone} role="a staff member" property={result.property?.name} inviter={authUser?.name} />
        ) : null}
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
