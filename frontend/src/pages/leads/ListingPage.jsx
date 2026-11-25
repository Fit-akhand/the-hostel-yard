import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, ExternalLink } from 'lucide-react'
import { listingApi } from '../../services/apis'
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Select, TableSkeleton, Textarea } from '../../components/ui'
import { toast } from '../../store/toastStore'

export const ROOM_LABELS = { SINGLE: 'Single', DOUBLE: 'Double', TRIPLE: 'Triple', DORMITORY: 'Dormitory' }
const AMENITIES = ['Wi-Fi', 'AC', 'Food included', 'Laundry', 'Housekeeping', 'Power backup', 'CCTV', 'Parking', 'Geyser', 'Fridge', 'RO water', 'Attached washroom']

const toForm = (l) => ({
  published: l.published, audience: l.audience || 'ANY', headline: l.headline || '', description: l.description || '',
  amenities: (l.amenities || []).join(', '), contactPhone: l.contactPhone || '', showFoodMenu: l.showFoodMenu !== false, mapUrl: l.mapUrl || '',
  rentFrom: Object.fromEntries(Object.keys(ROOM_LABELS).map((k) => [k, l.rentFrom?.[k] || ''])),
})

function ListingCard({ item, orgSlug }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(() => toForm(item.listing))
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const save = useMutation({
    mutationFn: (published) => listingApi.save(item.property._id, { ...form, published, amenities: form.amenities.split(',').map((a) => a.trim()).filter(Boolean) }),
    onSuccess: (_data, published) => { setForm((f) => ({ ...f, published })); toast.success(published ? 'Saved. The page is live.' : 'Saved. The page is hidden.'); qc.invalidateQueries({ queryKey: ['listings'] }) },
    onError: (e) => toast.error(e.errors?.[0]?.message || e.message),
  })
  const live = item.listing.published && orgSlug ? `${window.location.origin}/stays/${orgSlug}/${item.listing.slug}` : null
  const chips = form.amenities.split(',').map((a) => a.trim()).filter(Boolean)
  const toggle = (a) => setForm({ ...form, amenities: (chips.includes(a) ? chips.filter((c) => c !== a) : [...chips, a]).join(', ') })

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-ink-950">{item.property.name}</h2>
          <p className="text-sm text-ink-600">{item.vacancy.available} free bed{item.vacancy.available === 1 ? '' : 's'}{item.vacancy.upcoming ? ` · ${item.vacancy.upcoming} freeing soon` : ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={item.listing.published ? 'success' : 'neutral'}>{item.listing.published ? 'Public' : 'Hidden'}</Badge>
          {live ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(live).then(() => toast.success('Link copied.'), () => window.prompt('Copy this link', live))}><Copy size={15} /> Copy link</Button>
              <a href={live} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary"><ExternalLink size={15} /> View</Button></a>
            </>
          ) : null}
          <Button size="sm" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Edit'}</Button>
        </div>
      </div>
      {open ? (
        <form className="mt-5 grid gap-4 border-t border-line pt-5" onSubmit={(e) => { e.preventDefault(); save.mutate(form.published) }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Headline"><Input value={form.headline} onChange={set('headline')} maxLength={120} placeholder="Furnished rooms near the metro" /></Field>
            <Field label="Who can stay"><Select value={form.audience} onChange={set('audience')}><option value="ANY">Anyone</option><option value="BOYS">Boys</option><option value="GIRLS">Girls</option></Select></Field>
          </div>
          <Field label="Description"><Textarea rows={4} value={form.description} onChange={set('description')} maxLength={2000} /></Field>
          <Field label="Facilities" hint="Separate with commas.">
            <Input value={form.amenities} onChange={set('amenities')} />
          </Field>
          <div className="-mt-2 flex flex-wrap gap-2">
            {AMENITIES.map((a) => <button key={a} type="button" aria-pressed={chips.includes(a)} onClick={() => toggle(a)} className={`rounded-full border px-3 py-1 text-xs ${chips.includes(a) ? 'border-brand bg-brand text-white' : 'border-line text-ink-600 hover:text-ink-950'}`}>{a}</button>)}
          </div>
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink-800">Monthly rent from (₹). Leave empty to hide the price.</p>
            <div className="grid gap-3 sm:grid-cols-4">
              {Object.entries(ROOM_LABELS).map(([k, label]) => <Field key={k} label={label}><Input type="number" min="0" value={form.rentFrom[k]} onChange={(e) => setForm({ ...form, rentFrom: { ...form.rentFrom, [k]: e.target.value } })} /></Field>)}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact number" hint="Empty uses your business number."><Input type="tel" value={form.contactPhone} onChange={set('contactPhone')} maxLength={20} /></Field>
            <Field label="Google Maps link"><Input type="url" value={form.mapUrl} onChange={set('mapUrl')} placeholder="https://maps.google.com/…" /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[var(--color-brand)]" checked={form.showFoodMenu} onChange={(e) => setForm({ ...form, showFoodMenu: e.target.checked })} /> Show the food menu on the public page</label>
          <div className="flex flex-wrap justify-end gap-2">
            {item.listing.published ? <Button variant="secondary" disabled={save.isPending} onClick={() => save.mutate(false)}>Hide page</Button> : <Button type="submit" variant="secondary" disabled={save.isPending}>Save as draft</Button>}
            <Button loading={save.isPending} onClick={() => save.mutate(true)}>{item.listing.published ? 'Save' : 'Save and publish'}</Button>
          </div>
        </form>
      ) : null}
    </Card>
  )
}

export function ListingPage() {
  const query = useQuery({ queryKey: ['listings'], queryFn: listingApi.list, refetchOnWindowFocus: false })
  const orgSlug = query.data?.orgSlug
  const items = query.data?.items || []
  const all = orgSlug && items.some((i) => i.listing.published) ? `${window.location.origin}/stays/${orgSlug}` : null

  return (
    <div>
      <PageHeader
        title="Public page"
        description="A page anyone can open to see free beds and send an enquiry. Nothing is public until you publish it."
        actions={all ? <a href={all} target="_blank" rel="noreferrer"><Button variant="secondary"><ExternalLink size={16} /> All public properties</Button></a> : null}
      />
      <div className="grid gap-3">
        {query.isLoading ? <TableSkeleton rows={3} /> : null}
        {query.isError ? <ErrorState message={query.error.message} onRetry={query.refetch} /> : null}
        {items.map((item) => <ListingCard key={item.property._id} item={item} orgSlug={orgSlug} />)}
        {query.data && !items.length ? <EmptyState title="Add a property first" /> : null}
      </div>
    </div>
  )
}
