import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { depositApi } from '../../services/apis'
import { Badge, Button, Card, Field, Input, PageHeader, Select } from '../../components/ui'
import { DataTable } from '../../components/tables/DataTable'
import { Modal } from '../../components/modals/Modal'
import { toast } from '../../store/toastStore'
import { formatDate, formatINR } from '../../utils/format'
import { asArray } from '../../utils/collections'
import { todayText } from '../../utils/dates'

const METHODS = [['CASH', 'Cash'], ['UPI', 'UPI'], ['BANK_TRANSFER', 'Bank transfer'], ['OTHER', 'Other']]
const label = (m) => (METHODS.find(([k]) => k === m) || [])[1] || m

const Line = ({ label: text, value, strong, tone }) => (
  <div className={`flex justify-between gap-6 py-2.5 text-sm ${strong ? 'border-t border-ink-300 text-base font-bold' : ''}`}>
    <span className={strong ? '' : 'text-ink-600'}>{text}</span>
    <span className={tone}>{value}</span>
  </div>
)

// ------------------------------------------------- deposit tab on the tenant page

export function DepositPanel({ tenant }) {
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ['deposit', tenant._id], queryFn: () => depositApi.forTenant(tenant._id) })
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ amount: '', receivedOn: todayText(), method: 'CASH', notes: '' })
  const deposit = query.data

  const save = useMutation({
    mutationFn: () => depositApi.save(tenant._id, { amount: Number(form.amount), receivedOn: form.receivedOn, method: form.method, notes: form.notes || null }),
    onSuccess: () => { toast.success('Deposit saved.'); setOpen(false); qc.invalidateQueries({ queryKey: ['deposit', tenant._id] }); qc.invalidateQueries({ queryKey: ['deposits'] }) },
    onError: (e) => toast.error(e.message),
  })

  const startEdit = () => {
    setForm({ amount: deposit ? String(deposit.amount) : '', receivedOn: deposit?.receivedOn || todayText(), method: deposit?.method || 'CASH', notes: deposit?.notes || '' })
    setOpen(true)
  }

  if (query.isLoading) return <p className="text-sm text-ink-600">Loading…</p>
  if (query.error) return <p className="text-sm text-danger">{query.error.message}</p>

  const s = deposit?.settlement
  return (
    <Card className="p-6">
      {!deposit ? (
        <div className="text-center">
          <p className="font-display text-xl">No security deposit recorded</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-600">Record what {tenant.name} paid when moving in, so it can be returned or adjusted when they leave.</p>
          <Button className="mt-4" onClick={startEdit}>Record deposit</Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-ink-400">Security deposit</p>
              <p className="font-display text-3xl">{formatINR(deposit.amount)}</p>
              <p className="text-sm text-ink-600">Received {formatDate(deposit.receivedOn)} by {label(deposit.method).toLowerCase()}{deposit.notes ? ` · ${deposit.notes}` : ''}</p>
            </div>
            <Badge tone={deposit.status === 'HELD' ? 'warning' : 'success'}>{deposit.status === 'HELD' ? 'Held' : 'Settled'}</Badge>
          </div>

          {deposit.status === 'HELD' ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={startEdit}>Edit</Button>
              {tenant.status === 'ACTIVE'
                ? <p className="text-sm text-ink-600">To settle the deposit, first start the notice period or move the tenant out.</p>
                : <Link to={`/tenants/${tenant._id}/settlement`}><Button>Settle and refund</Button></Link>}
            </div>
          ) : (
            <div className="mt-5 divide-y divide-line rounded-xl border border-line px-4">
              <Line label="Settled on" value={formatDate(s.settledOn)} />
              <Line label="Unpaid rent taken from deposit" value={formatINR(s.rentAdjusted)} />
              {asArray(s.deductions).map((d, i) => <Line key={i} label={d.reason} value={`− ${formatINR(d.amount)}`} />)}
              <Line label={`Refunded${s.refundMethod ? ` (${label(s.refundMethod).toLowerCase()})` : ''}`} value={formatINR(s.refundAmount)} strong tone="text-success" />
              {s.stillOwed > 0 ? <Line label="Still owed by tenant" value={formatINR(s.stillOwed)} tone="text-danger" /> : null}
            </div>
          )}
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Security deposit">
        <div className="grid gap-4">
          <Field label="Amount (₹)" required><Input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Received on"><Input type="date" value={form.receivedOn} onChange={(e) => setForm({ ...form, receivedOn: e.target.value })} /></Field>
            <Field label="Paid by"><Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>{METHODS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          </div>
          <Field label="Note"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={save.isPending} disabled={!form.amount} onClick={() => save.mutate()}>Save</Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}

// ---------------------------------------------------------- move-out settlement

export function SettlementPage() {
  const { tenantId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [deductions, setDeductions] = useState([])
  const [draft, setDraft] = useState({ reason: '', amount: '' })
  const [refundMethod, setRefundMethod] = useState('CASH')
  const [settledOn, setSettledOn] = useState(todayText())

  const preview = useQuery({
    queryKey: ['settlement-preview', tenantId, JSON.stringify(deductions)],
    queryFn: () => depositApi.preview(tenantId, deductions),
    placeholderData: (previous) => previous,
  })
  const settle = useMutation({
    mutationFn: () => depositApi.settle(tenantId, { deductions, refundMethod, settledOn }),
    onSuccess: () => {
      toast.success('Deposit settled.')
      qc.invalidateQueries({ queryKey: ['deposit', tenantId] })
      qc.invalidateQueries({ queryKey: ['rent-dues'] })
      qc.invalidateQueries({ queryKey: ['payments'] })
      navigate(`/tenants/${tenantId}`)
    },
    onError: (e) => toast.error(e.message),
  })

  if (preview.isLoading) return <p className="text-sm text-ink-600">Loading…</p>
  if (preview.error) return <p className="text-sm text-danger">{preview.error.message}</p>
  const p = preview.data

  const addDeduction = () => {
    setDeductions([...deductions, { reason: draft.reason.trim(), amount: Number(draft.amount) }])
    setDraft({ reason: '', amount: '' })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`Settle deposit: ${p.tenant.name}`} description="Unpaid rent and any damages are taken from the deposit. The rest is returned." />
      <Card className="grid gap-5 p-6">
        <div className="divide-y divide-line rounded-xl border border-line px-4">
          <Line label="Security deposit held" value={formatINR(p.deposit.amount)} />
          {asArray(p.dues).map((d) => (
            <Line key={d._id} label={`Unpaid rent ${d.billingMonth}${d.lateFee ? ` (incl. late fee ${formatINR(d.lateFee)})` : ''}`} value={`− ${formatINR(d.amount - d.paidAmount)}`} />
          ))}
          {!asArray(p.dues).length ? <Line label="Unpaid rent" value="None" /> : null}
          {deductions.map((d, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-2.5 text-sm">
              <span className="text-ink-600">{d.reason}</span>
              <span>− {formatINR(d.amount)} <button type="button" className="ml-2 text-xs text-danger hover:underline" onClick={() => setDeductions(deductions.filter((_, k) => k !== i))}>Remove</button></span>
            </div>
          ))}
          <Line label="Refund to tenant" value={formatINR(p.refundAmount)} strong tone="text-success" />
          {p.stillOwed > 0 ? <Line label="Still owed by tenant after the deposit" value={formatINR(p.stillOwed)} tone="text-danger" /> : null}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-ink-950">Other deductions (damages, lost keys…)</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
            <Input placeholder="Reason" value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} />
            <Input type="number" min="1" placeholder="₹" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
            <Button variant="secondary" disabled={draft.reason.trim().length < 2 || !(Number(draft.amount) > 0)} onClick={addDeduction}>Add</Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Refund paid by"><Select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>{METHODS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field label="Settled on"><Input type="date" value={settledOn} max={todayText()} onChange={(e) => setSettledOn(e.target.value)} /></Field>
        </div>

        <div className="flex justify-end gap-2">
          <Link to={`/tenants/${tenantId}`}><Button variant="secondary">Cancel</Button></Link>
          <Button loading={settle.isPending} onClick={() => settle.mutate()}>Confirm settlement</Button>
        </div>
        <p className="text-xs text-ink-600">Rent taken from the deposit is recorded as a payment, so the tenant's rent and your reports stay correct. This cannot be undone.</p>
      </Card>
    </div>
  )
}

// ------------------------------------------------------------------ all deposits

export function DepositListPage() {
  const query = useQuery({ queryKey: ['deposits'], queryFn: () => depositApi.list() })
  const rows = asArray(query.data)
  const held = rows.filter((d) => d.status === 'HELD').reduce((t, d) => t + d.amount, 0)

  return (
    <div>
      <PageHeader title="Security deposits" description={`${formatINR(held)} currently held for tenants.`} />
      <DataTable
        loading={query.isLoading}
        error={query.error}
        rows={rows}
        rowTo={(d) => `/tenants/${d.tenant?._id}`}
        emptyTitle="No deposits recorded"
        emptyDescription="Open a tenant and use the Deposit tab to record one."
        columns={[
          { key: 'tenant', header: 'Tenant', render: (d) => d.tenant?.name },
          { key: 'property', header: 'Property', render: (d) => d.property?.name },
          { key: 'amount', header: 'Deposit', render: (d) => formatINR(d.amount) },
          { key: 'receivedOn', header: 'Received', render: (d) => formatDate(d.receivedOn) },
          { key: 'status', header: 'Status', render: (d) => <Badge tone={d.status === 'HELD' ? 'warning' : 'success'}>{d.status === 'HELD' ? 'Held' : `Refunded ${formatINR(d.settlement?.refundAmount || 0)}`}</Badge> },
        ]}
      />
    </div>
  )
}
