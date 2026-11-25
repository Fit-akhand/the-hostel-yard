import { Card } from '../ui'
import { DAYS, MEALS, toGrid } from '../../utils/menu'
import { cx } from '../../utils/format'

// Read-only weekly menu, today first.
export function WeekMenu({ menu, today }) {
  const grid = toGrid(menu.entries)
  const meals = MEALS.filter((m) => (menu.meals?.length ? menu.meals.includes(m.id) : true))
  const start = Math.max(0, DAYS.findIndex((d) => d.id === today))
  const ordered = [...DAYS.slice(start), ...DAYS.slice(0, start)]

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {ordered.map((day) => (
        <Card key={day.id} className={cx('p-4', day.id === today && 'border-brand md:col-span-2')}>
          <h2 className="font-display text-lg text-ink-950">{day.label}{day.id === today ? <span className="ml-2 text-xs font-semibold uppercase tracking-widest text-brand">Today</span> : null}</h2>
          <dl className="mt-2 grid gap-1.5 text-sm">
            {meals.map((m) => (
              <div key={m.id} className="flex justify-between gap-4">
                <dt className="shrink-0 text-ink-500">{m.label}{menu.timings?.[m.id] ? <span className="block text-[11px]">{menu.timings[m.id]}</span> : null}</dt>
                <dd className="text-right text-ink-950">{grid[`${day.id}:${m.id}`] || '—'}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ))}
    </div>
  )
}
