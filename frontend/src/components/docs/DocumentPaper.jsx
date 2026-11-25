import { Printer } from 'lucide-react'
import { Button, Card, StatusBadge } from '../ui'
import { AuditTrail, DocumentBody, SignatureBlocks } from './DocumentView'
import { ID_TYPES } from './KycFields'
import { formatDate } from '../../utils/format'

// The answers frozen in a signed resident form.
function ResidentAnswers({ data, photoUrl }) {
  const r = data.resident || {}
  const d = data.details || {}
  const rows = [
    ['Name', r.name], ['Mobile', r.phone], ['Email', r.email], ['Gender', r.gender],
    ["Father's / guardian's name", d.fatherName], ["Mother's name", d.motherName],
    ['Date of birth', d.dateOfBirth ? formatDate(d.dateOfBirth) : null], ['Blood group', d.bloodGroup],
    ['Permanent address', [d.permanentAddress, d.city, d.state, d.pincode].filter(Boolean).join(', ')],
    ['Study / work', [d.institution, d.courseOrDesignation, d.institutionAddress].filter(Boolean).join(', ')],
    ['Parent / local contact', [d.guardianName, d.guardianRelation, d.guardianPhone, d.guardianAddress].filter(Boolean).join(', ')],
    ['ID proof', d.idType ? `${ID_TYPES[d.idType] || d.idType}, ending ${d.idLast4 || '—'}` : null],
    ['Vehicle number', d.vehicleNumber], ['Health notes', d.medicalNotes],
    ['Moved in', r.moveInDate ? formatDate(r.moveInDate) : null],
  ].filter(([, v]) => v)
  return (
    <div className="mb-8 flex flex-col-reverse items-start gap-5 sm:flex-row">
      <dl className="grid flex-1 gap-0 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[11rem_1fr] gap-3 border-b border-line py-1.5"><dt className="text-ink-500">{k}</dt><dd className="font-medium text-ink-950">{v}</dd></div>
        ))}
      </dl>
      {photoUrl ? <img src={photoUrl} alt="Resident" className="h-36 w-28 rounded-lg border border-line object-cover" /> : null}
    </div>
  )
}

export function DocumentPaper({ doc, photoUrl }) {
  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><h1 className="font-display text-2xl text-ink-950">{doc.title}</h1><StatusBadge status={doc.status} /></div>
        <Button variant="secondary" onClick={() => window.print()}><Printer size={16} /> Print / save PDF</Button>
      </div>
      <Card className="printable p-5 sm:p-8">
        {doc.property?.name ? <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">{doc.property.name}</p> : null}
        {doc.kind === 'RESIDENT_FORM' && doc.data ? <><h2 className="mb-4 text-center font-display text-xl uppercase text-ink-950">{doc.title}</h2><ResidentAnswers data={doc.data} photoUrl={photoUrl} /></> : null}
        <DocumentBody body={doc.body} />
        <SignatureBlocks signatures={doc.signatures} requiresCountersign={doc.requiresCountersign} />
        <AuditTrail doc={doc} />
      </Card>
    </>
  )
}
