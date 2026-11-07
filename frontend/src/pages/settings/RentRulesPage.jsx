import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { financeSettingsApi } from '../../services/apis'
import { Button, Card, Field, Input, PageHeader, Select } from '../../components/ui'
import { toast } from '../../store/toastStore'

const MODES = {
  FLAT: ['One fixed fee', 'Charged once after the grace days.'],
  PER_DAY: ['Fee for every late day', 'Grows each day after the grace days.'],
  PERCENT: ['Percent of the rent', 'Charged once after the grace days.'],
}

export function RentRulesPage() {
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ['finance-settings'], queryFn: financeSettingsApi.get })
  const [rule, setRule] = useState(null)

  useEffect(() => { if (query.data) setRule({ ...query.data.lateFee, maxAmount: query.data.lateFee.maxAmount ?? '' }) }, [query.data])

  const save = useMutation({
    mutationFn: () => financeSettingsApi.update({
      lateFee: { enabled: rule.enabled, mode: rule.mode, amount: Number(rule.amount), graceDays: Number(rule.graceDays), maxAmount: rule.maxAmount === '' ? null : Number(rule.maxAmount) },
    }),
    onSuccess: () => { toast.success('Rent rules saved.'); qc.invalidateQueries({ queryKey: ['finance-settings'] }) },
    onError: (e) => toast.error(e.message),
  })

  if (!rule) return <p className="text-sm text-ink-600">{query.isError ? query.error.message : 'Loading…'}</p>
  const set = (k) => (e) => setRule({ ...rule, [k]: e.target.value })
  const unit = rule.mode === 'PERCENT' ? '%' : '₹'
  const example = rule.mode === 'PER_DAY' ? `Rent due on the 5th, paid on the ${5 + Number(rule.graceDays) + 4}th: 4 late days → ₹${Math.min(4 * Number(rule.amount || 0), rule.maxAmount === '' ? Infinity : Number(rule.maxAmount))}.` : null

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Rent rules" description="What happens when rent is paid late." actions={<Button loading={save.isPending} onClick={() => save.mutate()}>Save</Button>} />
      <Card className="grid gap-5 p-6">
        <label className="flex cursor-pointer items-start justify-between gap-4">
          <span>
            <span className="block font-medium text-ink-950">Charge a late fee</span>
            <span className="block text-sm text-ink-600">Added to the rent due by the daily task. Tenants see it in their rent and in reminders.</span>
          </span>
          <input type="checkbox" role="switch" className="mt-1 h-5 w-9 accent-[var(--color-brand)]" checked={rule.enabled} onChange={(e) => setRule({ ...rule, enabled: e.target.checked })} />
        </label>
        <div className={`grid gap-4 ${rule.enabled ? '' : 'pointer-events-none opacity-50'}`}>
          <Field label="How is it charged?">
            <Select value={rule.mode} onChange={set('mode')}>
              {Object.entries(MODES).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
            </Select>
          </Field>
          <p className="-mt-2 text-xs text-ink-600">{MODES[rule.mode][1]}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Fee (${unit})`}><Input type="number" min="0" value={rule.amount} onChange={set('amount')} /></Field>
            <Field label="Grace days after the due date"><Input type="number" min="0" max="30" value={rule.graceDays} onChange={set('graceDays')} /></Field>
          </div>
          <Field label="Never charge more than (₹, optional)"><Input type="number" min="0" value={rule.maxAmount} onChange={set('maxAmount')} placeholder="No limit" /></Field>
          {example ? <p className="text-xs text-ink-600">{example}</p> : null}
        </div>
      </Card>
    </div>
  )
}
