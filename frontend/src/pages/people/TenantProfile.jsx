import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { depositApi, rentApi } from '../../services/apis'
import { Badge, Button, Card, StatCard, StatusBadge } from '../../components/ui'
import { formatDate, formatINR, nameOf } from '../../utils/format'
import { asArray } from '../../utils/collections'

const dash = (v) => (v === null || v === undefined || v === '' ? '—' : v)

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs uppercase tracking-[0.14em] text-ink-400">{label}</p>
    <div className="mt-1 text-sm text-ink-950">{children}</div>
  </div>
)

const Section = ({ title, action, children }) => (
  <Card className="p-5">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="font-display text-xl text-ink-950">{title}</h2>
      {action}
    </div>
    {children}
  </Card>
)

// "9876543210" -> "919876543210" for a WhatsApp link. Returns null for placeholder or invalid numbers.
const whatsappNumber = (phone) => {
  const d = String(phone || '').replace(/\D/g, '')
  if (d.length === 10 && /^[6-9]/.test(d)) return `91${d}`
  if (d.length === 12 && d.startsWith('91')) return d
  return null
}

// Everything about one tenant on one screen: who they are, where they stay, what they owe and have paid.
export function TenantProfile({ tenant: t, active, dues, payments, complaints, onTab }) {
  const plans = useQuery({ queryKey: ['rent-plans', { tenantId: t._id }], queryFn: () => rentApi.plans({ tenantId: t._id }) })
  const deposit = useQuery({ queryKey: ['deposit', t._id], queryFn: () => depositApi.forTenant(t._id), retry: false })

  const plan = asArray(plans.data).find((p) => p.status === 'ACTIVE')
  const open = dues.filter((d) => ['PENDING', 'PARTIAL', 'OVERDUE'].includes(d.status))
  const outstanding = open.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0)
  const overdue = open.filter((d) => d.status === 'OVERDUE').length
  const nextDue = [...open].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0]
  const verified = payments.filter((p) => p.status === 'VERIFIED')
  const lastPaid = [...verified].sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0]
  const openComplaints = complaints.filter((c) => !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(c.status))
  const wa = whatsappNumber(t.phone)
  const dep = deposit.data

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Rent owed" value={formatINR(outstanding)} hint={outstanding ? `${open.length} unpaid month${open.length === 1 ? '' : 's'}${overdue ? `, ${overdue} overdue` : ''}` : 'All paid up'} />
        <StatCard label="Monthly rent" value={plan ? formatINR(plan.monthlyRent) : '—'} hint={plan ? `Due on the ${plan.dueDay}th` : 'No rent plan yet'} />
        <StatCard label="Security deposit" value={dep ? formatINR(dep.amount) : '—'} hint={dep ? (dep.status === 'HELD' ? 'Held' : `Settled, refunded ${formatINR(dep.settlement?.refundAmount || 0)}`) : 'Not recorded'} />
        <StatCard label="Status" value={<StatusBadge status={t.status} />} hint={`Moved in ${formatDate(t.moveInDate)}`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Personal details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">{t.name}</Field>
            <Field label="Gender">{dash(t.gender)}</Field>
            <Field label="Phone">
              <span>{dash(t.phone)}</span>
              {t.phone ? (
                <span className="ml-3 whitespace-nowrap text-xs">
                  <a href={`tel:${t.phone}`} className="text-brand hover:underline">Call</a>
                  {wa ? <> · <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="text-brand hover:underline">WhatsApp</a></> : null}
                </span>
              ) : null}
            </Field>
            <Field label="E-mail">{dash(t.email)}</Field>
            <Field label="Address">{dash(t.address)}</Field>
            <Field label="App account">{t.user ? <Badge tone="success">Linked</Badge> : <Badge>Not invited</Badge>}</Field>
            <Field label="Emergency contact">
              {t.emergencyContact?.name ? `${t.emergencyContact.name}${t.emergencyContact.relationship ? ` (${t.emergencyContact.relationship})` : ''}` : '—'}
            </Field>
            <Field label="Emergency phone">{dash(t.emergencyContact?.phone)}</Field>
          </div>
        </Section>

        <Section
          title="Stay"
          action={!active && t.status !== 'LEFT' ? <Link to={`/allocations/new?tenantId=${t._id}&propertyId=${t.property?._id || t.property}`}><Button size="sm">Allocate a bed</Button></Link> : null}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Property">{nameOf(t.property)}</Field>
            <Field label="Room and bed">{active ? `Room ${active.room?.roomNumber} · Bed ${active.bed?.bedNumber}` : <span className="text-ink-600">Not in a bed right now</span>}</Field>
            <Field label="Room type">{dash(active?.room?.type)}</Field>
            <Field label="In this bed since">{active ? formatDate(active.startDate) : '—'}</Field>
            <Field label="Moved in">{formatDate(t.moveInDate)}</Field>
            <Field label="Notice given on">{t.noticeDate ? formatDate(t.noticeDate) : '—'}</Field>
            <Field label="Expected move-out">{t.expectedMoveOutDate ? formatDate(t.expectedMoveOutDate) : '—'}</Field>
            <Field label="Moved out on">{t.actualMoveOutDate ? formatDate(t.actualMoveOutDate) : '—'}</Field>
          </div>
        </Section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Rent" action={<button type="button" onClick={() => onTab('rent')} className="text-sm text-brand hover:underline">All rent</button>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Next unpaid rent">{nextDue ? `${nextDue.billingMonth} · ${formatINR(nextDue.amount - nextDue.paidAmount)} (due ${formatDate(nextDue.dueDate)})` : 'Nothing unpaid'}</Field>
            <Field label="Late fees">{nextDue?.lateFee ? formatINR(open.reduce((s, d) => s + (d.lateFee || 0), 0)) : '—'}</Field>
            <Field label="Last payment">{lastPaid ? `${formatINR(lastPaid.amount)} on ${formatDate(lastPaid.paymentDate)}` : '—'}</Field>
            <Field label="Total paid so far">{formatINR(verified.reduce((s, p) => s + p.amount, 0))}</Field>
          </div>
        </Section>

        <Section title="Complaints" action={<button type="button" onClick={() => onTab('complaints')} className="text-sm text-brand hover:underline">All complaints</button>}>
          {openComplaints.length ? (
            <ul className="divide-y divide-line text-sm">
              {openComplaints.slice(0, 4).map((c) => (
                <li key={c._id} className="flex items-center justify-between gap-3 py-2">
                  <Link to={`/complaints/${c._id}`} className="truncate hover:text-brand">{c.title}</Link>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-600">No open complaints.</p>}
        </Section>
      </div>

      <Section title="Recent payments" action={<button type="button" onClick={() => onTab('payments')} className="text-sm text-brand hover:underline">All payments</button>}>
        {payments.length ? (
          <ul className="divide-y divide-line text-sm">
            {[...payments].sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)).slice(0, 5).map((p) => (
              <li key={p._id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span className="tabular font-medium">{formatINR(p.amount)}</span>
                <span className="text-ink-600">{p.method}{p.transactionReference ? ` · ${p.transactionReference}` : ''}</span>
                <span className="text-ink-600">{formatDate(p.paymentDate)}</span>
                <StatusBadge status={p.status} />
                {p.status === 'VERIFIED' ? <Link to={`/receipts/${p._id}`} className="text-xs text-brand hover:underline">Receipt</Link> : null}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink-600">No payments yet.</p>}
      </Section>
    </div>
  )
}
