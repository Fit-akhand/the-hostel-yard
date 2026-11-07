import { useState } from 'react'
import { Check, Copy, MessageCircle } from 'lucide-react'
import { Button } from './index'

// 9876543210 -> 919876543210, or null when it is not a usable mobile number.
const whatsappNumber = (phone) => {
  const d = String(phone || '').replace(/\D/g, '')
  if (d.length === 10 && /^[6-9]/.test(d)) return `91${d}`
  if (d.length === 12 && d.startsWith('91')) return d
  return null
}

// Shows a one-time invitation link with ways to hand it over: WhatsApp (opens WhatsApp with the message ready)
// and copy. `role` reads naturally in the sentence, e.g. "a property manager".
// The server builds links from FRONTEND_URL, which is localhost while developing. Whatever site the owner is using
// right now is the one the invited person must open, so keep the path and swap in the current address.
const withCurrentOrigin = (link) => {
  try {
    const u = new URL(link)
    return `${window.location.origin}${u.pathname}${u.search}${u.hash}`
  } catch {
    return link
  }
}

export function InviteShare({ link: serverLink, name, phone, role }) {
  const link = withCurrentOrigin(serverLink)
  const [copied, setCopied] = useState(false)
  const number = whatsappNumber(phone)
  const message = `Hi ${name || ''}, you have been invited to join The Hostel Yard as ${role}. Open this link to set up your account: ${link}`.replace('Hi ,', 'Hi,')
  const whatsapp = `https://wa.me/${number || ''}?text=${encodeURIComponent(message)}`
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(link)

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this link', link)
    }
  }

  return (
    <div className="mt-4 grid gap-3 rounded-xl border border-line p-4">
      <p className="text-sm font-semibold text-ink-950">Invitation ready{name ? ` for ${name}` : ''}</p>
      <div className="flex flex-wrap gap-2">
        <a href={whatsapp} target="_blank" rel="noreferrer">
          <Button type="button"><MessageCircle size={16} /> Send on WhatsApp</Button>
        </a>
        <Button type="button" variant="secondary" onClick={copy}>{copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy link</>}</Button>
      </div>
      {!number ? <p className="text-xs text-ink-600">There is no valid mobile number saved, so WhatsApp will ask you to pick the contact.</p> : null}
      <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Invitation link" className="w-full truncate rounded-lg border border-line bg-ink-50 px-3 py-2 text-xs text-ink-600" />
      <p className="text-xs text-ink-600">The link works once and expires. Send it only to {name || 'the person invited'}.</p>
      {isLocal ? <p className="text-xs text-warning">You are using the app on localhost, so this link only opens on this computer. Create invitations from your live website and the link will carry its address.</p> : null}
    </div>
  )
}
