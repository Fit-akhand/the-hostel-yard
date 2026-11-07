import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { announcementApi, allocationApi, complaintApi, gatewayApi, notificationApi, paymentApi, rentApi } from '../../services/apis'
import { Button, Card, Field, Input, PageHeader, Select, StatCard, StatusBadge, Textarea } from '../../components/ui'
import { DataTable } from '../../components/tables/DataTable'
import { toast } from '../../store/toastStore'
import { formatDate, formatINR, nameOf, toInputDate } from '../../utils/format'
import { asArray } from '../../utils/collections'
import { useAuthStore } from '../../store/authStore'
import { useEffect, useState } from 'react'

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
      {nextDue ? (
        <Card className="mt-6 flex flex-wrap items-center justify-between gap-4 border-brand p-5">
          <div>
            <p className="font-display text-xl">Rent for {nextDue.billingMonth} is due</p>
            <p className="text-sm text-ink-600">{formatINR(nextDue.amount - nextDue.paidAmount)} by {formatDate(nextDue.dueDate)}{nextDue.lateFee ? ` · includes late fee ${formatINR(nextDue.lateFee)}` : ''}</p>
          </div>
          <Link to={`/tenant/payments?due=${nextDue._id}`}><Button size="lg">Pay now</Button></Link>
        </Card>
      ) : null}
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
          { key: 'amount', header: 'Amount', render: (d) => <span>{formatINR(d.amount)}{d.lateFee ? <span className="block text-xs text-warning">incl. late fee {formatINR(d.lateFee)}</span> : null}</span> },
          { key: 'paidAmount', header: 'Paid', render: (d) => formatINR(d.paidAmount) },
          { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.status} /> },
          { key: 'dueDate', header: 'Due', render: (d) => formatDate(d.dueDate) },
          { key: 'pay', header: '', render: (d) => (d.status !== 'PAID' && d.amount - d.paidAmount > 0 ? <Link to={`/tenant/payments?due=${d._id}`}><Button size="sm">Pay now</Button></Link> : null) },
        ]}
      />
    </div>
  )
}

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = resolve
    script.onerror = () => reject(new Error('Could not load the payment window. Check your connection.'))
    document.body.appendChild(script)
  })
}

// A UPI link that opens any UPI app with the amount and note filled in. The QR code encodes the same link.
const upiQuery = ({ upiId, name, amount, note }) =>
  new URLSearchParams({ pa: upiId, pn: name || 'Rent', am: String(amount), cu: 'INR', tn: note }).toString()
const upiLink = (details) => `upi://pay?${upiQuery(details)}`

// Each app has its own link scheme, so one tap opens that app with the amount already filled in.
const APP_LINKS = [
  ['Google Pay', 'tez://upi/pay?'],
  ['PhonePe', 'phonepe://pay?'],
  ['Paytm', 'paytmmp://pay?'],
  ['Any UPI app', 'upi://pay?'],
]

export function TenantPaymentsPage() {
  const qc = useQueryClient()
  const history = useQuery({ queryKey: ['tenant-pay-history'], queryFn: () => paymentApi.tenantHistory() })
  const dues = useQuery({ queryKey: ['rent-dues'], queryFn: () => rentApi.dues() })
  const gateway = useQuery({ queryKey: ['gateway-config'], queryFn: gatewayApi.config })
  const [params] = useSearchParams()
  const [form, setForm] = useState({ rentDueId: params.get('due') || '', transactionReference: '' })
  const [paying, setPaying] = useState(false)
  const rows = asArray(history.data, 'payments')
  const openDues = asArray(dues.data).filter((d) => d.status !== 'PAID' && d.amount - d.paidAmount > 0)
  // With only one rent to pay there is nothing to choose: select it.
  useEffect(() => {
    if (!form.rentDueId && openDues.length === 1) setForm((f) => ({ ...f, rentDueId: openDues[0]._id }))
  }, [openDues.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const due = openDues.find((d) => d._id === form.rentDueId)
  const remaining = due ? due.amount - due.paidAmount : 0
  const info = useQuery({ queryKey: ['rent-pay-info', form.rentDueId], queryFn: () => rentApi.paymentInfo(form.rentDueId), enabled: Boolean(form.rentDueId) })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['tenant-pay-history'] })
    qc.invalidateQueries({ queryKey: ['rent-dues'] })
    qc.invalidateQueries({ queryKey: ['tenant-dashboard'] })
  }

  const submit = useMutation({
    mutationFn: () => paymentApi.tenantCreate({ rentDueId: form.rentDueId, amount: remaining, method: 'UPI', transactionReference: form.transactionReference, paymentDate: toInputDate(new Date()) }),
    onSuccess: () => { toast.success('Payment submitted. It will show as paid once the owner verifies it.'); setForm({ ...form, transactionReference: '' }); refresh() },
    onError: (e) => toast.error(e.message),
  })

  async function payOnline() {
    setPaying(true)
    try {
      const [order] = await Promise.all([gatewayApi.createOrder(form.rentDueId), loadCheckout()])
      await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: order.keyId, order_id: order.orderId, amount: order.amountPaise, currency: order.currency,
          name: order.name, description: order.description, prefill: order.prefill, theme: { color: '#dc2626' },
          handler: async (r) => {
            try {
              await gatewayApi.confirm({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature })
              toast.success('Payment received. Thank you!')
              refresh()
              resolve()
            } catch (e) { reject(e) }
          },
          modal: { ondismiss: resolve },
        })
        checkout.on('payment.failed', (r) => reject(new Error(r.error?.description || 'The payment failed.')))
        checkout.open()
      })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setPaying(false)
    }
  }

  const ps = info.data?.paymentSettings || info.data || {}
  const canQr = ps.upiId && remaining > 0
  const details = canQr ? { upiId: ps.upiId, name: ps.accountName, amount: remaining, note: `Rent ${due.billingMonth}` } : null
  const link = canQr ? upiLink(details) : ''

  return (
    <div>
      <PageHeader title="Payments" description="Pay your rent online or with any UPI app, then see it here." />
      <Card className="mb-6 grid gap-4 p-6">
        <h2 className="font-display text-xl">Pay rent</h2>
        {!openDues.length && !dues.isLoading ? <p className="text-sm text-ink-600">You have no rent to pay right now. 🎉</p> : null}
        <Field label="Which rent?">
          <Select value={form.rentDueId} onChange={(e) => setForm({ ...form, rentDueId: e.target.value })}>
            <option value="">Select</option>
            {openDues.map((d) => (
              <option key={d._id} value={d._id}>{d.billingMonth} · {formatINR(d.amount - d.paidAmount)} due{d.lateFee ? ` (incl. late fee ${formatINR(d.lateFee)})` : ''}</option>
            ))}
          </Select>
        </Field>

        {due ? (
          <div className="grid gap-5 md:grid-cols-2">
            {gateway.data?.enabled ? (
              <div className="rounded-xl border border-line p-4">
                <p className="font-medium">Pay online</p>
                <p className="mt-1 text-sm text-ink-600">UPI, card or net banking. Your rent is marked paid right away.</p>
                <Button className="mt-4 w-full" loading={paying} onClick={payOnline}>Pay {formatINR(remaining)}</Button>
              </div>
            ) : null}

            <div className="rounded-xl border border-line p-4">
              <p className="font-medium">Pay with a UPI app</p>
              {canQr ? (
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <div className="rounded-xl bg-white p-3"><QRCodeSVG value={link} size={132} /></div>
                  <div className="min-w-0 text-sm">
                    <p className="text-ink-600">Scan with any UPI app</p>
                    <p className="mt-2 break-all text-ink-600">UPI ID: <strong className="text-ink-950">{ps.upiId}</strong></p>
                    <p className="text-ink-600">Amount: <strong className="text-ink-950">{formatINR(remaining)}</strong></p>
                  </div>
                </div>
              ) : null}
              {canQr ? (
                <div className="mt-4 grid grid-cols-2 gap-2 md:hidden">
                  {APP_LINKS.map(([label, scheme]) => (
                    <a key={label} href={`${scheme}${upiQuery(details)}`} className="rounded-xl border border-line px-3 py-2.5 text-center text-sm font-semibold text-ink-950 transition hover:border-brand hover:text-brand">
                      {label}
                    </a>
                  ))}
                </div>
              ) : null}
              {!canQr ? <p className="mt-2 text-sm text-ink-600">{ps.paymentInstructions || 'Ask the owner for their UPI details.'}</p> : null}
              {!canQr && ps.qrImageUrl ? <img src={ps.qrImageUrl} alt="Payment QR code" className="mx-auto mt-3 w-48 rounded-xl bg-white p-2" /> : null}
              {!canQr && ps.qrImageUrl ? <p className="mt-2 text-center text-xs text-ink-600">This QR does not include the amount. Enter {formatINR(remaining)} in your app.</p> : null}
              {ps.paymentInstructions && canQr ? <p className="mt-3 text-xs text-ink-600">{ps.paymentInstructions}</p> : null}
              <div className="mt-4 grid gap-2">
                <Field label="After paying, enter the 12 digit UPI reference number (UTR)" required>
                  <Input
                    value={form.transactionReference}
                    inputMode="numeric"
                    maxLength={12}
                    placeholder="e.g. 312345678901"
                    onChange={(e) => setForm({ ...form, transactionReference: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                  />
                </Field>
                <p className="-mt-1 text-xs text-ink-600">Find it in your payment app: open the payment and look for "UPI Ref No." or "UTR". The owner checks it against the bank and your rent is marked paid.</p>
                <Button variant="secondary" loading={submit.isPending} disabled={form.transactionReference.length !== 12} onClick={() => submit.mutate()}>I have paid</Button>
              </div>
            </div>
          </div>
        ) : null}
      </Card>

      <DataTable
        rows={Array.isArray(rows) ? rows : []}
        emptyTitle="No payment history"
        columns={[
          { key: 'amount', header: 'Amount', render: (p) => formatINR(p.amount) },
          { key: 'method', header: 'Method' },
          { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
          { key: 'paymentDate', header: 'Date', render: (p) => formatDate(p.paymentDate) },
          { key: 'receipt', header: '', render: (p) => (p.status === 'VERIFIED' ? <Link to={`/tenant/receipts/${p._id}`} className="text-sm text-brand hover:underline">Receipt</Link> : null) },
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
