import { useState } from 'react'
import { Camera, CheckCircle2, ExternalLink, Trash2, Upload } from 'lucide-react'
import { compressImage } from '../../utils/imageCompress'
import { toast } from '../../store/toastStore'
import { formatDate } from '../../utils/format'

export const DOC_KINDS = {
  PHOTO: { label: 'Passport-size photo', accept: 'image/jpeg,image/png,image/webp', required: true },
  ID_FRONT: { label: 'ID card (front)', accept: 'image/jpeg,image/png,image/webp,application/pdf', required: true },
  ID_BACK: { label: 'ID card (back)', accept: 'image/jpeg,image/png,image/webp,application/pdf' },
  POLICE_FORM: { label: 'Police verification form', accept: 'image/jpeg,image/png,image/webp,application/pdf', staffOnly: true },
  OTHER: { label: 'Other document', accept: 'image/jpeg,image/png,image/webp,application/pdf', multiple: true },
}

function Slot({ kind, documents, fileUrl, editable, canRemove, onUpload, onRemove }) {
  const meta = DOC_KINDS[kind]
  const [busy, setBusy] = useState(false)
  const files = documents.filter((d) => d.kind === kind)

  const pick = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const ready = await compressImage(file)
      if (ready.size > 4 * 1024 * 1024) throw new Error('The file is larger than 4 MB. Take a smaller photo or compress the PDF.')
      await onUpload(kind, ready)
      toast.success(`${meta.label} uploaded.`)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Remove this file?')) return
    setBusy(true)
    try { await onRemove(id) } catch (error) { toast.error(error.message) } finally { setBusy(false) }
  }

  return (
    <div className="grid content-start gap-3 rounded-xl border border-line p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink-950">{meta.label}{meta.required ? <span className="text-danger"> *</span> : null}</p>
        {files.length ? <CheckCircle2 size={18} className="shrink-0 text-success" aria-label="Uploaded" /> : null}
      </div>
      {files.map((d) => (
        <div key={d._id} className="flex items-center gap-3">
          {d.mimeType?.startsWith('image/') ? <img src={fileUrl(d._id)} alt={meta.label} loading="lazy" className="h-14 w-14 rounded-lg border border-line object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-lg border border-line text-xs font-bold text-ink-500">PDF</span>}
          <div className="min-w-0 flex-1 text-xs text-ink-600">
            <p>{formatDate(d.uploadedAt)}</p>
            <a href={fileUrl(d._id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">Open <ExternalLink size={12} /></a>
          </div>
          {canRemove(d) ? <button type="button" disabled={busy} onClick={() => remove(d._id)} aria-label={`Remove ${meta.label}`} className="rounded-lg p-2 text-ink-500 hover:text-danger"><Trash2 size={16} /></button> : null}
        </div>
      ))}
      {editable && (!meta.multiple || files.length < 3) ? (
        <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-ink-200 px-3 py-2.5 text-sm font-medium text-ink-700 hover:border-brand hover:text-ink-950 focus-within:ring-4 focus-within:ring-brand/20 ${busy ? 'pointer-events-none opacity-60' : ''}`}>
          {kind === 'PHOTO' ? <Camera size={16} /> : <Upload size={16} />}
          {busy ? 'Uploading…' : files.length && !meta.multiple ? 'Replace' : 'Choose file'}
          <input type="file" accept={meta.accept} className="sr-only" onChange={pick} />
        </label>
      ) : null}
      {!files.length && !editable ? <p className="text-xs text-ink-500">Not uploaded</p> : null}
    </div>
  )
}

export function KycUploads({ documents = [], fileUrl, editable, staff = false, onUpload, onRemove }) {
  const kinds = Object.keys(DOC_KINDS).filter((k) => staff || !DOC_KINDS[k].staffOnly || documents.some((d) => d.kind === k))
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {kinds.map((kind) => (
        <Slot
          key={kind}
          kind={kind}
          documents={documents}
          fileUrl={fileUrl}
          editable={editable && (staff || !DOC_KINDS[kind].staffOnly)}
          canRemove={(d) => editable && (staff || d.uploadedVia === 'RESIDENT')}
          onUpload={onUpload}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}
