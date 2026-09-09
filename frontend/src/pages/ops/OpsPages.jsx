import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { announcementApi, complaintApi, notificationApi, propertyApi, tenantApi } from '../../services/apis'
import { Button, Card, Field, Input, PageHeader, Select, StatusBadge, Textarea } from '../../components/ui'
import { DataTable } from '../../components/tables/DataTable'
import { ConfirmDialog, Modal } from '../../components/modals/Modal'
import { toast } from '../../store/toastStore'
import { formatDate, formatDateTime, nameOf } from '../../utils/format'
import { asArray } from '../../utils/collections'
import { usePropertyStore } from '../../store/propertyStore'
import { can } from '../../config/authz'
import { PERMISSIONS } from '../../config/permissions'
import { useAuthStore } from '../../store/authStore'

const COMPLAINT_CATS = ['ELECTRICAL','PLUMBING','CLEANING','FURNITURE','AC','WIFI','SECURITY','MAINTENANCE','OTHER']
const PRIORITIES = ['LOW','MEDIUM','HIGH','URGENT']
const CSTATUSES = ['OPEN','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED','CANCELLED']

export function ComplaintListPage() {
  const user = useAuthStore((s) => s.user)
  const propertyId = usePropertyStore((s) => s.currentPropertyId)
  const [status, setStatus] = useState('')
  const query = useQuery({
    queryKey: ['complaints', { propertyId, status }],
    queryFn: () => complaintApi.list({ ...(propertyId ? { propertyId } : {}), ...(status ? { status } : {}) }),
  })
  return (
    <div>
      <PageHeader
        title="Complaints"
        actions={<Link to="/complaints/new"><Button>New complaint</Button></Link>}
      />
      <Select className="mb-4 max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All statuses</option>
        {CSTATUSES.map((s) => <option key={s}>{s}</option>)}
      </Select>
      <DataTable
        loading={query.isLoading}
        error={query.error}
        rows={query.data || []}
        rowTo={(c) => `/complaints/${c._id}`}
        emptyTitle="No complaints"
        columns={[
          { key: 'title', header: 'Title' },
          { key: 'tenant', header: 'Tenant', render: (c) => nameOf(c.tenant) },
          { key: 'category', header: 'Category' },
          { key: 'priority', header: 'Priority', render: (c) => <StatusBadge status={c.priority} /> },
          { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
          { key: 'createdAt', header: 'Created', render: (c) => formatDate(c.createdAt) },
        ]}
      />
    </div>
  )
}

export function ComplaintFormPage() {
  const navigate = useNavigate()
  const properties = useQuery({ queryKey: ['properties'], queryFn: propertyApi.list })
  const [form, setForm] = useState({ propertyId: '', tenantId: '', title: '', description: '', category: 'MAINTENANCE', priority: 'MEDIUM' })
  const tenants = useQuery({
    queryKey: ['tenants', { propertyId: form.propertyId }],
    queryFn: () => tenantApi.list({ propertyId: form.propertyId, status: 'ALL' }),
    enabled: Boolean(form.propertyId),
  })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: () => complaintApi.create({ ...form, tenantId: form.tenantId || undefined, propertyId: form.propertyId || undefined }),
    onSuccess: (c) => { toast.success('Complaint created successfully.'); navigate(`/complaints/${c._id}`) },
    onError: (e) => setError(e.message),
  })
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Create complaint" />
      <Card className="p-6">
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
          <Field label="Property">
            <Select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
              <option value="">Select</option>
              {asArray(properties.data).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Tenant">
            <Select value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })}>
              <option value="">Select</option>
              {asArray(tenants.data).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Description" required><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {COMPLAINT_CATS.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {PRIORITIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" loading={mutation.isPending}>Create</Button>
        </form>
      </Card>
    </div>
  )
}

export function ComplaintDetailPage() {
  const { complaintId } = useParams()
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [del, setDel] = useState(false)
  const query = useQuery({ queryKey: ['complaint', complaintId], queryFn: () => complaintApi.get(complaintId) })
  const c = query.data
  const change = useMutation({
    mutationFn: () => complaintApi.changeStatus(complaintId, { status, resolutionNotes: notes || undefined }),
    onSuccess: () => { toast.success('Status updated.'); qc.invalidateQueries({ queryKey: ['complaint', complaintId] }) },
    onError: (e) => toast.error(e.message),
  })
  const assign = useMutation({
    mutationFn: () => complaintApi.assign(complaintId, { assignedTo }),
    onSuccess: () => toast.success('Assigned.'),
    onError: (e) => toast.error(e.message),
  })
  const remove = useMutation({
    mutationFn: () => complaintApi.remove(complaintId),
    onSuccess: () => toast.success('Complaint deleted.'),
    onError: (e) => toast.error(e.message),
  })
  return (
    <div className="max-w-2xl">
      <PageHeader title={c?.title || 'Complaint'} actions={can(user, PERMISSIONS.MANAGE_COMPLAINTS) ? <Button variant="danger" onClick={() => setDel(true)}>Delete</Button> : null} />
      <Card className="p-6">
        <div className="flex gap-2"><StatusBadge status={c?.status} /><StatusBadge status={c?.priority} /></div>
        <p className="mt-4 text-sm text-ink-600">{c?.description}</p>
        <dl className="mt-6 grid gap-2 text-sm">
          <p>Category {c?.category}</p>
          <p>Tenant {nameOf(c?.tenant)}</p>
          <p>Property {nameOf(c?.property)}</p>
          <p>Created {formatDateTime(c?.createdAt)}</p>
          <p>Assigned {nameOf(c?.assignedTo, 'Unassigned')}</p>
          <p>Resolution {c?.resolutionNotes || '—'}</p>
        </dl>
      </Card>
      {can(user, PERMISSIONS.MANAGE_COMPLAINTS) ? (
        <Card className="mt-4 grid gap-3 p-6">
          <Field label="Change status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Select</option>
              {CSTATUSES.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Resolution notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <Button onClick={() => change.mutate()} disabled={!status}>Update status</Button>
          <Field label="Assign to user ID">
            <Input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="MongoDB user ObjectId" />
          </Field>
          <Button variant="secondary" onClick={() => assign.mutate()} disabled={!assignedTo}>Assign</Button>
        </Card>
      ) : null}
      <ConfirmDialog open={del} title="Delete complaint?" description="This cannot be undone." danger onClose={() => setDel(false)} onConfirm={() => remove.mutate()} />
    </div>
  )
}

export function AnnouncementListPage() {
  const user = useAuthStore((s) => s.user)
  const propertyId = usePropertyStore((s) => s.currentPropertyId)
  const query = useQuery({
    queryKey: ['announcements', propertyId],
    queryFn: () => announcementApi.list(propertyId ? { propertyId } : {}),
  })
  return (
    <div>
      <PageHeader
        title="Announcements"
        actions={can(user, PERMISSIONS.SEND_ANNOUNCEMENT) ? <Link to="/announcements/new"><Button>New announcement</Button></Link> : null}
      />
      <DataTable
        loading={query.isLoading}
        error={query.error}
        rows={query.data || []}
        rowTo={(a) => `/announcements/${a._id}`}
        emptyTitle="No announcements"
        columns={[
          { key: 'title', header: 'Title' },
          { key: 'type', header: 'Type' },
          { key: 'audience', header: 'Audience' },
          { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
          { key: 'createdAt', header: 'Created', render: (a) => formatDate(a.createdAt) },
        ]}
      />
    </div>
  )
}

export function AnnouncementFormPage() {
  const navigate = useNavigate()
  const properties = useQuery({ queryKey: ['properties'], queryFn: propertyApi.list })
  const [form, setForm] = useState({
    propertyId: '',
    title: '',
    message: '',
    type: 'GENERAL',
    priority: 'MEDIUM',
    audience: 'PROPERTY_TENANTS',
    targetTenantId: '',
    expiresAt: '',
  })
  const tenants = useQuery({
    queryKey: ['tenants', { propertyId: form.propertyId }],
    queryFn: () => tenantApi.list({ propertyId: form.propertyId, status: 'ACTIVE' }),
    enabled: form.audience === 'SPECIFIC_TENANT' && Boolean(form.propertyId),
  })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        propertyId: form.propertyId,
        title: form.title,
        message: form.message,
        type: form.type,
        priority: form.priority,
        audience: form.audience,
        targetTenantId: form.audience === 'SPECIFIC_TENANT' ? form.targetTenantId : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      }
      return announcementApi.create(body)
    },
    onSuccess: (a) => { toast.success('Announcement created.'); navigate(`/announcements/${a._id}`) },
    onError: (e) => setError(e.message),
  })
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Create announcement" />
      <Card className="p-6">
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
          <Field label="Property" required>
            <Select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
              <option value="">Select</option>
              {asArray(properties.data).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Message"><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {['GENERAL','MAINTENANCE','PAYMENT','FOOD','RULES','EMERGENCY','EVENT','OTHER'].map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Audience">
            <Select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
              {['ALL_TENANTS','PROPERTY_TENANTS','SPECIFIC_TENANT','STAFF','MANAGERS'].map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          {form.audience === 'SPECIFIC_TENANT' ? (
            <Field label="Tenant">
              <Select value={form.targetTenantId} onChange={(e) => setForm({ ...form, targetTenantId: e.target.value })}>
                <option value="">Select</option>
                {asArray(tenants.data).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </Select>
            </Field>
          ) : null}
          <Field label="Expires">
            <Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" loading={mutation.isPending}>Create</Button>
        </form>
      </Card>
    </div>
  )
}

export function AnnouncementDetailPage() {
  const { announcementId } = useParams()
  const qc = useQueryClient()
  const [del, setDel] = useState(false)
  const query = useQuery({ queryKey: ['announcement', announcementId], queryFn: () => announcementApi.get(announcementId) })
  const a = query.data
  return (
    <div className="max-w-2xl">
      <PageHeader
        title={a?.title || 'Announcement'}
        actions={
          <>
            {a?.status === 'DRAFT' ? (
              <Button onClick={() => announcementApi.publish(announcementId, {}).then(() => { toast.success('Published.'); qc.invalidateQueries({ queryKey: ['announcement', announcementId] }) })}>Publish</Button>
            ) : null}
            {a?.status === 'PUBLISHED' ? (
              <Button variant="secondary" onClick={() => announcementApi.cancel(announcementId, {}).then(() => toast.success('Cancelled.'))}>Cancel</Button>
            ) : null}
            <Button variant="danger" onClick={() => setDel(true)}>Delete</Button>
          </>
        }
      />
      <Card className="p-6">
        <div className="flex gap-2"><StatusBadge status={a?.status} /><StatusBadge status={a?.priority} /></div>
        <p className="mt-4 whitespace-pre-wrap text-ink-800">{a?.message}</p>
        <p className="mt-4 text-sm text-ink-400">{a?.audience} · {formatDateTime(a?.createdAt)}</p>
      </Card>
      <ConfirmDialog open={del} title="Delete announcement?" description="This removes the announcement." danger onClose={() => setDel(false)} onConfirm={() => announcementApi.remove(announcementId).then(() => toast.success('Deleted.'))} />
    </div>
  )
}

export function NotificationPage() {
  const [filter, setFilter] = useState('')
  const query = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => notificationApi.list(filter ? { isRead: filter } : {}),
  })
  const items = asArray(query.data, 'notifications')
  return (
    <div>
      <PageHeader
        title="Notifications"
        actions={<Button variant="secondary" onClick={() => notificationApi.markAll().then(() => { toast.success('All marked read.'); query.refetch() })}>Mark all read</Button>}
      />
      <Select className="mb-4 max-w-xs" value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="">All</option>
        <option value="false">Unread</option>
        <option value="true">Read</option>
      </Select>
      <div className="grid gap-3">
        {items.map((n) => (
          <Link key={n._id} to={`/notifications/${n._id}`} className={`rounded-xl border border-line bg-card p-4 ${n.isRead ? '' : 'border-navy-900/30'}`}>
            <div className="flex justify-between gap-3">
              <p className="font-medium">{n.title || n.type}</p>
              {!n.isRead ? <span className="text-xs text-brand">Unread</span> : null}
            </div>
            <p className="mt-1 text-sm text-ink-600">{n.message || n.body}</p>
            <p className="mt-2 text-xs text-ink-400">{formatDateTime(n.createdAt)}</p>
          </Link>
        ))}
        {!items.length ? <Card className="p-10 text-center text-sm text-ink-400">No notifications.</Card> : null}
      </div>
    </div>
  )
}

export function NotificationDetailPage() {
  const { notificationId } = useParams()
  const query = useQuery({
    queryKey: ['notification', notificationId],
    queryFn: async () => {
      const n = await notificationApi.get(notificationId)
      await notificationApi.markRead(notificationId)
      return n
    },
  })
  const n = query.data
  return (
    <div className="max-w-xl">
      <PageHeader title={n?.title || n?.type || 'Notification'} />
      <Card className="p-6">
        <p>{n?.message || n?.body}</p>
        <p className="mt-4 text-sm text-ink-400">{formatDateTime(n?.createdAt)}</p>
      </Card>
    </div>
  )
}
