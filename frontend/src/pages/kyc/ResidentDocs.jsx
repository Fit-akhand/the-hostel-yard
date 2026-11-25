import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, FileText } from 'lucide-react'
import { residentDocsApi } from '../../services/apis'
import { Button, Card, ErrorState, Skeleton, StatusBadge } from '../../components/ui'
import { DocumentBody } from '../../components/docs/DocumentView'
import { DocumentPaper } from '../../components/docs/DocumentPaper'
import { kycBody, kycForm, KycFields } from '../../components/docs/KycFields'
import { KycUploads } from '../../components/docs/KycUploads'
import { SignPanel } from '../../components/docs/SignPanel'
import { toast } from '../../store/toastStore'
import { formatDate } from '../../utils/format'
import { PublicMessage, PublicShell } from '../public/PublicShell'

const fail = (e) => toast.error(e.errors?.[0]?.message || e.message)

const STATES = {
  SUBMITTED: { icon: Clock, tone: 'text-info', text: 'Your form is submitted. The management is checking it.' },
  VERIFIED: { icon: CheckCircle2, tone: 'text-success', text: 'Your form and ID are verified.' },
  REJECTED: { icon: AlertTriangle, tone: 'text-danger', text: 'Please fix your form and sign it again.' },
}

// The resident's own form, uploads and documents. `base` is "/me" in the app or the private-link address.
function ResidentDocsHome({ api, docPath }) {
  const qc = useQueryClient()
  const key = ['resident-docs', api.base]
  const query = useQuery({ queryKey: key, queryFn: api.profile, retry: false, refetchOnWindowFocus: false })
  const [form, setForm] = useState(null)
  const [dirty, setDirty] = useState(false)
  const details = query.data?.kyc.details
  useEffect(() => { if (details && !dirty) setForm(kycForm(details)) }, [details, dirty])
  const refresh = () => qc.invalidateQueries({ queryKey: key })

  const save = useMutation({
    mutationFn: () => api.save(kycBody(form)),
    onSuccess: async () => { setDirty(false); await refresh(); toast.success('Saved.') },
    onError: fail,
  })
  const submit = useMutation({
    mutationFn: (signed) => api.submit(signed),
    onSuccess: () => { toast.success('Your resident form has been submitted.'); refresh(); window.scrollTo({ top: 0 }) },
    onError: (e) => { fail(e); refresh() },
  })

  if (query.isLoading || (query.data && !form)) return <Skeleton className="h-96 w-full" />
  if (query.isError) return <ErrorState message={query.error.message} onRetry={query.refetch} />

  const { tenant, kyc, documents, declaration } = query.data
  const editable = ['NOT_STARTED', 'REJECTED'].includes(kyc.status)
  const toSign = documents.filter((d) => d.kind === 'AGREEMENT' && d.status === 'SENT')
  const state = STATES[kyc.status]
  const Icon = state?.icon

  return (
    <div className="grid gap-5">
      {toSign.map((d) => (
        <Card key={d._id} className="flex flex-wrap items-center justify-between gap-4 border-brand p-5">
          <div>
            <p className="font-display text-xl text-ink-950">{d.title} is ready</p>
            <p className="text-sm text-ink-600">Read it and sign it here.</p>
          </div>
          <Link to={docPath(d._id)}><Button size="lg">Read and sign</Button></Link>
        </Card>
      ))}

      {state ? (
        <Card className="flex items-start gap-3 p-5">
          <Icon size={22} className={`mt-0.5 shrink-0 ${state.tone}`} />
          <div>
            <p className="font-medium text-ink-950">{state.text}</p>
            {kyc.status === 'REJECTED' && kyc.rejectionReason ? <p className="mt-1 text-sm text-danger">{kyc.rejectionReason}</p> : null}
          </div>
        </Card>
      ) : null}

      {documents.length ? (
        <Card className="p-5">
          <h2 className="font-display text-xl text-ink-950">Your documents</h2>
          <ul className="mt-2 divide-y divide-line">
            {documents.map((d) => (
              <li key={d._id}>
                <Link to={docPath(d._id)} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-brand">
                  <span className="flex min-w-0 items-center gap-2"><FileText size={16} className="shrink-0" /><span className="truncate">{d.title} · {formatDate(d.completedAt || d.sentAt || d.createdAt)}</span></span>
                  <StatusBadge status={d.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {editable ? (
        <>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Step 1 of 3</p>
            <p className="mb-5 text-sm text-ink-600">{tenant.name} · {tenant.property?.name} · mobile {tenant.phoneMasked}</p>
            <form className="grid gap-5" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
              <KycFields value={form} onChange={(v) => { setForm(v); setDirty(true) }} idLast4={kyc.details.idLast4} />
              <Button type="submit" size="lg" variant={dirty ? 'primary' : 'secondary'} loading={save.isPending}>{dirty ? 'Save details' : 'Details saved'}</Button>
            </form>
          </Card>
          <Card className="p-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand">Step 2 of 3</p>
            <h2 className="mb-1 font-display text-xl text-ink-950">Upload your photo and ID</h2>
            <p className="mb-4 text-sm text-ink-600">Clear photos are fine. Files are stored privately.</p>
            <KycUploads documents={kyc.documents} fileUrl={api.fileUrl} editable onUpload={async (kind, file) => { await api.upload(kind, file); await refresh() }} onRemove={async (id) => { await api.remove(id); await refresh() }} />
          </Card>
          <Card className="p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-brand">Step 3 of 3 · read and sign</p>
            <DocumentBody body={declaration.body} />
          </Card>
          <SignPanel
            title="Sign and submit"
            buttonLabel="Submit resident form"
            defaultName={tenant.name}
            loading={submit.isPending}
            disabled={dirty || kyc.missing.length > 0}
            disabledReason={dirty ? 'Save your details first (step 1).' : kyc.missing.length ? `Still needed: ${kyc.missing.join(', ')}.` : null}
            onSign={(signed) => submit.mutate(signed)}
          />
        </>
      ) : null}
    </div>
  )
}

function ResidentDocument({ api, backTo }) {
  const { docId } = useParams()
  const qc = useQueryClient()
  const doc = useQuery({ queryKey: ['resident-doc', api.base, docId], queryFn: () => api.document(docId), retry: false })
  const profile = useQuery({ queryKey: ['resident-docs', api.base], queryFn: api.profile, retry: false, refetchOnWindowFocus: false })
  const sign = useMutation({
    mutationFn: (signed) => api.sign(docId, signed),
    onSuccess: () => {
      toast.success('Signed. Thank you!')
      qc.invalidateQueries({ queryKey: ['resident-doc', api.base, docId] })
      qc.invalidateQueries({ queryKey: ['resident-docs', api.base] })
    },
    onError: (e) => { fail(e); doc.refetch() },
  })

  if (doc.isLoading) return <Skeleton className="h-96 w-full" />
  if (doc.isError) return <ErrorState message={doc.error.message} onRetry={doc.refetch} />
  const photo = profile.data?.kyc.documents.find((d) => d.kind === 'PHOTO')

  return (
    <div className="grid gap-5">
      <Link to={backTo} className="no-print inline-flex w-fit items-center gap-1.5 text-sm text-ink-600 hover:text-ink-950"><ArrowLeft size={16} /> Back</Link>
      <div><DocumentPaper doc={doc.data} photoUrl={photo ? api.fileUrl(photo._id) : null} /></div>
      {doc.data.status === 'SENT' ? <SignPanel defaultName={profile.data?.tenant.name || ''} key={profile.data?.tenant.name || 'sign'} loading={sign.isPending} onSign={(signed) => sign.mutate(signed)} /> : null}
      {doc.data.status === 'TENANT_SIGNED' ? <p className="no-print text-sm text-ink-600">You have signed. Waiting for the owner to countersign.</p> : null}
    </div>
  )
}

// In the resident portal
export function MyDocumentsPage() {
  const api = useMemo(() => residentDocsApi('/me'), [])
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 font-display text-3xl text-ink-950">Documents</h1>
      <ResidentDocsHome api={api} docPath={(id) => `/tenant/documents/${id}`} />
    </div>
  )
}

export function MyDocumentPage() {
  const api = useMemo(() => residentDocsApi('/me'), [])
  return <div className="mx-auto max-w-3xl"><ResidentDocument api={api} backTo="/tenant/documents" /></div>
}

// From the private link sent on WhatsApp: no app account needed
function useLinkApi() {
  const { token } = useParams()
  return { token, api: useMemo(() => residentDocsApi(`/public/resident/${token}`), [token]) }
}

export function LinkDocumentsPage() {
  const { token, api } = useLinkApi()
  const query = useQuery({ queryKey: ['resident-docs', api.base], queryFn: api.profile, retry: false, refetchOnWindowFocus: false })
  if (query.isError) return <PublicShell><PublicMessage title="Link not available">{query.error.message}</PublicMessage></PublicShell>
  return (
    <PublicShell wide subtitle="Resident form and documents">
      {query.data ? <h1 className="font-display text-3xl text-ink-950">Hi {query.data.tenant.name.split(' ')[0]}, welcome to {query.data.tenant.property?.name}</h1> : null}
      <div><ResidentDocsHome api={api} docPath={(id) => `/r/${token}/doc/${id}`} /></div>
    </PublicShell>
  )
}

export function LinkDocumentPage() {
  const { token, api } = useLinkApi()
  return <PublicShell wide><div><ResidentDocument api={api} backTo={`/r/${token}`} /></div></PublicShell>
}
