import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { residentApi } from '../../services/apis'
import { Button, Card, Field, Input, Textarea } from '../../components/ui'
import { ConfirmDialog, Modal } from '../../components/modals/Modal'
import { toast } from '../../store/toastStore'
import { formatDate } from '../../utils/format'
import { todayIndia } from '../../utils/dates'

// Lets a resident give (or withdraw) their move-out notice.
export function MoveOutCard() {
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ['my-tenancy'], queryFn: residentApi.tenancy })
  const [open, setOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const refresh = () => qc.invalidateQueries({ queryKey: ['my-tenancy'] })
  const fail = (e) => toast.error(e.errors?.[0]?.message || e.message)

  const give = useMutation({
    mutationFn: () => residentApi.giveNotice({ expectedMoveOutDate: date, reason }),
    onSuccess: () => { toast.success('Your notice has been sent.'); setOpen(false); refresh() },
    onError: fail,
  })
  const withdraw = useMutation({
    mutationFn: residentApi.withdrawNotice,
    onSuccess: () => { toast.success('Notice withdrawn.'); setWithdrawOpen(false); refresh() },
    onError: fail,
  })

  if (!query.data) return null
  const { tenant, noticePeriodDays, earliestMoveOut } = query.data
  if (tenant.status === 'LEFT') return null
  const earliest = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(earliestMoveOut))
  const short = date && date < earliest

  return (
    <Card className="mt-5 p-6">
      <h2 className="font-display text-xl text-ink-950">Moving out</h2>
      {tenant.status === 'NOTICE_PERIOD' ? (
        <>
          <p className="mt-2 text-sm text-ink-600">You are on notice. Move-out date: <strong className="text-ink-950">{formatDate(tenant.expectedMoveOutDate)}</strong> (notice given {formatDate(tenant.noticeDate)}).</p>
          {tenant.noticeGivenBy === 'TENANT'
            ? <Button className="mt-4" variant="secondary" onClick={() => setWithdrawOpen(true)}>I want to stay</Button>
            : <p className="mt-2 text-xs text-ink-500">The management recorded this notice. Ask them to change it.</p>}
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink-600">The notice period is {noticePeriodDays} days.</p>
          <Button className="mt-4" variant="secondary" onClick={() => { setDate(earliest); setOpen(true) }}>Give notice</Button>
        </>
      )}

      <Modal open={open} title="Give move-out notice" onClose={() => setOpen(false)} footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button loading={give.isPending} disabled={!date} onClick={() => give.mutate()}>Send notice</Button></>}>
        <div className="grid gap-4">
          <Field label="The day you will move out" required><Input type="date" min={todayIndia()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          {short ? <p className="text-sm text-warning">This is earlier than the {noticePeriodDays}-day notice period (earliest full-notice date: {formatDate(earliest)}). Part of your deposit may be held back.</p> : null}
          <Field label="Reason (optional)"><Textarea rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        </div>
      </Modal>
      <ConfirmDialog open={withdrawOpen} title="Withdraw your notice?" description="You will keep your bed and rent continues as before." confirmLabel="Withdraw notice" loading={withdraw.isPending} onClose={() => setWithdrawOpen(false)} onConfirm={() => withdraw.mutate()} />
    </Card>
  )
}
