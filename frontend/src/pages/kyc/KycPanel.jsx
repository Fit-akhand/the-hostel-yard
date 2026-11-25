import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, FileSignature, Link2, MessageCircle } from 'lucide-react'
import { documentApi, kycApi } from '../../services/apis'
import { Button, Card, ErrorState, Field, Input, Select, StatusBadge, TableSkeleton, Textarea } from '../../components/ui'
import { Modal } from '../../components/modals/Modal'
import { DocumentBody } from '../../components/docs/DocumentView'
import { kycBody, kycForm, KycFields } from '../../components/docs/KycFields'
import { KycUploads } from '../../components/docs/KycUploads'
import { useAuthStore } from '../../store/authStore'
import { can } from '../../config/authz'
import { PERMISSIONS } from '../../config/permissions'
import { toast } from '../../store/toastStore'
import { formatDate, toInputDate } from '../../utils/format'
import { asArray } from '../../utils/collections'

const fail = (e) => toast.error(e.errors?.[0]?.message || e.message)

function LinkBox({ tenant }) {
  const [link, setLink] = useState(null)
  const [send, setSend] = useState(false)
  const create = useMutation({
    mutationFn: () => kycApi.link(tenant._id, { send }),
    onSuccess: (data) => {
      // The server builds links from FRONTEND_URL; use the address you are working on.
      const url = `${window.location.origin}${new URL(data.url, window.location.origin).pathname}`
      setLink({ ...data, url })
      const sent = data.sent.filter((s) => s.status === 'SENT').map((s) => s.channel.toLowerCase())
      if (send) { if (sent.length) toast.success(`Sent by ${sent.join(', ')}.`); else toast.warning('Not sent automatically. Use the buttons to share it.') }
    },
    onError: fail,
  })
  const digits = String(tenant.phone || '').replace(/\D/g, '')
  const number = digits.length === 10 && /^[6-9]/.test(digits) ? `91${digits}` : digits.length === 12 ? digits : ''
  const message = link ? `Hi ${tenant.name}, please fill in your resident form, upload your ID and sign here: ${link.url}` : ''

  return (
    <Card className="grid gap-3 p-5">
      <h2 className="font-display text-xl text-ink-950">Private link for the resident</h2>
      <p className="text-sm text-ink-600">They fill the form, upload ID and sign on their phone. No app account needed. A new link switches off the old one; it works for 14 days.</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button loading={create.isPending} onClick={() => create.mutate()}><Link2 size={16} /> {link ? 'New link' : 'Create link'}</Button>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[var(--color-brand)]" checked={send} onChange={(e) => setSend(e.target.checked)} /> Also send it automatically</label>
      </div>
      {link ? (
        <div className="grid gap-3 rounded-xl border border-line p-4">
          <input readOnly value={link.url} onFocus={(e) => e.target.select()} aria-label="Private link" className="w-full rounded-lg border border-line bg-ink-50 px-3 py-2 text-xs text-ink-700" />
          <div className="flex flex-wrap gap-2">
            <a href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"><Button size="sm"><MessageCircle size={15} /> Send on WhatsApp</Button></a>
            <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(link.url).then(() => toast.success('Link copied.'), () => window.prompt('Copy this link', link.url))}><Copy size={15} /> Copy</Button>
          </div>
          {!link.hasValidPhone ? <p className="text-xs text-warning">No real mobile number is saved for this resident. Add it, or share the link yourself.</p> : null}
        </div>
      ) : null}
    </Card>
  )
}

const TERM_FIELDS = [
  ['startDate', 'Start date', 'date'], ['durationMonths', 'Months', 'number'], ['monthlyRent', 'Monthly rent (₹)', 'number'],
  ['deposit', 'Security deposit (₹)', 'number'], ['dueDay', 'Rent due day (1–28)', 'number'], ['lockInMonths', 'Lock-in months', 'number'],
  ['noticePeriodDays', 'Notice days', 'number'], ['roomNumber', 'Room', 'text'], ['bedNumber', 'Bed', 'text'],
]

function AgreementModal({ open, onClose, tenantId, onDone }) {
  const [terms, setTerms] = useState(null)
  const [preview, setPreview] = useState(null)
  const first = useQuery({ queryKey: ['agreement-defaults', tenantId], queryFn: () => kycApi.previewAgreement(tenantId), enabled: open, gcTime: 0 })
  useEffect(() => { if (open && first.data) { setTerms(first.data.terms); setPreview(null) } }, [open, first.data])
  const look = useMutation({ mutationFn: () => kycApi.previewAgreement(tenantId, terms), onSuccess: setPreview, onError: fail })
  const create = useMutation({
    mutationFn: () => kycApi.createAgreement(tenantId, terms),
    onSuccess: () => { toast.success('Agreement is ready. The resident can sign it now.'); onDone(); onClose() },
    onError: fail,
  })

  return (
    <Modal open={open} wide title="New agreement" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="secondary" disabled={!terms} loading={look.isPending} onClick={() => look.mutate()}>Preview</Button><Button disabled={!terms} loading={create.isPending} onClick={() => create.mutate()}>Send for signing</Button></>}>
      {first.isError ? <p className="text-sm text-danger">{first.error.message}</p> : null}
      {!terms ? <TableSkeleton rows={3} /> : (
        <div className="grid gap-4">
          {first.data?.templateIsDefault ? <p className="text-sm text-warning">This uses the standard wording. <Link to="/document-templates" className="underline">Put in your own agreement text</Link> first if you have one.</p> : null}
          <div className="grid gap-3 sm:grid-cols-3">
            {TERM_FIELDS.map(([key, label, type]) => <Field key={key} label={label}><Input type={type} min={type === 'number' ? 0 : undefined} value={terms[key]} onChange={(e) => { setTerms({ ...terms, [key]: e.target.value }); setPreview(null) }} /></Field>)}
            <Field label="Sharing"><Select value={terms.roomType} onChange={(e) => { setTerms({ ...terms, roomType: e.target.value }); setPreview(null) }}><option value="">—</option><option value="SINGLE">Single</option><option value="DOUBLE">Double</option><option value="TRIPLE">Triple</option><option value="DORMITORY">Dormitory</option></Select></Field>
          </div>
          {preview ? <div className="max-h-80 overflow-y-auto rounded-xl border border-line p-4"><DocumentBody body={preview.body} /></div> : <p className="text-xs text-ink-500">Press Preview to read the full text. Blank lines (________) mean a detail is missing.</p>}
        </div>
      )}
    </Modal>
  )
}

function Police({ tenantId, police, editable, onDone }) {
  const [form, setForm] = useState(null)
  useEffect(() => {
    setForm({ status: police.status || 'NOT_STARTED', station: police.station || '', referenceNumber: police.referenceNumber || '', submittedOn: police.submittedOn ? toInputDate(police.submittedOn) : '', verifiedOn: police.verifiedOn ? toInputDate(police.verifiedOn) : '', notes: police.notes || '' })
  }, [police])
  const save = useMutation({ mutationFn: () => kycApi.police(tenantId, form), onSuccess: () => { toast.success('Police verification saved.'); onDone() }, onError: fail })
  if (!form) return null
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-display text-xl text-ink-950">Police verification</h2><StatusBadge status={police.status || 'NOT_STARTED'} /></div>
      <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
        <Field label="Status"><Select value={form.status} onChange={set('status')} disabled={!editable}><option value="NOT_STARTED">Not started</option><option value="SUBMITTED">Submitted to police</option><option value="VERIFIED">Verified</option></Select></Field>
        <Field label="Police station"><Input value={form.station} onChange={set('station')} disabled={!editable} /></Field>
        <Field label="Reference number"><Input value={form.referenceNumber} onChange={set('referenceNumber')} disabled={!editable} /></Field>
        <Field label="Submitted on"><Input type="date" value={form.submittedOn} onChange={set('submittedOn')} disabled={!editable} /></Field>
        <Field label="Verified on"><Input type="date" value={form.verifiedOn} onChange={set('verifiedOn')} disabled={!editable} /></Field>
        <Field label="Notes"><Input value={form.notes} onChange={set('notes')} disabled={!editable} /></Field>
        {editable ? <div className="sm:col-span-3"><Button type="submit" variant="secondary" loading={save.isPending}>Save</Button></div> : null}
      </form>
    </Card>
  )
}

// Owner / manager view of one resident's form, ID, police verification and agreements.
export function KycPanel({ tenant }) {
  const id = tenant._id
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const editable = can(user, PERMISSIONS.EDIT_TENANTS) || can(user, PERMISSIONS.MANAGE_DOCUMENTS)
  const query = useQuery({ queryKey: ['kyc', id], queryFn: () => kycApi.get(id), refetchOnWindowFocus: false })
  const docs = useQuery({ queryKey: ['documents', { tenantId: id }], queryFn: () => documentApi.list({ tenantId: id }) })
  const [form, setForm] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [editing, setEditing] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [agreementOpen, setAgreementOpen] = useState(false)
  const details = query.data?.details
  useEffect(() => { if (details && !dirty) setForm(kycForm(details)) }, [details, dirty])
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['kyc', id] })
    qc.invalidateQueries({ queryKey: ['documents'] })
    qc.invalidateQueries({ queryKey: ['tenant', id] })
  }

  const save = useMutation({ mutationFn: () => kycApi.save(id, kycBody(form)), onSuccess: () => { setDirty(false); setEditing(false); toast.success('Resident form saved.'); refresh() }, onError: fail })
  const review = useMutation({
    mutationFn: (body) => kycApi.review(id, body),
    onSuccess: (data) => { toast.success(data.status === 'VERIFIED' ? 'Verified.' : 'Sent back to the resident.'); setRejectOpen(false); setReason(''); refresh() },
    onError: fail,
  })

  if (query.isLoading) return <TableSkeleton rows={4} />
  if (query.isError) return <ErrorState message={query.error.message} onRetry={query.refetch} />
  const kyc = query.data
  const documents = asArray(docs.data)
  const openAgreement = documents.some((d) => d.kind === 'AGREEMENT' && ['SENT', 'TENANT_SIGNED'].includes(d.status))

  return (
    <div className="grid gap-5">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-3"><h2 className="font-display text-xl text-ink-950">Resident form</h2><StatusBadge status={kyc.status} /></div>
          <p className="mt-1 text-sm text-ink-600">
            {kyc.status === 'SUBMITTED' ? `Submitted ${formatDate(kyc.submittedAt)}. Check the details and ID, then verify.` : null}
            {kyc.status === 'VERIFIED' ? `Verified ${formatDate(kyc.reviewedAt)}.` : null}
            {kyc.status === 'REJECTED' ? `Sent back: ${kyc.rejectionReason}` : null}
            {kyc.status === 'NOT_STARTED' ? (kyc.missing.length ? `Missing: ${kyc.missing.join(', ')}.` : 'All details are in. Waiting for the resident to sign, or verify it yourself.') : null}
          </p>
        </div>
        {editable ? (
          <div className="flex flex-wrap gap-2">
            {kyc.status !== 'VERIFIED' ? <Button loading={review.isPending} onClick={() => review.mutate({ decision: 'VERIFIED' })}>Verify</Button> : null}
            {['SUBMITTED', 'VERIFIED'].includes(kyc.status) ? <Button variant="secondary" onClick={() => setRejectOpen(true)}>Ask for a fix</Button> : null}
          </div>
        ) : null}
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-ink-950">Agreements and signed forms</h2>
          {editable && tenant.status !== 'LEFT' && !openAgreement ? <Button onClick={() => setAgreementOpen(true)}><FileSignature size={16} /> New agreement</Button> : null}
        </div>
        {documents.length ? (
          <ul className="divide-y divide-line">
            {documents.map((d) => (
              <li key={d._id}>
                <Link to={`/documents/${d._id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm hover:text-brand">
                  <span>{d.title} · {formatDate(d.createdAt)}</span>
                  <span className="flex items-center gap-2">{d.status === 'TENANT_SIGNED' ? <span className="text-xs font-semibold text-warning">Countersign now</span> : null}<StatusBadge status={d.status} /></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink-600">No documents yet.</p>}
      </Card>

      {editable && tenant.status !== 'LEFT' ? <LinkBox tenant={tenant} /> : null}

      <Card className="p-5">
        <h2 className="mb-4 font-display text-xl text-ink-950">Photo and ID files</h2>
        <KycUploads documents={kyc.documents} fileUrl={(docId) => kycApi.fileUrl(id, docId)} editable={editable} staff onUpload={async (kind, file) => { await kycApi.upload(id, kind, file); refresh() }} onRemove={async (docId) => { await kycApi.remove(id, docId); refresh() }} />
      </Card>

      <Police tenantId={id} police={kyc.police} editable={editable} onDone={refresh} />

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl text-ink-950">Form details</h2>
          {editable ? <Button size="sm" variant="secondary" onClick={() => { setEditing(!editing); setDirty(false) }}>{editing ? 'Cancel' : 'Edit'}</Button> : null}
        </div>
        {form ? (
          <form className="grid gap-5" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
            <KycFields value={form} onChange={(v) => { setForm(v); setDirty(true) }} disabled={!editing} idLast4={kyc.details.idLast4} />
            {editing ? <Button type="submit" loading={save.isPending}>Save details</Button> : null}
          </form>
        ) : null}
      </Card>

      <Modal open={rejectOpen} title="Ask the resident to fix it" onClose={() => setRejectOpen(false)} footer={<><Button variant="secondary" onClick={() => setRejectOpen(false)}>Cancel</Button><Button variant="danger" disabled={!reason.trim()} loading={review.isPending} onClick={() => review.mutate({ decision: 'REJECTED', reason })}>Send back</Button></>}>
        <Field label="What needs to be fixed?" required><Textarea rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The ID photo is blurred" /></Field>
      </Modal>
      <AgreementModal open={agreementOpen} onClose={() => setAgreementOpen(false)} tenantId={id} onDone={refresh} />
    </div>
  )
}
