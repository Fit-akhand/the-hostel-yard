import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, MessageCircle, UserPlus, X } from 'lucide-react'
import { myGuestApi } from '../../services/apis'
import { Button, Card, EmptyState, ErrorState, PageHeader, StatusBadge, TableSkeleton } from '../../components/ui'
import { Modal } from '../../components/modals/Modal'
import { emptyVisit, VisitFields } from '../../components/guests/VisitFields'
import { toast } from '../../store/toastStore'
import { formatDate } from '../../utils/format'
import { asArray } from '../../utils/collections'

const when = (p) => `${formatDate(p.visitDate)}${p.expectedTime ? `, ${p.expectedTime}` : ''}${p.guests > 1 ? ` · ${p.guests} people` : ''}`

// The server builds links from FRONTEND_URL; use the address the resident is actually on.
const onThisSite = (link) => {
  try { return `${window.location.origin}${new URL(link).pathname}` } catch { return link }
}

function ShareButtons({ pass }) {
  const link = onThisSite(pass.passUrl)
  const digits = String(pass.visitorPhone || '').replace(/\D/g, '')
  const text = `Hi ${pass.visitorName}, your guest pass for ${formatDate(pass.visitDate)}. Gate code: ${pass.code}. ${link}`
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast.success('Pass copied.') } catch { window.prompt('Copy this', text) }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`https://wa.me/${digits}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
        <Button size="sm"><MessageCircle size={15} /> Share on WhatsApp</Button>
      </a>
      <Button size="sm" variant="secondary" onClick={copy}><Copy size={15} /> Copy</Button>
    </div>
  )
}

export function ResidentGuestsPage() {
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ['my-guests'], queryFn: myGuestApi.list, refetchInterval: 20000 })
  const [open, setOpen] = useState(false)
  const [visit, setVisit] = useState(emptyVisit)
  const refresh = () => qc.invalidateQueries({ queryKey: ['my-guests'] })
  const fail = (e) => { toast.error(e.errors?.[0]?.message || e.message); refresh() }

  const decide = useMutation({
    mutationFn: ({ id, decision }) => myGuestApi.decide(id, { decision }),
    onSuccess: (p) => { toast.success(p.status === 'APPROVED' ? 'Approved. Your guest has a gate code.' : 'Declined.'); refresh() },
    onError: fail,
  })
  const invite = useMutation({
    mutationFn: () => myGuestApi.invite(visit),
    onSuccess: () => { toast.success('Guest pass created. Share it with your guest.'); setOpen(false); setVisit(emptyVisit()); refresh() },
    onError: fail,
  })
  const cancel = useMutation({ mutationFn: myGuestApi.cancel, onSuccess: () => { toast.success('Pass cancelled.'); refresh() }, onError: fail })

  const passes = asArray(query.data?.passes)
  const waiting = passes.filter((p) => p.status === 'PENDING')
  const active = passes.filter((p) => ['APPROVED', 'CHECKED_IN'].includes(p.status))
  const past = passes.filter((p) => !['PENDING', 'APPROVED', 'CHECKED_IN'].includes(p.status))

  return (
    <div>
      <PageHeader
        title="Guests"
        description="Approve people who want to visit you, or invite your own guest."
        actions={<Button onClick={() => setOpen(true)}><UserPlus size={16} /> Invite a guest</Button>}
      />
      {query.isLoading ? <TableSkeleton rows={3} /> : null}
      {query.isError ? <ErrorState message={query.error.message} onRetry={query.refetch} /> : null}

      {waiting.length ? (
        <section className="mb-6 grid gap-3">
          <h2 className="font-display text-xl text-ink-950">Waiting for your answer</h2>
          {waiting.map((p) => (
            <Card key={p._id} className="flex flex-wrap items-center justify-between gap-4 border-brand p-5">
              <div>
                <p className="font-semibold text-ink-950">{p.visitorName}{p.relation ? ` · ${p.relation}` : ''}</p>
                <p className="text-sm text-ink-600">{p.visitorPhone} · {when(p)}</p>
                {p.purpose ? <p className="text-sm text-ink-600">{p.purpose}</p> : null}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={decide.isPending} onClick={() => decide.mutate({ id: p._id, decision: 'REJECT' })}><X size={16} /> Decline</Button>
                <Button disabled={decide.isPending} onClick={() => decide.mutate({ id: p._id, decision: 'APPROVE' })}><Check size={16} /> Approve</Button>
              </div>
            </Card>
          ))}
        </section>
      ) : null}

      {active.length ? (
        <section className="mb-6 grid gap-3">
          <h2 className="font-display text-xl text-ink-950">Approved guests</h2>
          {active.map((p) => (
            <Card key={p._id} className="grid gap-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-950">{p.visitorName}</p>
                  <p className="text-sm text-ink-600">{when(p)}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={p.status} />
                  <p className="tabular mt-1 font-mono text-2xl font-bold tracking-widest text-ink-950">{p.code}</p>
                </div>
              </div>
              {p.status === 'APPROVED' ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <ShareButtons pass={p} />
                  <Button size="sm" variant="ghost" onClick={() => cancel.mutate(p._id)}>Cancel pass</Button>
                </div>
              ) : null}
            </Card>
          ))}
        </section>
      ) : null}

      {past.length ? (
        <section className="grid gap-2">
          <h2 className="font-display text-xl text-ink-950">Earlier</h2>
          <Card className="divide-y divide-line px-5">
            {past.slice(0, 20).map((p) => (
              <div key={p._id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0 truncate"><strong className="text-ink-950">{p.visitorName}</strong> <span className="text-ink-600">· {formatDate(p.visitDate)}</span></span>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </Card>
        </section>
      ) : null}

      {query.data && !passes.length ? <EmptyState title="No guests yet" description="Requests to visit you appear here." /> : null}

      <Modal
        open={open}
        wide
        title="Invite a guest"
        onClose={() => setOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="invite-guest" loading={invite.isPending}>Create pass</Button></>}
      >
        <form id="invite-guest" className="grid gap-4" onSubmit={(e) => { e.preventDefault(); invite.mutate() }}>
          <VisitFields value={visit} onChange={setVisit} />
        </form>
      </Modal>
    </div>
  )
}
