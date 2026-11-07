import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { receiptApi } from '../../services/apis'
import { Button, Card } from '../../components/ui'
import { formatDate, formatINR } from '../../utils/format'
import { monthLabel } from '../../utils/dates'
import { useAuthStore } from '../../store/authStore'

const Row = ({ label, value, strong }) => (
  <div className={`flex justify-between gap-6 py-2 text-sm ${strong ? 'border-t border-ink-300 text-base font-bold' : ''}`}>
    <span className="text-ink-600">{label}</span>
    <span className="text-right">{value}</span>
  </div>
)

// Shared by staff (/receipts/:paymentId) and tenants (/tenant/receipts/:paymentId).
export function ReceiptPage() {
  const { paymentId } = useParams()
  const user = useAuthStore((s) => s.user)
  const query = useQuery({ queryKey: ['receipt', paymentId], queryFn: () => receiptApi.get(paymentId) })
  const back = user?.role === 'TENANT' ? '/tenant/payments' : `/payments/${paymentId}`

  if (query.isLoading) return <p className="text-sm text-ink-600">Loading…</p>
  if (query.error) return <p className="text-sm text-danger">{query.error.message}</p>
  const r = query.data

  return (
    <div className="mx-auto max-w-xl">
      <div className="no-print mb-4 flex justify-between">
        <Link to={back} className="text-sm text-brand hover:underline">← Back</Link>
        <Button onClick={() => window.print()}>Print / save as PDF</Button>
      </div>
      <Card className="p-8">
        <div className="flex items-start justify-between border-b border-line pb-5">
          <div>
            <h1 className="font-display text-2xl">Rent receipt</h1>
            <p className="text-sm text-ink-600">No. {r.receiptNumber}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold uppercase">{r.organization}</p>
            <p className="text-ink-600">{r.property?.name}</p>
            <p className="text-ink-600">{[r.property?.address, r.property?.city].filter(Boolean).join(', ')}</p>
          </div>
        </div>

        <p className="mt-5 text-sm text-ink-600">Received with thanks from</p>
        <p className="font-display text-xl">{r.tenant?.name}</p>

        <div className="mt-4 divide-y divide-line rounded-xl border border-line px-4">
          <Row label="Rent for" value={r.billingMonth ? monthLabel(r.billingMonth) : '—'} />
          <Row label="Rent amount" value={formatINR(r.rentAmount)} />
          {r.lateFee ? <Row label="Late fee" value={formatINR(r.lateFee)} /> : null}
          <Row label="Paid on" value={formatDate(r.paymentDate)} />
          <Row label="Paid by" value={`${String(r.method).toLowerCase()}${r.reference ? ` · ref ${r.reference}` : ''}`} />
          <Row label="Amount received" value={formatINR(r.amount)} strong />
        </div>

        <p className="mt-4 text-sm text-ink-600">
          {r.balanceAfter > 0 ? `Balance still due for this month: ${formatINR(r.balanceAfter)}.` : 'This month’s rent is fully paid.'}
        </p>
        {r.receivedBy ? <p className="mt-6 text-right text-xs text-ink-400">Verified by {r.receivedBy}</p> : null}
        <p className="mt-6 border-t border-line pt-3 text-center text-xs text-ink-400">This is a computer generated receipt.</p>
      </Card>
    </div>
  )
}
