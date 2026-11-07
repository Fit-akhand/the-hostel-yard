import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { payrollApi } from '../../services/apis'
import { Badge, Button, Card, Field, Input, PageHeader, Select } from '../../components/ui'
import { DataTable } from '../../components/tables/DataTable'
import { Modal } from '../../components/modals/Modal'
import { toast } from '../../store/toastStore'
import { formatDate, formatINR } from '../../utils/format'
import { asArray } from '../../utils/collections'
import { monthLabel, thisMonth, todayText } from '../../utils/dates'
import { usePropertyStore } from '../../store/propertyStore'

const Stat = ({ label, value, tone }) => (
  <Card className="p-5">
    <p className="text-xs uppercase tracking-[0.14em] text-ink-400">{label}</p>
    <p className={`mt-1 font-display text-3xl ${tone || 'text-ink-950'}`}>{value}</p>
  </Card>
)

export function PayrollPage() {
  const qc = useQueryClient()
  const current = usePropertyStore((s) => s.currentPropertyId)
  const [month, setMonth] = useState(thisMonth())
  const [payTarget, setPayTarget] = useState(null)
  const [pay, setPay] = useState({ method: 'BANK_TRANSFER', reference: '', paidOn: todayText() })
  const params = { month, ...(current ? { propertyId: current } : {}) }
  const query = useQuery({ queryKey: ['payroll', params], queryFn: () => payrollApi.list(params) })
  const rows = asArray(query.data?.payrolls)
  const summary = query.data?.summary || {}

  const generate = useMutation({
    mutationFn: () => payrollApi.generate(params),
    onSuccess: (r) => {
      toast.success(r.locked ? `Calculated. ${r.locked} already paid, left as they are.` : `Salaries for ${monthLabel(month)} calculated.`)
      qc.invalidateQueries({ queryKey: ['payroll'] })
    },
    onError: (e) => toast.error(e.message),
  })
  const markPaid = useMutation({
    mutationFn: () => payrollApi.pay(payTarget._id, { method: pay.method, reference: pay.reference || null, paidOn: pay.paidOn }),
    onSuccess: () => {
      toast.success('Salary marked as paid and added to expenses.')
      setPayTarget(null)
      qc.invalidateQueries({ queryKey: ['payroll'] })
      qc.invalidateQueries({ queryKey: ['expenses'] })
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Salaries are worked out from attendance, advances, deductions and bonuses."
        actions={<Button loading={generate.isPending} onClick={() => generate.mutate()}>{rows.length ? 'Recalculate salaries' : 'Calculate salaries'}</Button>}
      />
      <div className="mb-4 max-w-xs"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Stat label="Total salaries" value={formatINR(summary.totalNet || 0)} />
        <Stat label="Paid" value={formatINR(summary.paid || 0)} tone="text-success" />
        <Stat label="Still to pay" value={formatINR(summary.pending || 0)} tone={summary.pending ? 'text-warning' : undefined} />
      </div>
      <DataTable
        loading={query.isLoading}
        error={query.error}
        rows={rows}
        emptyTitle={`No salaries for ${monthLabel(month)}`}
        emptyDescription="Use Calculate salaries to create them from attendance."
        columns={[
          { key: 'employee', header: 'Employee', render: (p) => <div><p className="font-medium">{p.employee?.name}</p><p className="text-xs text-ink-600">{p.employee?.designation}</p></div> },
          { key: 'payableDays', header: 'Days', render: (p) => `${p.payableDays} / ${p.daysInMonth}` },
          { key: 'grossPay', header: 'Earned', render: (p) => formatINR(p.grossPay) },
          { key: 'adj', header: 'Adjustments', render: (p) => <span className="text-xs">{p.bonus ? `+${formatINR(p.bonus)} ` : ''}{p.deductions ? `-${formatINR(p.deductions)} ` : ''}{p.advanceRecovered ? `advance -${formatINR(p.advanceRecovered)}` : ''}{!p.bonus && !p.deductions && !p.advanceRecovered ? '—' : ''}</span> },
          { key: 'netPay', header: 'Net pay', render: (p) => <strong>{formatINR(p.netPay)}</strong> },
          { key: 'status', header: 'Status', render: (p) => <Badge tone={p.status === 'PAID' ? 'success' : 'warning'}>{p.status === 'PAID' ? 'Paid' : 'To pay'}</Badge> },
          {
            key: 'actions', header: '',
            render: (p) => (
              <div className="flex justify-end gap-3 text-sm">
                <Link to={`/payroll/${p._id}`} className="text-brand hover:underline" onClick={(e) => e.stopPropagation()}>Slip</Link>
                {p.status === 'DRAFT' ? <button type="button" className="font-semibold text-brand hover:underline" onClick={(e) => { e.stopPropagation(); setPayTarget(p) }}>Pay</button> : null}
              </div>
            ),
          },
        ]}
      />
      <p className="mt-3 text-xs text-ink-600">Paid salaries are locked. Recalculating only changes the ones still to pay, so add attendance or advances first.</p>

      <Modal open={Boolean(payTarget)} onClose={() => setPayTarget(null)} title={`Pay ${payTarget?.employee?.name || ''}`}>
        <div className="grid gap-4">
          <p className="text-sm text-ink-600">Net salary for {monthLabel(month)}: <strong className="text-ink-950">{formatINR(payTarget?.netPay || 0)}</strong>. It is saved as a Salary expense.</p>
          <Field label="Paid by">
            <Select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>
              <option value="BANK_TRANSFER">Bank transfer</option><option value="UPI">UPI</option><option value="CASH">Cash</option><option value="OTHER">Other</option>
            </Select>
          </Field>
          <Field label="Reference (optional)"><Input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} /></Field>
          <Field label="Paid on"><Input type="date" value={pay.paidOn} max={todayText()} onChange={(e) => setPay({ ...pay, paidOn: e.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPayTarget(null)}>Cancel</Button>
            <Button loading={markPaid.isPending} onClick={() => markPaid.mutate()}>Mark as paid</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

const Line = ({ label, value, strong, minus }) => (
  <div className={`flex justify-between py-2 ${strong ? 'border-t border-ink-300 text-base font-bold' : 'text-sm'}`}>
    <span>{label}</span>
    <span>{minus ? '− ' : ''}{formatINR(value)}</span>
  </div>
)

export function PayslipPage() {
  const { id } = useParams()
  const query = useQuery({ queryKey: ['payroll-slip', id], queryFn: () => payrollApi.get(id) })
  if (query.isLoading) return <p className="text-sm text-ink-600">Loading…</p>
  if (query.error) return <p className="text-sm text-danger">{query.error.message}</p>
  const p = query.data
  const earned = p.payType === 'DAILY' ? `${p.payableDays} days × ${formatINR(p.baseSalary)}` : `${p.payableDays} of ${p.daysInMonth} days`

  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-print mb-4 flex justify-between">
        <Link to="/payroll" className="text-sm text-brand hover:underline">← Back to payroll</Link>
        <Button onClick={() => window.print()}>Print / save as PDF</Button>
      </div>
      <Card className="p-8">
        <div className="flex items-start justify-between border-b border-line pb-5">
          <div>
            <h1 className="font-display text-2xl">Salary slip</h1>
            <p className="text-sm text-ink-600">{monthLabel(p.month)}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold">THE HOSTEL YARD</p>
            <p className="text-ink-600">{p.property?.name}{p.property?.city ? `, ${p.property.city}` : ''}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-4 py-5 text-sm">
          <div><dt className="text-ink-400">Employee</dt><dd className="font-medium">{p.employee?.name}</dd></div>
          <div><dt className="text-ink-400">Role</dt><dd className="font-medium">{p.employee?.designation}</dd></div>
          <div><dt className="text-ink-400">Joined</dt><dd className="font-medium">{p.employee?.joinDate ? formatDate(p.employee.joinDate) : '—'}</dd></div>
          <div><dt className="text-ink-400">Attendance</dt><dd className="font-medium">{p.presentDays} present · {p.halfDays} half · {p.absentDays} absent · {p.paidLeaves} leave</dd></div>
        </dl>
        <div className="divide-y divide-line rounded-xl border border-line px-4">
          <Line label={`Earned (${earned})`} value={p.grossPay} />
          {p.bonus ? <Line label="Bonus / incentive" value={p.bonus} /> : null}
          {p.deductions ? <Line label="Deductions" value={p.deductions} minus /> : null}
          {p.advanceRecovered ? <Line label="Advance recovered" value={p.advanceRecovered} minus /> : null}
          <Line label="Net pay" value={p.netPay} strong />
        </div>
        <p className="mt-5 text-sm text-ink-600">
          {p.status === 'PAID' ? `Paid on ${formatDate(p.paidOn)} by ${String(p.paymentMethod).replace('_', ' ').toLowerCase()}${p.reference ? ` (ref ${p.reference})` : ''}.` : 'Not paid yet. This is a draft calculation.'}
        </p>
      </Card>
    </div>
  )
}
