import { Field, Input, Select, Textarea } from '../ui'
import { toInputDate } from '../../utils/format'

export const ID_TYPES = { AADHAAR: 'Aadhaar card', PAN: 'PAN card', DRIVING_LICENCE: 'Driving licence', PASSPORT: 'Passport', VOTER_ID: 'Voter ID', OTHER: 'Other ID' }
const OCCUPATION = { STUDENT: 'Student', WORKING: 'Working', OTHER: 'Other' }

const GROUPS = [
  { title: 'About the resident', fields: [
    ['fatherName', "Father's / guardian's name", { required: true }],
    ['motherName', "Mother's name"],
    ['dateOfBirth', 'Date of birth', { type: 'date', required: true }],
    ['bloodGroup', 'Blood group', { options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] }],
  ] },
  { title: 'Permanent address', fields: [
    ['permanentAddress', 'Address', { required: true, wide: true, area: true }],
    ['city', 'City'], ['state', 'State'], ['pincode', 'PIN code', { inputMode: 'numeric', maxLength: 6 }],
  ] },
  { title: 'Study or work', fields: [
    ['occupation', 'I am', { options: OCCUPATION }],
    ['institution', 'College / company'],
    ['courseOrDesignation', 'Course / job title'],
    ['institutionAddress', 'College / company address', { wide: true }],
  ] },
  { title: 'Local or parent contact', fields: [
    ['guardianName', 'Name'], ['guardianPhone', 'Mobile number', { type: 'tel' }], ['guardianRelation', 'Relation'], ['guardianAddress', 'Address', { wide: true }],
  ] },
  { title: 'ID proof', fields: [
    ['idType', 'ID type', { options: ID_TYPES, required: true }],
    ['idNumber', 'ID number', { required: true, id: true }],
    ['vehicleNumber', 'Vehicle number (if any)'],
    ['medicalNotes', 'Health problems we should know', { wide: true }],
  ] },
]

const KEYS = GROUPS.flatMap((g) => g.fields.map(([key]) => key))

export const kycForm = (details = {}) =>
  Object.fromEntries(KEYS.map((key) => [key, key === 'idNumber' ? '' : key === 'dateOfBirth' ? (details[key] ? toInputDate(details[key]) : '') : details[key] || '']))

// The ID number is sent only when it was typed, so saving again does not wipe the stored last 4 digits.
export const kycBody = (form) => {
  const { idNumber, ...rest } = form
  return idNumber.trim() ? { ...rest, idNumber: idNumber.trim() } : rest
}

export function KycFields({ value, onChange, disabled, idLast4 }) {
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value })
  return (
    <div className="grid gap-6">
      {GROUPS.map((group) => (
        <fieldset key={group.title} className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-3 font-display text-lg text-ink-950">{group.title}</legend>
          {group.fields.map(([key, label, o = {}]) => (
            <div key={key} className={o.wide ? 'sm:col-span-2' : ''}>
              <Field label={label} required={o.required} hint={o.id ? (idLast4 ? `Saved: ending ${idLast4}. Type again only to change it.` : 'Only the last 4 characters are stored.') : undefined}>
                {o.options ? (
                  <Select value={value[key]} onChange={set(key)} disabled={disabled}>
                    <option value="">Choose…</option>
                    {(Array.isArray(o.options) ? o.options.map((x) => [x, x]) : Object.entries(o.options)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                ) : o.area ? (
                  <Textarea rows={2} value={value[key]} onChange={set(key)} disabled={disabled} maxLength={400} />
                ) : (
                  <Input type={o.type || 'text'} inputMode={o.inputMode} maxLength={o.maxLength} value={value[key]} onChange={set(key)} disabled={disabled} autoComplete="off" />
                )}
              </Field>
            </div>
          ))}
        </fieldset>
      ))}
    </div>
  )
}
