import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, PencilLine } from 'lucide-react'
import { documentApi, kycApi, templateApi, tenantApi } from '../../services/apis'
import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Skeleton, StatCard, StatusBadge, TableSkeleton, Tabs, Textarea } from '../../components/ui'
import { DocumentPaper } from '../../components/docs/DocumentPaper'
import { DocumentBody } from '../../components/docs/DocumentView'
import { SignPanel } from '../../components/docs/SignPanel'
import { useAuthStore } from '../../store/authStore'
import { can } from '../../config/authz'
import { PERMISSIONS, ROLES } from '../../config/permissions'
import { toast } from '../../store/toastStore'
import { formatDate, nameOf } from '../../utils/format'
import { asArray } from '../../utils/collections'

const fail = (e) => toast.error(e.errors?.[0]?.message || e.message)

export function DocumentListPage() {
  const user = useAuthStore((s) => s.user)
  const [tab, setTab] = useState('WAITING')
  const summary = useQuery({ queryKey: ['documents', 'summary'], queryFn: documentApi.summary })
  const docs = useQuery({ queryKey: ['documents', { status: tab }], queryFn: () => documentApi.list(tab === 'ALL' ? undefined : { status: tab }) })
  const tenants = useQuery({ queryKey: ['tenants', 'kyc'], queryFn: () => tenantApi.list() })
  const review = asArray(tenants.data).filter((t) => t.kyc?.status === 'SUBMITTED')
  const s = summary.data
  const rows = asArray(docs.data)

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Resident forms, ID checks and signed agreements. Open a tenant to start."
        actions={user?.role === ROLES.BUSINESS_OWNER ? <Link to="/document-templates"><Button variant="secondary"><PencilLine size={16} /> Edit wording</Button></Link> : null}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Forms to check" value={s ? s.kyc.SUBMITTED || 0 : '—'} />
        <StatCard label="Verified residents" value={s ? s.kyc.VERIFIED || 0 : '—'} hint={s ? `${s.kyc.NOT_STARTED || 0} not started` : ''} />
        <StatCard label="You need to sign" value={s?.agreements.waitingForYou ?? '—'} />
        <StatCard label="Waiting for resident" value={s?.agreements.waitingForResident ?? '—'} />
      </div>
      {review.length ? (
        <Card className="mt-5 border-brand p-5">
          <h2 className="font-display text-xl text-ink-950">Forms to check</h2>
          <ul className="mt-2 divide-y divide-line">
            {review.map((t) => (
              <li key={t._id}><Link to={`/tenants/${t._id}?tab=kyc`} className="flex justify-between gap-3 py-3 text-sm hover:text-brand"><span>{t.name} · {nameOf(t.property)}</span><span className="text-ink-500">{formatDate(t.kyc.submittedAt)}</span></Link></li>
            ))}
          </ul>
        </Card>
      ) : null}
      <div className="mt-6">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'WAITING', label: 'Waiting for signature' }, { id: 'COMPLETED', label: 'Signed' }, { id: 'ALL', label: 'All' }]} />
        <div className="mt-4 grid gap-3">
          {docs.isLoading ? <TableSkeleton rows={3} /> : null}
          {docs.isError ? <ErrorState message={docs.error.message} onRetry={docs.refetch} /> : null}
          {rows.map((d) => (
            <Link key={d._id} to={`/documents/${d._id}`}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-brand">
                <div>
                  <p className="font-semibold text-ink-950">{nameOf(d.tenant)} · {d.title}</p>
                  <p className="text-sm text-ink-600">{nameOf(d.property)} · {formatDate(d.createdAt)}</p>
                </div>
                <StatusBadge status={d.status} />
              </Card>
            </Link>
          ))}
          {docs.data && !rows.length ? <EmptyState title="No documents here" description="Open a tenant and use the “KYC & agreement” tab." /> : null}
        </div>
      </div>
    </div>
  )
}

export function DocumentDetailPage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const editable = can(user, PERMISSIONS.EDIT_TENANTS) || can(user, PERMISSIONS.MANAGE_DOCUMENTS)
  const query = useQuery({ queryKey: ['document', id], queryFn: () => documentApi.get(id), refetchOnWindowFocus: false })
  const refresh = () => { qc.invalidateQueries({ queryKey: ['document', id] }); qc.invalidateQueries({ queryKey: ['documents'] }) }
  const sign = useMutation({ mutationFn: (signed) => documentApi.countersign(id, signed), onSuccess: () => { toast.success('Signed by both sides.'); refresh() }, onError: fail })
  const cancel = useMutation({ mutationFn: () => documentApi.cancel(id), onSuccess: () => { toast.success('Agreement cancelled.'); refresh() }, onError: fail })

  if (query.isLoading) return <Skeleton className="h-96 w-full" />
  if (query.isError) return <ErrorState message={query.error.message} onRetry={query.refetch} />
  const doc = query.data
  const tenantId = doc.tenant?._id
  const photo = doc.tenant?.kyc?.documents?.find((d) => d.kind === 'PHOTO')

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <Link to={`/tenants/${tenantId}?tab=kyc`} className="no-print inline-flex w-fit items-center gap-1.5 text-sm text-ink-600 hover:text-ink-950"><ArrowLeft size={16} /> {nameOf(doc.tenant)}</Link>
      <div><DocumentPaper doc={doc} photoUrl={photo ? kycApi.fileUrl(tenantId, photo._id) : null} /></div>
      {doc.status === 'TENANT_SIGNED' && editable ? <SignPanel title="Countersign as the owner" buttonLabel="Countersign" defaultName={user?.name || ''} loading={sign.isPending} onSign={(signed) => sign.mutate(signed)} /> : null}
      {doc.status === 'SENT' ? <p className="no-print text-sm text-ink-600">Waiting for the resident. They sign in their app, or from the private link on the tenant's “KYC & agreement” tab.</p> : null}
      {doc.kind === 'AGREEMENT' && ['SENT', 'TENANT_SIGNED'].includes(doc.status) && editable ? (
        <button type="button" className="no-print w-fit text-sm text-danger hover:underline" onClick={() => { if (window.confirm('Cancel this agreement?')) cancel.mutate() }}>Cancel this agreement</button>
      ) : null}
    </div>
  )
}

const TEMPLATE_TABS = [{ id: 'AGREEMENT', label: 'Agreement' }, { id: 'RESIDENT_DECLARATION', label: 'Resident form rules' }]

function TemplateEditor({ kind }) {
  const qc = useQueryClient()
  const key = ['template', kind]
  const query = useQuery({ queryKey: key, queryFn: () => templateApi.get(kind), refetchOnWindowFocus: false })
  const [form, setForm] = useState(null)
  const area = useRef(null)
  useEffect(() => { if (query.data) setForm({ title: query.data.title, body: query.data.body }) }, [query.data])
  const done = (message) => (data) => { qc.setQueryData(key, data); toast.success(message) }
  const save = useMutation({ mutationFn: () => templateApi.save(kind, form), onSuccess: done('Wording saved. New documents will use it.'), onError: fail })
  const reset = useMutation({ mutationFn: () => templateApi.reset(kind), onSuccess: done('Back to the standard wording.'), onError: fail })

  if (query.isError) return <ErrorState message={query.error.message} onRetry={query.refetch} />
  if (!form) return <TableSkeleton rows={5} />

  const insert = (name) => {
    const el = area.current
    const at = el ? el.selectionStart : form.body.length
    const end = el ? el.selectionEnd : at
    const token = `{{${name}}}`
    setForm({ ...form, body: form.body.slice(0, at) + token + form.body.slice(end) })
    window.requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + token.length, at + token.length) })
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="grid content-start gap-4 p-5">
        <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={150} /></Field>
        <Field label="Text" hint="Paste your own text. Start a heading line with ## and leave an empty line between paragraphs.">
          <Textarea ref={area} rows={22} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="font-mono text-[13px]" />
        </Field>
        <div>
          <p className="mb-2 text-xs text-ink-600">Tap to insert a detail that is filled in for each resident:</p>
          <div className="flex flex-wrap gap-1.5">
            {query.data.placeholders.map(([name, label]) => <button key={name} type="button" onClick={() => insert(name)} className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-700 hover:border-brand">{label}</button>)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button loading={save.isPending} onClick={() => save.mutate()}>Save wording</Button>
          {!query.data.isDefault ? <Button variant="secondary" onClick={() => { if (window.confirm('Replace your text with the standard wording?')) reset.mutate() }}>Use standard wording</Button> : null}
        </div>
      </Card>
      <Card className="max-h-[80vh] overflow-y-auto p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">Preview</p>
        <DocumentBody body={form.body} />
      </Card>
    </div>
  )
}

export function TemplatePage() {
  const [tab, setTab] = useState('AGREEMENT')
  return (
    <div>
      <PageHeader title="Document wording" description="Your agreement and house rules. Documents already sent keep the wording they were made with." />
      <Tabs tabs={TEMPLATE_TABS} value={tab} onChange={setTab} />
      <div className="mt-5"><TemplateEditor key={tab} kind={tab} /></div>
    </div>
  )
}
