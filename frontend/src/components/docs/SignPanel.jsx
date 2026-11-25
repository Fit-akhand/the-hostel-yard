import { useState } from 'react'
import { Button, Card, Field, Input } from '../ui'
import { SignaturePad } from './SignaturePad'

export const CONSENT = 'I have read this document. I agree to its terms and to signing it electronically, and I accept that my electronic signature is as valid as a handwritten one.'

// Name, drawn signature and consent. Calls onSign({ signature, name, consent }).
export function SignPanel({ defaultName = '', title = 'Sign here', buttonLabel = 'Sign document', loading, onSign, disabled, disabledReason }) {
  const [signature, setSignature] = useState(null)
  const [name, setName] = useState(defaultName)
  const [consent, setConsent] = useState(false)
  const ready = signature && name.trim().length > 1 && consent && !disabled

  return (
    <Card className="no-print grid gap-4 p-5">
      <h2 className="font-display text-xl text-ink-950">{title}</h2>
      <Field label="Full name" required><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="name" /></Field>
      <SignaturePad onChange={setSignature} />
      <label className="flex items-start gap-3 text-sm text-ink-800">
        <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-brand)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        {CONSENT}
      </label>
      {disabled && disabledReason ? <p className="text-sm text-warning">{disabledReason}</p> : null}
      <Button size="lg" loading={loading} disabled={!ready} onClick={() => onSign({ signature, name: name.trim(), consent })}>{buttonLabel}</Button>
    </Card>
  )
}
