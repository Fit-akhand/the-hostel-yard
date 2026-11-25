import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { MapPin, MessageCircle, Phone } from 'lucide-react'
import { publicApi } from '../../services/apis'
import { Badge, Button, Card, Field, Input, Select, Skeleton, Textarea } from '../../components/ui'
import { WeekMenu } from '../../components/food/WeekMenu'
import { toast } from '../../store/toastStore'
import { formatDate, formatINR } from '../../utils/format'
import { todayIndia } from '../../utils/dates'
import { ROOM_LABELS } from '../leads/ListingPage'
import { PublicMessage, PublicShell } from './PublicShell'

const AUDIENCE = { BOYS: 'Boys', GIRLS: 'Girls', ANY: null }
const beds = (n) => `${n} bed${n === 1 ? '' : 's'}`

const Availability = ({ available, upcoming }) => (
  available ? <Badge tone="success">{beds(available)} free</Badge> : upcoming ? <Badge tone="warning">{beds(upcoming)} soon</Badge> : <Badge>Full now</Badge>
)

export function StaysPage() {
  const { orgSlug } = useParams()
  const query = useQuery({ queryKey: ['stays', orgSlug], queryFn: () => publicApi.organization(orgSlug), retry: false })
  if (query.isLoading) return <PublicShell wide><Skeleton className="h-64 w-full" /></PublicShell>
  if (query.isError) return <PublicShell><PublicMessage title="Page not found">{query.error.message}</PublicMessage></PublicShell>
  const { organization, properties } = query.data

  return (
    <PublicShell wide subtitle="Rooms and beds">
      <h1 className="font-display text-3xl text-ink-950">{organization.name}</h1>
      {!properties.length ? <PublicMessage title="Nothing listed yet">Please check again later.</PublicMessage> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {properties.map((p) => (
          <Link key={p.slug} to={`/stays/${organization.slug}/${p.slug}`}>
            <Card className="h-full p-5 transition hover:border-brand">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-xl text-ink-950">{p.name}</h2>
                <Availability available={p.available} upcoming={p.upcoming} />
              </div>
              <p className="text-sm text-ink-600">{[p.city, AUDIENCE[p.audience]].filter(Boolean).join(' · ')}</p>
              {p.headline ? <p className="mt-2 text-sm text-ink-900">{p.headline}</p> : null}
              {p.rentFrom ? <p className="mt-3 font-semibold text-ink-950">From {formatINR(p.rentFrom)} / month</p> : null}
              {p.amenities.length ? <p className="mt-2 text-xs text-ink-500">{p.amenities.join(' · ')}</p> : null}
            </Card>
          </Link>
        ))}
      </div>
    </PublicShell>
  )
}

function EnquiryForm({ orgSlug, slug, types }) {
  const [form, setForm] = useState({ name: '', phone: '', gender: '', sharing: '', moveInDate: '', message: '', website: '' })
  const [done, setDone] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const send = useMutation({
    mutationFn: () => publicApi.enquire(orgSlug, slug, { ...form, moveInDate: form.moveInDate || null }),
    onSuccess: () => setDone(true),
    onError: (e) => toast.error(e.errors?.[0]?.message || e.message),
  })

  if (done) return <PublicMessage title="Thank you!">We have your enquiry and will call you soon.</PublicMessage>

  return (
    <Card className="p-5" >
      <h2 id="enquire" className="font-display text-2xl text-ink-950">Ask about a bed</h2>
      <form className="mt-4 grid gap-4" onSubmit={(e) => { e.preventDefault(); send.mutate() }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" required><Input value={form.name} onChange={set('name')} autoComplete="name" required minLength={2} maxLength={100} /></Field>
          <Field label="Mobile number" required><Input type="tel" inputMode="numeric" value={form.phone} onChange={set('phone')} autoComplete="tel" required maxLength={16} placeholder="10 digits" /></Field>
          <Field label="Sharing"><Select value={form.sharing} onChange={set('sharing')}><option value="">Any</option>{types.map((t) => <option key={t} value={t}>{ROOM_LABELS[t]}</option>)}</Select></Field>
          <Field label="Move in from"><Input type="date" min={todayIndia()} value={form.moveInDate} onChange={set('moveInDate')} /></Field>
          <Field label="Gender"><Select value={form.gender} onChange={set('gender')}><option value="">Prefer not to say</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></Select></Field>
        </div>
        <Field label="Message"><Textarea rows={3} value={form.message} onChange={set('message')} maxLength={1000} /></Field>
        {/* Bots fill every field; people never see this one. */}
        <input type="text" name="website" value={form.website} onChange={set('website')} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
        <Button type="submit" size="lg" loading={send.isPending}>Send enquiry</Button>
        <p className="text-xs text-ink-500">Your number is shared only with this property, to reply to you.</p>
      </form>
    </Card>
  )
}

export function StayDetailPage() {
  const { orgSlug, slug } = useParams()
  const query = useQuery({ queryKey: ['stay', orgSlug, slug], queryFn: () => publicApi.property(orgSlug, slug), retry: false })
  if (query.isLoading) return <PublicShell wide><Skeleton className="h-64 w-full" /></PublicShell>
  if (query.isError) return <PublicShell><PublicMessage title="Page not found">{query.error.message}</PublicMessage></PublicShell>
  const { organization, property, listing, vacancy, foodMenu } = query.data
  const digits = String(listing.contactPhone || '').replace(/\D/g, '')
  const wa = digits.length === 10 ? `91${digits}` : digits

  return (
    <PublicShell wide subtitle={organization.name}>
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl text-ink-950">{property.name}</h1>
          <Availability available={vacancy.available} upcoming={vacancy.upcoming} />
          {AUDIENCE[listing.audience] ? <Badge tone="info">{AUDIENCE[listing.audience]}</Badge> : null}
        </div>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-600"><MapPin size={16} className="mt-0.5 shrink-0" />{[property.address, property.city, property.state, property.pincode].filter(Boolean).join(', ')}</p>
        {listing.headline ? <p className="mt-3 text-lg text-ink-950">{listing.headline}</p> : null}
      </div>
      {digits || listing.mapUrl ? (
        <div className="flex flex-wrap gap-2">
          {digits ? <a href={`tel:${listing.contactPhone}`}><Button><Phone size={16} /> Call</Button></a> : null}
          {digits ? <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi, I am looking for a bed at ${property.name}.`)}`} target="_blank" rel="noreferrer"><Button variant="secondary"><MessageCircle size={16} /> WhatsApp</Button></a> : null}
          {listing.mapUrl ? <a href={listing.mapUrl} target="_blank" rel="noreferrer"><Button variant="secondary"><MapPin size={16} /> Map</Button></a> : null}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {vacancy.types.map((t) => (
          <Card key={t.type} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold text-ink-950">{ROOM_LABELS[t.type]} room</p>
              <p className="text-sm text-ink-600">{listing.rentFrom?.[t.type] ? `From ${formatINR(listing.rentFrom[t.type])} / month` : 'Ask for the rent'}</p>
              {!t.available && t.nextFreeOn ? <p className="text-xs text-ink-500">Next free around {formatDate(t.nextFreeOn)}</p> : null}
            </div>
            <Availability available={t.available} upcoming={t.upcoming} />
          </Card>
        ))}
      </div>

      {listing.description ? <Card className="p-5"><p className="whitespace-pre-line text-sm leading-7 text-ink-900">{listing.description}</p></Card> : null}
      {listing.amenities.length ? (
        <Card className="p-5">
          <h2 className="font-display text-xl text-ink-950">Facilities</h2>
          <div className="mt-3 flex flex-wrap gap-2">{listing.amenities.map((a) => <span key={a} className="rounded-full border border-line px-3 py-1 text-sm">{a}</span>)}</div>
        </Card>
      ) : null}

      <EnquiryForm orgSlug={orgSlug} slug={slug} types={vacancy.types.map((t) => t.type)} />

      {foodMenu ? <section className="grid gap-3"><h2 className="font-display text-2xl text-ink-950">This week's food</h2><WeekMenu menu={foodMenu} /></section> : null}
    </PublicShell>
  )
}
