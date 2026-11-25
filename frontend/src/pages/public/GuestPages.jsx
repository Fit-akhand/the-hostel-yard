import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { publicGuestApi } from '../../services/apis'
import { Button, Card, Field, Input, Skeleton } from '../../components/ui'
import { emptyVisit, VisitFields } from '../../components/guests/VisitFields'
import { toast } from '../../store/toastStore'
import { formatDate } from '../../utils/format'
import { PublicMessage, PublicShell } from './PublicShell'

// Opened by a visitor who scans the QR code at the gate.
export function VisitRequestPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const gate = useQuery({ queryKey: ['visit-gate', code], queryFn: () => publicGuestApi.gate(code), retry: false })
  const [visit, setVisit] = useState(emptyVisit)
  const [residentPhone, setResidentPhone] = useState('')

  const send = useMutation({
    mutationFn: () => publicGuestApi.request(code, { ...visit, residentPhone }),
    onSuccess: ({ token }) => navigate(`/pass/${token}`),
    onError: (e) => toast.error(e.errors?.[0]?.message || e.message),
  })

  if (gate.isLoading) return <PublicShell><Skeleton className="h-64 w-full" /></PublicShell>
  if (gate.isError) return <PublicShell><PublicMessage title="Page not found">{gate.error.message}</PublicMessage></PublicShell>

  return (
    <PublicShell subtitle="Guest pass">
      <Card className="p-5">
        <h1 className="font-display text-2xl text-ink-950">Visiting {gate.data.property.name}?</h1>
        <p className="mt-1 text-sm text-ink-600">Fill this in. The resident you are visiting gets your request and approves it. Then you get a gate code.</p>
        <form className="mt-5 grid gap-4" onSubmit={(e) => { e.preventDefault(); send.mutate() }}>
          <Field label="Mobile number of the resident you are visiting" required>
            <Input value={residentPhone} onChange={(e) => setResidentPhone(e.target.value)} type="tel" inputMode="numeric" placeholder="10 digits" required maxLength={16} />
          </Field>
          <VisitFields value={visit} onChange={setVisit} who="self" />
          <Button type="submit" size="lg" loading={send.isPending}>Ask for approval</Button>
        </form>
      </Card>
    </PublicShell>
  )
}

const PASS_STATES = {
  PENDING: { icon: Clock, tone: 'text-warning', title: 'Waiting for approval', text: 'Keep this page open. It updates by itself when the resident answers. If nothing happens, check the number with them.' },
  APPROVED: { icon: CheckCircle2, tone: 'text-success', title: 'Visit approved', text: 'Show this code at the gate.' },
  CHECKED_IN: { icon: CheckCircle2, tone: 'text-success', title: 'You are checked in', text: 'Show this code again when you leave.' },
  CHECKED_OUT: { icon: CheckCircle2, tone: 'text-ink-500', title: 'Visit finished', text: 'Thank you for visiting.' },
  REJECTED: { icon: XCircle, tone: 'text-danger', title: 'Visit declined', text: 'The resident did not approve this visit.' },
  CANCELLED: { icon: XCircle, tone: 'text-danger', title: 'Pass cancelled', text: 'This pass can no longer be used.' },
  EXPIRED: { icon: XCircle, tone: 'text-ink-500', title: 'Request expired', text: 'This request was for an earlier day. Send a new one at the gate.' },
}

// The visitor's own pass. Refreshes until the resident answers.
export function PassPage() {
  const { token } = useParams()
  const query = useQuery({
    queryKey: ['visit-pass', token],
    queryFn: () => publicGuestApi.pass(token),
    retry: false,
    refetchInterval: (q) => (['PENDING', 'APPROVED', 'CHECKED_IN'].includes(q.state.data?.status) ? 8000 : false),
  })

  if (query.isLoading) return <PublicShell><Skeleton className="h-64 w-full" /></PublicShell>
  if (query.isError && !query.data) return <PublicShell><PublicMessage title="Pass not found">{query.error.message}</PublicMessage></PublicShell>

  const pass = query.data
  const state = PASS_STATES[pass.status] || PASS_STATES.PENDING
  const Icon = state.icon

  return (
    <PublicShell subtitle="Your guest pass">
      <Card className="p-6 text-center">
        <Icon size={44} className={`mx-auto ${state.tone}`} aria-hidden="true" />
        <h1 className="mt-3 font-display text-2xl text-ink-950">{state.title}</h1>
        <p className="mt-1 text-sm text-ink-600">{state.text}</p>

        {pass.code ? (
          <div className="mt-5">
            <div className="mx-auto w-fit rounded-2xl bg-white p-4"><QRCodeSVG value={pass.code} size={150} /></div>
            <p className="tabular mt-3 font-mono text-4xl font-bold tracking-[0.3em] text-ink-950">{pass.code}</p>
          </div>
        ) : null}

        <dl className="mt-6 grid gap-2 border-t border-line pt-4 text-left text-sm">
          {[
            ['Guest', `${pass.visitorName}${pass.guests > 1 ? ` + ${pass.guests - 1}` : ''}`],
            ['Visiting', pass.residentName || null],
            ['Property', [pass.property?.name, pass.property?.city].filter(Boolean).join(', ')],
            ['Date', `${formatDate(pass.visitDate)}${pass.expectedTime ? `, ${pass.expectedTime}` : ''}`],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4"><dt className="text-ink-500">{k}</dt><dd className="text-right font-medium text-ink-950">{v}</dd></div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-ink-400">Save this page's address to open your pass again.</p>
      </Card>
    </PublicShell>
  )
}

// Opened by the resident from the WhatsApp message: approve or decline without signing in.
export function GuestApprovePage() {
  const { token } = useParams()
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ['visit-approval', token], queryFn: () => publicGuestApi.approval(token), retry: false })
  const decide = useMutation({
    mutationFn: (decision) => publicGuestApi.decide(token, { decision }),
    onSuccess: (data) => qc.setQueryData(['visit-approval', token], data),
    onError: (e) => { toast.error(e.message); query.refetch() },
  })

  if (query.isLoading) return <PublicShell><Skeleton className="h-64 w-full" /></PublicShell>
  if (query.isError && !query.data) return <PublicShell><PublicMessage title="Link not available">{query.error.message}</PublicMessage></PublicShell>

  const visit = query.data
  const answered = {
    APPROVED: 'You approved this visit. Your guest now has a gate code.',
    CHECKED_IN: 'Your guest has been checked in at the gate.',
    CHECKED_OUT: 'This visit is finished.',
    REJECTED: 'You declined this visit.',
    CANCELLED: 'This request was cancelled.',
    EXPIRED: 'This request has expired.',
  }[visit.status]

  return (
    <PublicShell subtitle="Guest approval">
      <Card className="p-6">
        <p className="text-sm text-ink-600">Hi {visit.residentName},</p>
        <h1 className="mt-1 font-display text-2xl text-ink-950">{visit.visitorName} wants to visit you</h1>
        <dl className="mt-5 grid gap-2 border-t border-line pt-4 text-sm">
          {[
            ['Mobile', visit.visitorPhone],
            ['Relation', visit.relation],
            ['People', visit.guests],
            ['Date', `${formatDate(visit.visitDate)}${visit.expectedTime ? `, ${visit.expectedTime}` : ''}`],
            ['Purpose', visit.purpose],
            ['Property', visit.propertyName],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4"><dt className="text-ink-500">{k}</dt><dd className="text-right font-medium text-ink-950">{v}</dd></div>
          ))}
        </dl>
        {answered ? (
          <p className="mt-5 rounded-xl border border-line bg-ink-50 p-4 text-center text-sm font-medium text-ink-950">{answered}</p>
        ) : (
          <>
            <p className="mt-4 text-xs text-warning">Approve only if you know this person. Do not forward this link.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button size="lg" variant="secondary" disabled={decide.isPending} onClick={() => decide.mutate('REJECT')}>Decline</Button>
              <Button size="lg" loading={decide.isPending} onClick={() => decide.mutate('APPROVE')}>Approve</Button>
            </div>
          </>
        )}
      </Card>
    </PublicShell>
  )
}
