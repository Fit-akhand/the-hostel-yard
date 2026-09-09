import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { announcementApi, allocationApi, complaintApi, notificationApi, paymentApi, rentApi } from '../../services/apis'
import { Button, Card, Field, Input, PageHeader, Select, StatCard, StatusBadge, Textarea } from '../../components/ui'
import { DataTable } from '../../components/tables/DataTable'
import { toast } from '../../store/toastStore'
import { formatDate, formatINR, nameOf, toInputDate } from '../../utils/format'
import { asArray } from '../../utils/collections'
import { useAuthStore } from '../../store/authStore'
import { useState } from 'react'

export function TenantDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const summary = useQuery({ queryKey: ['tenant-payment-summary'], queryFn: paymentApi.tenantSummary })
  const dues = useQuery({ queryKey: ['rent-dues'], queryFn: () => rentApi.dues() })
  const announcements = useQuery({ queryKey: ['announcements'], queryFn: () => announcementApi.list() })
  const complaints = useQuery({ queryKey: ['complaints'], queryFn: () => complaintApi.list() })
  const info = summary.data
  const nextDue = asArray(dues.data).find((d) => ['PENDING', 'PARTIAL', 'OVERDUE'].includes(d.status))
  return (
    <div>
      <PageHeader title={`Hello, ${user?.name?.split(' ')[0] || 'resident'}`} description="Your stay, rent and notices in one place." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Outstanding"
          value={formatINR(
            info?.outstanding ??
              info?.totalOutstanding ??
              (nextDue ? nextDue.amount - nextDue.paidAmount : 0)
          )}
        />
        <StatCard label="Next rent" value={nextDue ? formatINR(nextDue.amount - nextDue.paidAmount) : '—'} hint={nextDue ? formatDate(nextDue.dueDate) : 'No open due'} />
        <StatCard label="Open complaints" value={asArray(complaints.data).filter((c) => !['RESOLVED','CLOSED','CANCELLED'].includes(c.status)).length} />
        <StatCard label="Announcements" value={asArray(announcements.data).length} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-xl">Open rent</h2>
          {asArray(dues.data).slice(0, 4).map((d) => (
            <div key={d._id} className="mt-3 flex justify-between border-b border-line pb-2 text-sm">
              <span>{d.billingMonth}</span>
              <span className="tabular">{formatINR(d.amount - d.paidAmount)}</span>
            </div>
          ))}
          <Link to="/tenant/rent" className="mt-3 inline-block text-sm">View rent →</Link>
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-xl">Announcements</h2>
          {asArray(announcements.data).slice(0, 4).map((a) => (
            <p key={a._id} className="mt-3 border-b border-line pb-2 text-sm">{a.title}</p>
          ))}
        </Card>
      </div>
    </div>
  )
}

export function TenantStayPage() {
  const allocations = useQuery({
    queryKey: ['allocations'],
    queryFn: () => allocationApi.list(),
  })
  const active = asArray(allocations.data).find((a) => a.status === 'ACTIVE')
  return (
    <div>
      <PageHeader title="My stay" />
      {active ? (
        <Card className="p-6">
          <p className="font-display text-3xl">Room {active.room?.roomNumber}</p>
          <p className="mt-1 text-ink-600">Bed {active.bed?.bedNumber} · {nameOf(active.property)}</p>
          <p className="mt-4 text-sm">Since {formatDate(active.startDate)}</p>
        </Card>
      ) : (
        <Card className="p-10 text-center text-sm text-ink-600">No active allocation was returned for your account.</Card>
      )}
    </div>
  )
}

export function TenantRentPage() {
  const dues = useQuery({ queryKey: ['rent-dues'], queryFn: () => rentApi.dues() })
  return (
    <div>
      <PageHeader title="My rent" />
      <DataTable
        loading={dues.isLoading}
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
    </div>
  )
}

export function TenantPaymentsPage() {
  const history = useQuery({ queryKey: ['tenant-pay-history'], queryFn: () => paymentApi.tenantHistory() })
  const dues = useQuery({ queryKey: ['rent-dues'], queryFn: () => rentApi.dues() })
  const [form, setForm] = useState({
    rentDueId: '',
    amount: '',
    transactionReference: '',
    paymentDate: toInputDate(new Date()),
    notes: '',
  })
  const rows = asArray(history.data, 'payments')
  const pay = useMutation({
    mutationFn: () =>
      paymentApi.tenantCreate({
        rentDueId: form.rentDueId,
        amount: Number(form.amount),
        method: 'UPI',
        transactionReference: form.transactionReference,
        paymentDate: form.paymentDate,
        notes: form.notes || undefined,
      }),
    onSuccess: () => toast.success('Payment submitted. Awaiting verification.'),
    onError: (e) => toast.error(e.message),
  })
  const info = useQuery({
    queryKey: ['rent-pay-info', form.rentDueId],
    queryFn: () => rentApi.paymentInfo(form.rentDueId),
    enabled: Boolean(form.rentDueId),
  })
  return (
    <div>
      <PageHeader title="Payments" description="Tenants can only submit UPI payments with a transaction reference." />
      <Card className="mb-6 grid gap-3 p-6">
        <h2 className="font-display text-xl">Submit UPI payment</h2>
        <Field label="Rent due">
          <Select value={form.rentDueId} onChange={(e) => setForm({ ...form, rentDueId: e.target.value })}>
            <option value="">Select</option>
            {asArray(dues.data).map((d) => (
              <option key={d._id} value={d._id}>{d.billingMonth} · {formatINR(d.amount - d.paidAmount)} due</option>
            ))}
          </Select>
        </Field>
        {info.data ? (
          <p className="text-sm text-ink-600">
            Pay to {info.data.upiId || info.data.accountName || 'the listed UPI account'}. {info.data.paymentInstructions}
          </p>
        ) : null}
        <Field label="Amount"><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
        <Field label="UPI reference" required><Input value={form.transactionReference} onChange={(e) => setForm({ ...form, transactionReference: e.target.value })} /></Field>
        <Button onClick={() => pay.mutate()} loading={pay.isPending} disabled={!form.rentDueId}>Submit</Button>
      </Card>
      <DataTable
        rows={Array.isArray(rows) ? rows : []}
        emptyTitle="No payment history"
        columns={[
          { key: 'amount', header: 'Amount', render: (p) => formatINR(p.amount) },
          { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
          { key: 'paymentDate', header: 'Date', render: (p) => formatDate(p.paymentDate) },
        ]}
      />
    </div>
  )
}

export function TenantComplaintsPage() {
  const query = useQuery({ queryKey: ['complaints'], queryFn: () => complaintApi.list() })
  const [form, setForm] = useState({ title: '', description: '', category: 'MAINTENANCE', priority: 'MEDIUM' })
  const create = useMutation({
    mutationFn: () => complaintApi.create(form),
    onSuccess: () => { toast.success('Complaint submitted.'); query.refetch() },
    onError: (e) => toast.error(e.message),
  })
  return (
    <div>
      <PageHeader title="Complaints" />
      <Card className="mb-6 grid gap-3 p-6">
        <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Category">
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {['ELECTRICAL','PLUMBING','CLEANING','FURNITURE','AC','WIFI','SECURITY','MAINTENANCE','OTHER'].map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Button onClick={() => create.mutate()} loading={create.isPending}>Submit</Button>
      </Card>
      <DataTable
        rows={query.data || []}
        emptyTitle="No complaints"
        columns={[
          { key: 'title', header: 'Title' },
          { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
          { key: 'createdAt', header: 'Created', render: (c) => formatDate(c.createdAt) },
        ]}
      />
    </div>
  )
}

export function TenantAnnouncementsPage() {
  const query = useQuery({ queryKey: ['announcements'], queryFn: () => announcementApi.list() })
  return (
    <div>
      <PageHeader title="Announcements" />
      <div className="grid gap-3">
        {asArray(query.data).map((a) => (
          <Card key={a._id} className="p-5">
            <div className="flex justify-between gap-2">
              <h2 className="font-medium">{a.title}</h2>
              <StatusBadge status={a.priority} />
            </div>
            <p className="mt-2 text-sm text-ink-600">{a.message}</p>
          </Card>
        ))}
        {!query.data?.length ? <Card className="p-10 text-center text-sm text-ink-400">No announcements.</Card> : null}
      </div>
    </div>
  )
}

export function TenantNotificationsPage() {
  const query = useQuery({ queryKey: ['notifications'], queryFn: () => notificationApi.list() })
  const items = asArray(query.data, 'notifications')
  return (
    <div>
      <PageHeader title="Notifications" />
      <div className="grid gap-3">
        {items.map((n) => (
          <Card key={n._id} className="p-4">
            <p className="font-medium">{n.title || n.type}</p>
            <p className="text-sm text-ink-600">{n.message || n.body}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

export { ProfilePage as TenantProfilePage } from '../properties/PropertyPages'
