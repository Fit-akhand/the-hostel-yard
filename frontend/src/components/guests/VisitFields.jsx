import { Field, Input, Select, Textarea } from '../ui'
import { plusDays, todayIndia } from '../../utils/dates'

export const emptyVisit = () => ({ visitorName: '', visitorPhone: '', relation: '', purpose: '', guests: 1, visitDate: todayIndia(), expectedTime: '' })

export const RELATIONS = ['Parent', 'Brother / Sister', 'Relative', 'Friend', 'Delivery', 'Other']

// The details of one visit. `who` changes the wording: the visitor filling it in, or someone entering it for them.
export function VisitFields({ value, onChange, who = 'visitor' }) {
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value })
  const self = who === 'self'
  const today = todayIndia()

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={self ? 'Your name' : "Guest's name"} required>
          <Input value={value.visitorName} onChange={set('visitorName')} autoComplete={self ? 'name' : 'off'} required minLength={2} maxLength={80} />
        </Field>
        <Field label={self ? 'Your mobile number' : "Guest's mobile number"} required>
          <Input value={value.visitorPhone} onChange={set('visitorPhone')} type="tel" inputMode="numeric" autoComplete={self ? 'tel' : 'off'} placeholder="10 digits" required maxLength={16} />
        </Field>
        <Field label="Relation">
          <Select value={value.relation} onChange={set('relation')}>
            <option value="">Choose…</option>
            {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </Field>
        <Field label="Number of people">
          <Select value={value.guests} onChange={(e) => onChange({ ...value, guests: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </Field>
        <Field label="Visit date" required>
          <Input type="date" value={value.visitDate} min={today} max={plusDays(today, 14)} onChange={set('visitDate')} required />
        </Field>
        <Field label="Expected time">
          <Input type="time" value={value.expectedTime} onChange={set('expectedTime')} />
        </Field>
      </div>
      <Field label="Purpose of visit">
        <Textarea rows={2} value={value.purpose} onChange={set('purpose')} maxLength={200} />
      </Field>
    </>
  )
}
