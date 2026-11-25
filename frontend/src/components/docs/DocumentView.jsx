import { formatDate, formatDateTime } from '../../utils/format'

// Renders frozen document text: lines starting with "## " are headings, blank lines separate paragraphs.
export function DocumentBody({ body }) {
  const blocks = String(body || '').split(/\n\s*\n/)
  return (
    <div className="doc-body grid gap-3 text-[15px] leading-7 text-ink-900">
      {blocks.map((block, index) => {
        const text = block.trim()
        if (!text) return null
        if (text.startsWith('## ')) {
          return <h3 key={index} className="mt-3 text-center font-display text-lg font-semibold uppercase tracking-wide text-ink-950">{text.slice(3)}</h3>
        }
        return <p key={index} className="whitespace-pre-line">{text}</p>
      })}
    </div>
  )
}

const HOW = {
  LOGIN: 'Signed in to The Hostel Yard',
  LINK: 'Opened their private link',
  OTP: 'Verified with a code sent to their phone',
}

const ROLE = { TENANT: 'Resident (Licensee)', OWNER: 'Owner (Licensor)' }

const device = (agent = '') => {
  const a = String(agent)
  const os = /Android/i.test(a) ? 'Android' : /iPhone|iPad/i.test(a) ? 'iPhone/iPad' : /Mac OS/i.test(a) ? 'Mac' : /Windows/i.test(a) ? 'Windows' : /Linux/i.test(a) ? 'Linux' : 'Unknown device'
  const browser = /Edg\//.test(a) ? 'Edge' : /Chrome\//.test(a) ? 'Chrome' : /Safari\//.test(a) ? 'Safari' : /Firefox\//.test(a) ? 'Firefox' : ''
  return [browser, os].filter(Boolean).join(' on ')
}

export function SignatureBlocks({ signatures = [], requiresCountersign = true, ownerLabel = 'Owner (Licensor)' }) {
  const roles = requiresCountersign ? ['TENANT', 'OWNER'] : ['TENANT']
  return (
    <div className={`mt-8 grid gap-6 ${roles.length > 1 ? 'sm:grid-cols-2' : ''}`}>
      {roles.map((role) => {
        const s = signatures.find((x) => x.role === role)
        return (
          <div key={role} className="break-inside-avoid">
            {/* Signatures are dark ink, so they sit on white in both themes. */}
            <div className="flex h-24 items-end rounded-t-lg border-b border-ink-300 bg-white px-2">
              {s?.image ? <img src={s.image} alt={`Signature of ${s.name}`} className="max-h-24 max-w-full object-contain" /> : <span className="pb-2 text-sm text-slate-500">Not signed yet</span>}
            </div>
            <p className="mt-2 text-sm font-semibold text-ink-950">{s?.name || '—'}</p>
            <p className="text-xs text-ink-600">{role === 'OWNER' ? ownerLabel : ROLE[role]}{s ? ` · ${formatDate(s.signedAt)}` : ''}</p>
          </div>
        )
      })}
    </div>
  )
}

export function AuditTrail({ doc }) {
  return (
    <section className="mt-8 break-inside-avoid rounded-xl border border-line bg-ink-50/60 p-4 text-xs leading-5 text-ink-700">
      <p className="mb-2 font-semibold uppercase tracking-[0.12em] text-ink-500">Electronic signature record</p>
      <p>Document fingerprint (SHA-256): <span className="break-all font-mono">{doc.hash}</span>{doc.integrityOk === false ? <strong className="ml-1 text-danger">The text no longer matches this fingerprint.</strong> : null}</p>
      <p>Created {formatDateTime(doc.createdAt)}{doc.sentAt ? ` · sent for signing ${formatDateTime(doc.sentAt)}` : ''}{doc.completedAt ? ` · completed ${formatDateTime(doc.completedAt)}` : ''}</p>
      {(doc.signatures || []).map((s) => (
        <p key={s.role + s.signedAt} className="mt-1">
          <strong>{s.name}</strong> ({ROLE[s.role] || s.role}) signed on {formatDateTime(s.signedAt)} · {HOW[s.verifiedBy] || s.verifiedBy}
          {s.phoneLast4 ? ` · phone ending ${s.phoneLast4}` : ''}{s.ip ? ` · IP ${s.ip}` : ''}{s.userAgent ? ` · ${device(s.userAgent)}` : ''}. They ticked: “{s.consent}”
        </p>
      ))}
    </section>
  )
}
