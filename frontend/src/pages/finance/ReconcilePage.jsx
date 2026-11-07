import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { paymentApi } from '../../services/apis'
import { Badge, Button, Card, PageHeader } from '../../components/ui'
import { toast } from '../../store/toastStore'
import { formatINR, nameOf } from '../../utils/format'
import { asArray } from '../../utils/collections'
import { extractCredits, parseCsv } from '../../utils/bankStatement'
import { matchPayments } from '../../utils/reconcile'

const TONE = { MATCH: 'success', MISMATCH: 'warning', NOT_FOUND: 'danger' }
const LABEL = { MATCH: 'Matches', MISMATCH: 'Amount differs', NOT_FOUND: 'Not on statement' }

// A small made-up statement built from the payments waiting right now, so the screen can be tried without a real file.
const sampleStatement = (payments) => {
  const rows = payments.slice(0, 4).map((p, i) => {
    const amount = i === 3 ? p.amount - 500 : p.amount
    return `01/11/26,"UPI-${String(nameOf(p.tenant)).toUpperCase()}-X@YBL-HDFC0000001-${p.transactionReference}-RENT",000${p.transactionReference},01/11/26,,"${amount}.00","1,00,000.00"`
  })
  rows.push('02/11/26,"UPI-SOMEONE ELSE-X@OKAXIS-SBIN0001234-999999999999-HELLO",0000999999999999,02/11/26,,"1,000.00","1,01,000.00"')
  return `Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance\n${rows.join('\n')}\n`
}

export function ReconcilePage() {
  const qc = useQueryClient()
  const pending = useQuery({ queryKey: ['payments', { status: 'PENDING', method: '' }], queryFn: () => paymentApi.list({ status: 'PENDING' }) })
  const payments = useMemo(() => asArray(pending.data).filter((p) => p.transactionReference), [pending.data])
  const [credits, setCredits] = useState(null)
  const [fileName, setFileName] = useState('')
  const [picked, setPicked] = useState(new Set())
  const [progress, setProgress] = useState(null)

  const outcome = useMemo(() => (credits ? matchPayments({ credits, payments }) : null), [credits, payments])

  const load = (text, name) => {
    try {
      const found = extractCredits(parseCsv(text))
      const { results } = matchPayments({ credits: found, payments })
      setCredits(found)
      setFileName(name)
      setPicked(new Set(results.filter((r) => r.status === 'MATCH').map((r) => r.payment._id)))
      setProgress(null)
    } catch (e) {
      setCredits(null)
      toast.error(e.message)
    }
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (file) load(await file.text(), file.name)
    e.target.value = ''
  }

  const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  async function verifySelected() {
    const ids = [...picked]
    let ok = 0
    const failed = []
    for (const [i, id] of ids.entries()) {
      setProgress({ done: i, total: ids.length })
      try { await paymentApi.verify(id); ok++ } catch (e) { failed.push(e.message) }
    }
    setProgress(null)
    setPicked(new Set())
    qc.invalidateQueries({ queryKey: ['payments'] })
    qc.invalidateQueries({ queryKey: ['rent-dues'] })
    if (failed.length) toast.error(`${ok} verified, ${failed.length} failed: ${failed[0]}`)
    else toast.success(`${ok} payment${ok === 1 ? '' : 's'} verified. Receipts and messages are on their way.`)
  }

  const results = outcome?.results || []
  const matched = results.filter((r) => r.status === 'MATCH').length

  return (
    <div>
      <PageHeader title="Match with bank statement" description="Upload your bank statement and verify every payment that really reached your account, in one click." />

      <Card className="mb-5 grid gap-4 p-6">
        <ol className="grid gap-1.5 text-sm text-ink-600">
          <li><strong className="text-ink-950">1.</strong> In your bank's net banking, download the account statement as <strong>CSV</strong>.</li>
          <li><strong className="text-ink-950">2.</strong> Choose the file below. It is read in your browser and never uploaded.</li>
          <li><strong className="text-ink-950">3.</strong> Check the matches and verify them together.</li>
        </ol>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center rounded-[10px] bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark">
            Choose statement (.csv)
            <input type="file" accept=".csv,.txt,text/csv" className="sr-only" onChange={onFile} />
          </label>
          <Button variant="secondary" disabled={!payments.length} onClick={() => load(sampleStatement(payments), 'Sample statement')}>Try a sample statement</Button>
          <span className="text-sm text-ink-600">{pending.isLoading ? 'Loading…' : `${payments.length} payment${payments.length === 1 ? '' : 's'} waiting to be verified`}</span>
        </div>
      </Card>

      {outcome ? (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-600">
              <strong className="text-ink-950">{fileName}</strong>: {credits.length} credits read, <strong className="text-success">{matched} match</strong>, {results.length - matched} need a look.
            </p>
            <Button loading={Boolean(progress)} disabled={!picked.size} onClick={verifySelected}>
              {progress ? `Verifying ${progress.done + 1} of ${progress.total}…` : `Verify ${picked.size} selected`}
            </Button>
          </div>

          <Card className="mb-6 overflow-x-auto p-0">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-ink-50 text-xs uppercase tracking-[0.12em] text-ink-400">
                <tr><th className="w-10 px-4 py-3" /><th className="px-4 py-3">Tenant</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">UTR</th><th className="px-4 py-3">Bank statement</th><th className="px-4 py-3">Result</th></tr>
              </thead>
              <tbody>
                {results.map(({ payment, status, credit }) => (
                  <tr key={payment._id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand)]" checked={picked.has(payment._id)} disabled={status === 'NOT_FOUND'} onChange={() => toggle(payment._id)} aria-label={`Select ${nameOf(payment.tenant)}`} />
                    </td>
                    <td className="px-4 py-3 font-medium">{nameOf(payment.tenant)}</td>
                    <td className="px-4 py-3 tabular">{formatINR(payment.amount)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{payment.transactionReference}</td>
                    <td className="px-4 py-3 text-xs text-ink-600">{credit ? <>{formatINR(credit.amount)} · {credit.date}</> : '—'}</td>
                    <td className="px-4 py-3"><Badge tone={TONE[status]}>{LABEL[status]}</Badge></td>
                  </tr>
                ))}
                {!results.length ? <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-400">No payments are waiting to be verified.</td></tr> : null}
              </tbody>
            </table>
          </Card>

          {results.some((r) => r.status === 'MISMATCH') ? <p className="mb-6 text-sm text-ink-600">“Amount differs” means the UTR is on your statement but for another amount. Open that payment before verifying it.</p> : null}

          {outcome.unclaimed.length ? (
            <div>
              <h2 className="mb-1 font-display text-xl">Money in that nobody has claimed</h2>
              <p className="mb-3 text-sm text-ink-600">These credits are on your statement but no tenant has submitted a matching payment. A tenant may have paid and forgotten to press “I have paid”.</p>
              <Card className="divide-y divide-line">
                {outcome.unclaimed.slice(0, 30).map((c, i) => (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                    <span className="min-w-0 flex-1 truncate text-ink-600">{c.narration}</span>
                    <span className="text-xs text-ink-400">{c.date}</span>
                    <strong className="tabular">{formatINR(c.amount)}</strong>
                  </div>
                ))}
              </Card>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
