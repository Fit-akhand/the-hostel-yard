import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { foodMenuApi, propertyApi } from '../../services/apis'
import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Select, TableSkeleton, Textarea } from '../../components/ui'
import { usePropertyStore } from '../../store/propertyStore'
import { useAuthStore } from '../../store/authStore'
import { can } from '../../config/authz'
import { PERMISSIONS } from '../../config/permissions'
import { toast } from '../../store/toastStore'
import { formatDateTime } from '../../utils/format'
import { asArray } from '../../utils/collections'
import { DAYS, MEALS, toGrid, fromGrid } from '../../utils/menu'

export function FoodMenuPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const currentPropertyId = usePropertyStore((s) => s.currentPropertyId)
  const properties = useQuery({ queryKey: ['properties'], queryFn: propertyApi.list, retry: false })
  const list = asArray(properties.data)
  const [chosen, setChosen] = useState('')
  const propertyId = chosen || currentPropertyId || list[0]?._id || ''
  const query = useQuery({ queryKey: ['food-menu', propertyId], queryFn: () => foodMenuApi.get(propertyId), enabled: Boolean(propertyId), refetchOnWindowFocus: false })
  const [form, setForm] = useState(null)
  const [notify, setNotify] = useState(false)
  const editable = can(user, PERMISSIONS.MANAGE_FOOD_MENU)

  useEffect(() => {
    const m = query.data
    setForm(m ? { meals: m.meals?.length ? m.meals : MEALS.map((x) => x.id), timings: { ...(m.timings || {}) }, grid: toGrid(m.entries), note: m.note || '' } : null)
  }, [query.data])

  const save = useMutation({
    mutationFn: () => foodMenuApi.save(propertyId, {
      meals: form.meals,
      timings: Object.fromEntries(MEALS.map((m) => [m.id, form.timings[m.id] || ''])),
      entries: fromGrid(form.grid),
      note: form.note,
      notifyTenants: notify,
    }),
    onSuccess: () => { toast.success('Food menu saved.'); setNotify(false); qc.invalidateQueries({ queryKey: ['food-menu', propertyId] }) },
    onError: (e) => toast.error(e.errors?.[0]?.message || e.message),
  })

  const toggleMeal = (id) => setForm((f) => ({ ...f, meals: MEALS.map((m) => m.id).filter((m) => (m === id ? !f.meals.includes(m) : f.meals.includes(m))) }))
  const setCell = (day, meal, value) => setForm((f) => ({ ...f, grid: { ...f.grid, [`${day}:${meal}`]: value } }))
  const copyToAll = (meal) => setForm((f) => {
    const first = f.grid[`MON:${meal}`] || ''
    return { ...f, grid: { ...f.grid, ...Object.fromEntries(DAYS.map((d) => [`${d.id}:${meal}`, first])) } }
  })
  const shown = form ? MEALS.filter((m) => form.meals.includes(m.id)) : []

  if (properties.data && !list.length) return <EmptyState title="Add a property first" />

  return (
    <div>
      <PageHeader
        title="Food menu"
        description="A weekly menu for each property. Residents see it in their app."
        actions={editable ? <Button loading={save.isPending} disabled={!form || !form.meals.length} onClick={() => save.mutate()}>Save menu</Button> : null}
      />
      <Card className="grid gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Property">
            <Select value={propertyId} onChange={(e) => setChosen(e.target.value)}>
              {list.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
          </Field>
          <div className="grid content-start gap-1.5">
            <span className="text-[13px] font-semibold text-ink-800">Meals served</span>
            <div className="flex flex-wrap gap-3 pt-2">
              {MEALS.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand)]" disabled={!editable || !form} checked={Boolean(form?.meals.includes(m.id))} onChange={() => toggleMeal(m.id)} />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        {query.data?.updatedAt ? <p className="text-xs text-ink-500">Last changed {formatDateTime(query.data.updatedAt)}</p> : null}
      </Card>

      {query.isLoading ? <div className="mt-5"><TableSkeleton rows={4} /></div> : null}
      {query.isError ? <div className="mt-5"><ErrorState message={query.error.message} onRetry={query.refetch} /></div> : null}

      {form ? (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {shown.map((m) => (
              <Card key={m.id} className="grid gap-2 p-4">
                <Field label={`${m.label} time`}>
                  <Input value={form.timings[m.id] || ''} disabled={!editable} maxLength={40} placeholder={m.hint} onChange={(e) => setForm({ ...form, timings: { ...form.timings, [m.id]: e.target.value } })} />
                </Field>
                {editable ? <button type="button" className="w-fit text-xs text-brand hover:underline" onClick={() => copyToAll(m.id)}>Copy Monday to all days</button> : null}
              </Card>
            ))}
          </div>
          <div className="mt-5 grid gap-4">
            {DAYS.map((day) => (
              <Card key={day.id} className="p-4">
                <h2 className="mb-3 font-display text-lg text-ink-950">{day.label}</h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {shown.map((m) => (
                    <Field key={m.id} label={m.label}>
                      <Textarea rows={2} value={form.grid[`${day.id}:${m.id}`] || ''} disabled={!editable} maxLength={200} placeholder="e.g. Poha, tea" onChange={(e) => setCell(day.id, m.id, e.target.value)} />
                    </Field>
                  ))}
                </div>
              </Card>
            ))}
          </div>
          <Card className="mt-5 grid gap-3 p-5">
            <Field label="Note for residents"><Input value={form.note} disabled={!editable} maxLength={300} placeholder="e.g. Special dinner on Sunday" onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
            {editable ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[var(--color-brand)]" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Tell residents in the app that the menu changed</label>
                <Button loading={save.isPending} disabled={!form.meals.length} onClick={() => save.mutate()}>Save menu</Button>
              </div>
            ) : null}
          </Card>
        </>
      ) : null}
    </div>
  )
}
