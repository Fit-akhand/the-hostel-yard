import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  allocationApi,
  bedApi,
  bookingApi,
  expenseApi,
  paymentApi,
  paymentSettingsApi,
  propertyApi,
  rentApi,
  roomApi,
  tenantApi,
} from '../../services/apis'
import { Button, Card, Field, Input, PageHeader, Select, StatusBadge, Textarea } from '../../components/ui'
import { DataTable } from '../../components/tables/DataTable'
import { ConfirmDialog, Modal } from '../../components/modals/Modal'
import { toast } from '../../store/toastStore'
import { formatDate, formatINR, nameOf, toInputDate } from '../../utils/format'
import { asArray } from '../../utils/collections'
import { usePropertyStore } from '../../store/propertyStore'
import { can } from '../../config/authz'
import { PERMISSIONS, ROLES } from '../../config/permissions'
import { useAuthStore } from '../../store/authStore'

export function BookingListPage() {
  const user = useAuthStore((s) => s.user)
  const propertyId = usePropertyStore((s) => s.currentPropertyId)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: ['bookings', { propertyId, status, page }],
    queryFn: () =>
      bookingApi.list({
        page,
        limit: 20,
        ...(propertyId ? { propertyId } : {}),
        ...(status ? { status } : {}),
      }),
  })
  const rows = asArray(query.data, 'bookings')
  const pagination = query.data?.pagination
  return (
    <div>
      <PageHeader
        title="Bookings"
        actions={
          can(user, PERMISSIONS.MANAGE_BOOKINGS) ? (
            <Link to="/bookings/new">
              <Button>Create booking</Button>
            </Link>
          ) : null
        }
      />
      <div className="mb-4">
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All statuses</option>
          {['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'COMPLETED'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </div>
      <DataTable
        loading={query.isLoading}
        error={query.error}
        rows={Array.isArray(rows) ? rows : []}
        rowTo={(b) => `/bookings/${b._id}`}
        emptyTitle="No bookings"
        columns={[
          { key: 'tenant', header: 'Tenant', render: (b) => nameOf(b.tenant) },
          { key: 'property', header: 'Property', render: (b) => nameOf(b.property) },
          { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
          { key: 'paymentStatus', header: 'Payment', render: (b) => <StatusBadge status={b.paymentStatus} /> },
          { key: 'expectedMoveInDate', header: 'Move-in', render: (b) => formatDate(b.expectedMoveInDate) },
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

export function BookingFormPage() {
  const navigate = useNavigate()
  const properties = useQuery({ queryKey: ['properties'], queryFn: propertyApi.list })
  const [form, setForm] = useState({
    propertyId: '',
    tenantId: '',
    roomId: '',
    bedId: '',
    expectedMoveInDate: toInputDate(new Date()),
    expectedMoveOutDate: '',
    amount: '',
    paymentStatus: 'UNPAID',
    notes: '',
  })
  const tenants = useQuery({
    queryKey: ['tenants', { propertyId: form.propertyId }],
    queryFn: () => tenantApi.list({ propertyId: form.propertyId, status: 'ALL' }),
    enabled: Boolean(form.propertyId),
  })
  const roomsQ = useQuery({
    queryKey: ['rooms', { propertyId: form.propertyId }],
    queryFn: () => roomApi.list({ propertyId: form.propertyId }),
    enabled: Boolean(form.propertyId),
  })
  const bedsQ = useQuery({
    queryKey: ['beds', form.roomId],
    queryFn: () => bedApi.listByRoom(form.roomId),
    enabled: Boolean(form.roomId),
  })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: () =>
      bookingApi.create({
        ...form,
        amount: form.amount === '' ? undefined : Number(form.amount),
        expectedMoveOutDate: form.expectedMoveOutDate || undefined,
      }),
    onSuccess: (data) => {
      toast.success('Booking created successfully.')
      const id = data?._id || data?.booking?._id
      navigate(id ? `/bookings/${id}` : '/bookings')
    },
    onError: (e) => setError(e.message),
  })
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Create booking" />
      <Card className="p-6">
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
          <Field label="Property" required>
            <Select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
              <option value="">Select</option>
              {asArray(properties.data).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Tenant" required>
            <Select value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })}>
              <option value="">Select</option>
              {asArray(tenants.data).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Room" required>
            <Select value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value, bedId: '' })}>
              <option value="">Select</option>
              {asArray(roomsQ.data).map((r) => <option key={r._id} value={r._id}>{r.roomNumber}</option>)}
            </Select>
          </Field>
          <Field label="Bed" required>
            <Select value={form.bedId} onChange={(e) => setForm({ ...form, bedId: e.target.value })}>
              <option value="">Select</option>
              {asArray(bedsQ.data).map((b) => <option key={b._id} value={b._id}>{b.bedNumber} ({b.status})</option>)}
            </Select>
          </Field>
          <Field label="Expected move-in" required>
            <Input type="date" value={form.expectedMoveInDate} onChange={(e) => setForm({ ...form, expectedMoveInDate: e.target.value })} />
          </Field>
          <Field label="Expected move-out">
            <Input type="date" value={form.expectedMoveOutDate} onChange={(e) => setForm({ ...form, expectedMoveOutDate: e.target.value })} />
          </Field>
          <Field label="Amount (INR)">
            <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="Payment status">
            <Select value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
              {['UNPAID', 'PARTIAL', 'PAID'].map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" loading={mutation.isPending}>Create</Button>
        </form>
      </Card>
    </div>
  )
}

export function BookingDetailPage() {
  const { bookingId } = useParams()
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [reason, setReason] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const query = useQuery({ queryKey: ['booking', bookingId], queryFn: () => bookingApi.get(bookingId) })
  const booking = query.data?.booking || query.data
  const act = async (fn, msg) => {
    try {
      await fn()
      toast.success(msg)
      qc.invalidateQueries({ queryKey: ['booking', bookingId] })
    } catch (e) {
      toast.error(e.message)
    }
  }
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Booking"
        actions={
          <>
            {can(user, PERMISSIONS.MANAGE_BOOKINGS) && booking?.status === 'PENDING' ? (
              <Button onClick={() => act(() => bookingApi.confirm(bookingId), 'Booking confirmed.')}>Confirm</Button>
            ) : null}
            {can(user, PERMISSIONS.MANAGE_BOOKINGS) && booking?.status === 'CONFIRMED' ? (
              <Button variant="secondary" onClick={() => act(() => bookingApi.complete(bookingId), 'Booking completed.')}>Complete</Button>
            ) : null}
            {can(user, PERMISSIONS.MANAGE_BOOKINGS) ? (
              <Button variant="secondary" onClick={() => setCancelOpen(true)}>Cancel</Button>
            ) : null}
            {can(user, PERMISSIONS.REMOVE_BOOKINGS) ? (
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>Delete</Button>
            ) : null}
          </>
        }
      />
      <Card className="grid gap-3 p-6">
        <p><span className="text-ink-400">Tenant: </span>{nameOf(booking?.tenant)}</p>
        <p><span className="text-ink-400">Property: </span>{nameOf(booking?.property)}</p>
        <p><span className="text-ink-400">Room / bed: </span>{booking?.room?.roomNumber} / {booking?.bed?.bedNumber}</p>
        <StatusBadge status={booking?.status} />
        <StatusBadge status={booking?.paymentStatus} />
        <p>Amount {formatINR(booking?.amount)}</p>
        <p>Move-in {formatDate(booking?.expectedMoveInDate)}</p>
        <p>Notes {booking?.notes || '—'}</p>
      </Card>
      <Modal open={cancelOpen} title="Cancel booking" onClose={() => setCancelOpen(false)} footer={
        <>
          <Button variant="secondary" onClick={() => setCancelOpen(false)}>Back</Button>
          <Button variant="danger" onClick={() => { setCancelOpen(false); act(() => bookingApi.cancel(bookingId, { cancellationReason: reason }), 'Booking cancelled.') }}>Cancel booking</Button>
        </>
      }>
        <Field label="Reason">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </Modal>
      <ConfirmDialog open={deleteOpen} title="Delete this booking?" description="This permanently removes the booking if the backend allows it." danger onClose={() => setDeleteOpen(false)} onConfirm={() => { setDeleteOpen(false); act(() => bookingApi.remove(bookingId), 'Booking deleted.') }} />
    </div>
  )
}

export function RentPage() {
  const user = useAuthStore((s) => s.user)
  const [status, setStatus] = useState('')
  const dues = useQuery({
    queryKey: ['rent-dues', status],
    queryFn: () => rentApi.dues(status ? { status } : {}),
  })
  const plans = useQuery({ queryKey: ['rent-plans'], queryFn: () => rentApi.plans() })
  const qc = useQueryClient()
  const currentPropertyId = usePropertyStore((s) => s.currentPropertyId)
  const inProperty = (row) =>
    !currentPropertyId || (row.property?._id || row.property) === currentPropertyId
  const visibleDues = asArray(dues.data).filter(inProperty)
  const visiblePlans = asArray(plans.data).filter(inProperty)
  const [genOpen, setGenOpen] = useState(false)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [scope, setScope] = useState('property')
  const generate = useMutation({
    mutationFn: () =>
      rentApi.generateMonthly({
        billingMonth: month,
        propertyId: scope === 'property' && currentPropertyId ? currentPropertyId : undefined,
      }),
    onSuccess: (r) => {
      toast.success(
        r.created
          ? `Created ${r.created} rent due(s) for ${r.billingMonth}.` + (r.skipped ? ` ${r.skipped} already existed.` : '')
          : `All dues for ${r.billingMonth} already exist.`
      )
      setGenOpen(false)
      qc.invalidateQueries({ queryKey: ['rent-dues'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e) => toast.error(e.message),
  })
  return (
    <div>
      <PageHeader
        title="Rent"
        actions={
          can(user, PERMISSIONS.ADD_DUES) ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setGenOpen(true)}>Generate monthly dues</Button>
              <Link to="/rent/plans/new"><Button>New rent plan</Button></Link>
            </div>
          ) : null
        }
      />
      <Modal open={genOpen} onClose={() => setGenOpen(false)} title="Generate monthly dues">
        <div className="grid gap-4">
          <p className="text-sm text-ink-600">
            Creates one rent due from every active rent plan for the chosen month. Plans that already have a due for that month are skipped.
          </p>
          <Field label="Billing month" required>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </Field>
          {currentPropertyId ? (
            <Field label="For">
              <Select value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="property">Selected property only</option>
                <option value="all">All properties</option>
              </Select>
            </Field>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setGenOpen(false)}>Cancel</Button>
            <Button loading={generate.isPending} disabled={!month} onClick={() => generate.mutate()}>Generate dues</Button>
          </div>
        </div>
      </Modal>
      <div className="mb-4">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All dues</option>
          {['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'].map((s) => <option key={s}>{s}</option>)}
        </Select>
      </div>
      <DataTable
        loading={dues.isLoading}
        error={dues.error}
        rows={visibleDues}
        rowTo={(d) => `/rent/${d._id}`}
        emptyTitle="No rent dues"
        emptyDescription="Create rent plans for your tenants, then use Generate monthly dues."
        columns={[
          { key: 'tenant', header: 'Tenant', render: (d) => nameOf(d.tenant) },
          { key: 'billingMonth', header: 'Month' },
          { key: 'amount', header: 'Amount', render: (d) => formatINR(d.amount) },
          { key: 'paidAmount', header: 'Paid', render: (d) => formatINR(d.paidAmount) },
          { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.status} /> },
          { key: 'dueDate', header: 'Due', render: (d) => formatDate(d.dueDate) },
        ]}
      />
      <h2 className="mt-10 font-display text-2xl">Rent plans</h2>
      <DataTable
        rows={visiblePlans}
        emptyTitle="No rent plans"
        columns={[
          { key: 'tenant', header: 'Tenant', render: (p) => nameOf(p.tenant) },
          { key: 'monthlyRent', header: 'Monthly rent', render: (p) => formatINR(p.monthlyRent) },
          { key: 'dueDay', header: 'Due day' },
          { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
        ]}
      />
    </div>
  )
}

export function RentPlanCreatePage() {
  const navigate = useNavigate()
  const tenants = useQuery({ queryKey: ['tenants', { status: 'ACTIVE' }], queryFn: () => tenantApi.list({ status: 'ACTIVE' }) })
  const allocations = useQuery({ queryKey: ['allocations'], queryFn: () => allocationApi.list() })
  const [params] = useSearchParams()
  const [form, setForm] = useState({
    tenantId: params.get('tenantId') || '',
    allocationId: params.get('allocationId') || '',
    monthlyRent: '',
    dueDay: 5,
    startDate: toInputDate(new Date()),
    notes: '',
  })
  const [error, setError] = useState('')
  const tenantAllocations = asArray(allocations.data).filter(
    (a) => a.status === 'ACTIVE' && (a.tenant?._id || a.tenant) === form.tenantId
  )
  const mutation = useMutation({
    mutationFn: () =>
      rentApi.createPlan({
        ...form,
        monthlyRent: Number(form.monthlyRent),
        dueDay: Number(form.dueDay),
      }),
    onSuccess: () => {
      toast.success('Rent plan created successfully.')
      navigate('/rent')
    },
    onError: (e) => setError(e.message),
  })
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Create rent plan" />
      <Card className="p-6">
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
          <Field label="Tenant" required>
            <Select value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value, allocationId: '' })}>
              <option value="">Select</option>
              {asArray(tenants.data).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Active allocation" required>
            <Select value={form.allocationId} onChange={(e) => setForm({ ...form, allocationId: e.target.value })}>
              <option value="">Select</option>
              {tenantAllocations.map((a) => (
                <option key={a._id} value={a._id}>{a.room?.roomNumber} / {a.bed?.bedNumber}</option>
              ))}
            </Select>
          </Field>
          <Field label="Monthly rent (INR)" required>
            <Input type="number" value={form.monthlyRent} onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })} />
          </Field>
          <Field label="Due day (1–28)">
            <Input type="number" min={1} max={28} value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} />
          </Field>
          <Field label="Start date">
            <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" loading={mutation.isPending}>Create plan</Button>
        </form>
      </Card>
    </div>
  )
}

export function RentDueDetailPage() {
  const { rentDueId } = useParams()
  const user = useAuthStore((s) => s.user)
  const dues = useQuery({ queryKey: ['rent-dues'], queryFn: () => rentApi.dues() })
  const due = asArray(dues.data).find((d) => d._id === rentDueId)
  const plans = useQuery({ queryKey: ['rent-plans'], queryFn: () => rentApi.plans() })
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [planId, setPlanId] = useState('')
  const generate = useMutation({
    mutationFn: () => rentApi.generateDue(planId, { billingMonth: month }),
    onSuccess: () => toast.success('Rent due generated.'),
    onError: (e) => toast.error(e.message),
  })
  const [payOpen, setPayOpen] = useState(false)
  const [pay, setPay] = useState({ amount: '', method: 'CASH', transactionReference: '', paymentDate: toInputDate(new Date()), notes: '' })
  const collect = useMutation({
    mutationFn: () =>
      paymentApi.create({
        rentDueId,
        amount: Number(pay.amount),
        method: pay.method,
        transactionReference: pay.method === 'UPI' ? pay.transactionReference : undefined,
        paymentDate: pay.paymentDate,
        notes: pay.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Payment recorded successfully.')
      setPayOpen(false)
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <div className="max-w-xl">
      <PageHeader
        title={due ? `Rent ${due.billingMonth}` : 'Rent due'}
        actions={
          can(user, PERMISSIONS.COLLECT_RENT) ? (
            <Button onClick={() => setPayOpen(true)}>Collect payment</Button>
          ) : null
        }
      />
      {due ? (
        <Card className="grid gap-2 p-6">
          <p>{nameOf(due.tenant)}</p>
          <p className="tabular text-3xl font-display">{formatINR(due.amount)}</p>
          <p>Paid {formatINR(due.paidAmount)}</p>
          <StatusBadge status={due.status} />
          <p>Due {formatDate(due.dueDate)}</p>
        </Card>
      ) : (
        <p className="text-sm text-ink-600">If this due is not in the list, generate it from a rent plan below.</p>
      )}
      {can(user, PERMISSIONS.ADD_DUES) ? (
        <Card className="mt-6 grid gap-3 p-6">
          <h2 className="font-display text-xl">Generate monthly due</h2>
          <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="">Select plan</option>
            {asArray(plans.data).map((p) => (
              <option key={p._id} value={p._id}>{nameOf(p.tenant)} · {formatINR(p.monthlyRent)}</option>
            ))}
          </Select>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <Button onClick={() => generate.mutate()} disabled={!planId} loading={generate.isPending}>Generate</Button>
        </Card>
      ) : null}
      <Modal open={payOpen} title="Collect rent" onClose={() => setPayOpen(false)} footer={
        <>
          <Button variant="secondary" onClick={() => setPayOpen(false)}>Cancel</Button>
          <Button loading={collect.isPending} onClick={() => collect.mutate()}>Record payment</Button>
        </>
      }>
        <div className="grid gap-3">
          <Field label="Amount"><Input type="number" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></Field>
          <Field label="Method">
            <Select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>
              <option>CASH</option>
              <option>UPI</option>
            </Select>
          </Field>
          {pay.method === 'UPI' ? (
            <Field label="UPI reference"><Input value={pay.transactionReference} onChange={(e) => setPay({ ...pay, transactionReference: e.target.value })} /></Field>
          ) : null}
          <Field label="Payment date"><Input type="date" value={pay.paymentDate} onChange={(e) => setPay({ ...pay, paymentDate: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  )
}

export function PaymentListPage() {
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const query = useQuery({
    queryKey: ['payments', { status, method }],
    queryFn: () => paymentApi.list({ ...(status ? { status } : {}), ...(method ? { method } : {}) }),
  })
  return (
    <div>
      <PageHeader title="Payments" />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['PENDING', 'VERIFIED', 'REJECTED'].map((s) => <option key={s}>{s}</option>)}
        </Select>
        <Select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="">All methods</option>
          <option>CASH</option>
          <option>UPI</option>
        </Select>
      </div>
      <DataTable
        loading={query.isLoading}
        error={query.error}
        rows={query.data || []}
        rowTo={(p) => `/payments/${p._id}`}
        emptyTitle="No payments"
        columns={[
          { key: 'amount', header: 'Amount', render: (p) => <span className="tabular font-medium">{formatINR(p.amount)}</span> },
          { key: 'tenant', header: 'Tenant', render: (p) => nameOf(p.tenant) },
          { key: 'method', header: 'Method' },
          { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
          { key: 'paymentDate', header: 'Date', render: (p) => formatDate(p.paymentDate) },
        ]}
      />
    </div>
  )
}

export function PaymentDetailPage() {
  const { paymentId } = useParams()
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [notes, setNotes] = useState('')
  const query = useQuery({ queryKey: ['payment', paymentId], queryFn: () => paymentApi.get(paymentId) })
  const p = query.data
  const verify = useMutation({
    mutationFn: () => paymentApi.verify(paymentId),
    onSuccess: () => { toast.success('Payment verified.'); qc.invalidateQueries({ queryKey: ['payment', paymentId] }) },
    onError: (e) => toast.error(e.message),
  })
  const reject = useMutation({
    mutationFn: () => paymentApi.reject(paymentId, { notes }),
    onSuccess: () => { toast.success('Payment rejected.'); qc.invalidateQueries({ queryKey: ['payment', paymentId] }) },
    onError: (e) => toast.error(e.message),
  })
  return (
    <div className="max-w-xl">
      <PageHeader title="Payment" />
      <Card className="grid gap-3 p-6">
        <p className="font-display text-3xl tabular">{formatINR(p?.amount)}</p>
        <StatusBadge status={p?.status} />
        <p>{nameOf(p?.tenant)} · {p?.method}</p>
        <p>{formatDate(p?.paymentDate)}</p>
        <p>Reference {p?.transactionReference || '—'}</p>
        <p>{p?.notes || ''}</p>
        {p?.status === 'PENDING' && can(user, PERMISSIONS.VERIFY_PAYMENTS) ? (
          <Button onClick={() => verify.mutate()} loading={verify.isPending}>Verify</Button>
        ) : null}
        {p?.status === 'PENDING' && can(user, PERMISSIONS.REJECT_PAYMENTS) ? (
          <div className="grid gap-2">
            <Textarea placeholder="Rejection notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Button variant="danger" onClick={() => reject.mutate()} loading={reject.isPending}>Reject</Button>
          </div>
        ) : null}
      </Card>
    </div>
  )
}

export function ExpenseListPage() {
  const user = useAuthStore((s) => s.user)
  const propertyId = usePropertyStore((s) => s.currentPropertyId)
  const [category, setCategory] = useState('')
  const query = useQuery({
    queryKey: ['expenses', { propertyId, category }],
    queryFn: () => expenseApi.list({ ...(propertyId ? { propertyId } : {}), ...(category ? { category } : {}) }),
  })
  return (
    <div>
      <PageHeader
        title="Expenses"
        actions={can(user, PERMISSIONS.ADD_EXPENSES) ? <Link to="/expenses/new"><Button>Record expense</Button></Link> : null}
      />
      <Select className="mb-4 max-w-xs" value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="">All categories</option>
        {['ELECTRICITY','WATER','INTERNET','FOOD','MAINTENANCE','SALARY','CLEANING','SUPPLIES','TAX','MARKETING','OTHER'].map((c) => <option key={c}>{c}</option>)}
      </Select>
      <DataTable
        loading={query.isLoading}
        error={query.error}
        rows={query.data || []}
        rowTo={(e) => `/expenses/${e._id}`}
        emptyTitle="No expenses"
        columns={[
          { key: 'amount', header: 'Amount', render: (e) => formatINR(e.amount) },
          { key: 'category', header: 'Category' },
          { key: 'property', header: 'Property', render: (e) => nameOf(e.property) },
          { key: 'expenseDate', header: 'Date', render: (e) => formatDate(e.expenseDate) },
          { key: 'status', header: 'Status', render: (e) => <StatusBadge status={e.status} /> },
        ]}
      />
    </div>
  )
}

export function ExpenseFormPage() {
  const navigate = useNavigate()
  const properties = useQuery({ queryKey: ['properties'], queryFn: propertyApi.list })
  const [form, setForm] = useState({
    propertyId: '',
    category: 'MAINTENANCE',
    amount: '',
    paymentMethod: 'UPI',
    expenseDate: toInputDate(new Date()),
    description: '',
  })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: () => expenseApi.create({ ...form, amount: Number(form.amount) }),
    onSuccess: (e) => { toast.success('Expense recorded successfully.'); navigate(`/expenses/${e._id}`) },
    onError: (e) => setError(e.message),
  })
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Record expense" />
      <Card className="p-6">
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
          <Field label="Property" required>
            <Select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
              <option value="">Select</option>
              {asArray(properties.data).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {['ELECTRICITY','WATER','INTERNET','FOOD','MAINTENANCE','SALARY','CLEANING','SUPPLIES','TAX','MARKETING','OTHER'].map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Amount"><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Payment method">
            <Select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
              {['CASH','UPI','BANK_TRANSFER','CARD','OTHER'].map((m) => <option key={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Date"><Input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} /></Field>
          <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" loading={mutation.isPending}>Save</Button>
        </form>
      </Card>
    </div>
  )
}

export function ExpenseDetailPage() {
  const { expenseId } = useParams()
  const [reason, setReason] = useState('')
  const [voidOpen, setVoidOpen] = useState(false)
  const query = useQuery({ queryKey: ['expense', expenseId], queryFn: () => expenseApi.get(expenseId) })
  const e = query.data
  const voidExp = useMutation({
    mutationFn: () => expenseApi.void(expenseId, { reason }),
    onSuccess: () => { toast.success('Expense voided.'); setVoidOpen(false) },
    onError: (err) => toast.error(err.message),
  })
  return (
    <div className="max-w-xl">
      <PageHeader title="Expense" actions={<Button variant="danger" onClick={() => setVoidOpen(true)}>Void</Button>} />
      <Card className="grid gap-2 p-6">
        <p className="font-display text-3xl">{formatINR(e?.amount)}</p>
        <p>{e?.category} · {e?.paymentMethod}</p>
        <p>{nameOf(e?.property)} · {formatDate(e?.expenseDate)}</p>
        <p>{e?.description || '—'}</p>
        <StatusBadge status={e?.status} />
      </Card>
      <Modal open={voidOpen} title="Void expense" onClose={() => setVoidOpen(false)} footer={
        <>
          <Button variant="secondary" onClick={() => setVoidOpen(false)}>Cancel</Button>
          <Button variant="danger" loading={voidExp.isPending} onClick={() => voidExp.mutate()}>Void</Button>
        </>
      }>
        <Field label="Reason" required><Textarea value={reason} onChange={(ev) => setReason(ev.target.value)} /></Field>
      </Modal>
    </div>
  )
}

export function PaymentSettingsPage() {
  const properties = useQuery({ queryKey: ['properties'], queryFn: propertyApi.list })
  const current = usePropertyStore((s) => s.currentPropertyId)
  const [propertyId, setPropertyId] = useState(current)
  useEffect(() => { if (current) setPropertyId(current) }, [current])
  const settings = useQuery({
    queryKey: ['payment-settings', propertyId],
    queryFn: () => paymentSettingsApi.get(propertyId),
    enabled: Boolean(propertyId),
    retry: false,
  })
  const [form, setForm] = useState({ upiId: '', accountName: '', qrImageUrl: '', paymentInstructions: '', isEnabled: true })
  useEffect(() => {
    if (settings.data) {
      setForm({
        upiId: settings.data.upiId || '',
        accountName: settings.data.accountName || '',
        qrImageUrl: settings.data.qrImageUrl || '',
        paymentInstructions: settings.data.paymentInstructions || '',
        isEnabled: settings.data.isEnabled !== false,
      })
    }
  }, [settings.data])
  const save = useMutation({
    mutationFn: () => {
      const body = { ...form }
      if (settings.isError || !settings.data) return paymentSettingsApi.create(propertyId, body)
      return paymentSettingsApi.update(propertyId, body)
    },
    onSuccess: () => toast.success('Payment settings saved.'),
    onError: (e) => toast.error(e.message),
  })
  return (
    <div className="max-w-xl">
      <PageHeader title="Payment settings" description="UPI collection details per property. No payment gateway is configured in the backend." />
      <Field label="Property">
        <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
          <option value="">Select</option>
          {asArray(properties.data).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </Select>
      </Field>
      {propertyId ? (
        <Card className="mt-4 grid gap-4 p-6">
          <Field label="UPI ID"><Input value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} /></Field>
          <Field label="Account name"><Input value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} /></Field>
          <Field label="QR image URL"><Input value={form.qrImageUrl} onChange={(e) => setForm({ ...form, qrImageUrl: e.target.value })} /></Field>
          <Field label="Instructions"><Textarea value={form.paymentInstructions} onChange={(e) => setForm({ ...form, paymentInstructions: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isEnabled} onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })} />
            Enabled
          </label>
          <div className="flex gap-2">
            <Button onClick={() => save.mutate()} loading={save.isPending}>Save</Button>
            {settings.data ? (
              <>
                <Button variant="secondary" onClick={() => paymentSettingsApi.enable(propertyId).then(() => toast.success('Enabled.'))}>Enable</Button>
                <Button variant="secondary" onClick={() => paymentSettingsApi.disable(propertyId).then(() => toast.success('Disabled.'))}>Disable</Button>
              </>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  )
}
