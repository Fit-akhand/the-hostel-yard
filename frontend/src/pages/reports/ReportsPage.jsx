import { useChartColors } from '../../utils/chartColors'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { reportApi } from '../../services/apis'
import { Button, Card, Field, Input, PageHeader, Select } from '../../components/ui'
import { formatINR } from '../../utils/format'
import { asArray } from '../../utils/collections'
import { usePropertyStore } from '../../store/propertyStore'
import { propertyApi } from '../../services/apis'

const TABS = [
  ['occupancy', 'Occupancy'],
  ['rent', 'Rent'],
  ['payments', 'Payments'],
  ['expenses', 'Expenses'],
  ['complaints', 'Complaints'],
  ['tenants', 'Tenants'],
  ['bookings', 'Bookings'],
]

export function ReportsPage() {
  const chart = useChartColors()
  const current = usePropertyStore((s) => s.currentPropertyId)
  const properties = useQuery({ queryKey: ['properties'], queryFn: propertyApi.list })
  const [tab, setTab] = useState('occupancy')
  const [propertyId, setPropertyId] = useState(current || '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const params = {
    ...(propertyId ? { propertyId } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  }
  const query = useQuery({
    queryKey: ['report', tab, params],
    queryFn: () => reportApi[tab](params),
  })
  const propertyName = new Map(asArray(properties.data).map((p) => [p._id, p.name]))
  const rows = asArray(query.data).map((r) =>
    typeof r.property === 'string' && propertyName.has(r.property) ? { ...r, property: propertyName.get(r.property) } : r
  )

  return (
    <div>
      <PageHeader title="Reports" description="Figures come directly from the reporting API. Export is not available." />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
          <option value="">All properties</option>
          {asArray(properties.data).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </Select>
        <Field label="From"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
        <Field label="To"><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
        <Button variant="secondary" onClick={() => { setStartDate(''); setEndDate(''); setPropertyId('') }}>Clear</Button>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <Button key={id} variant={tab === id ? 'primary' : 'secondary'} size="sm" onClick={() => setTab(id)}>
            {label}
          </Button>
        ))}
      </div>
      {query.isError ? <p className="text-sm text-danger">{query.error.message}</p> : null}
      {tab === 'occupancy' && rows.length ? (
        <Card className="mb-6 p-5">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={rows.map((r) => ({ name: String(r.property), occupancy: r.occupancyPercentage }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.line} />
                <XAxis dataKey="name" tick={{ fill: chart.text, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chart.text, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipProps} />
                <Bar dataKey="occupancy" fill={chart.brand} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : null}
      {tab === 'rent' && rows.length ? (
        <Card className="mb-6 p-5">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={rows.map((r) => ({ name: String(r.property), due: r.totalDue, paid: r.totalPaid }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.line} />
                <XAxis dataKey="name" tick={{ fill: chart.text, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chart.text, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipProps} formatter={(v) => formatINR(v)} />
                <Bar dataKey="due" fill={chart.brand} radius={[8, 8, 0, 0]} />
                <Bar dataKey="paid" fill={chart.success} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : null}
      <Card className="overflow-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ink-50 text-xs uppercase tracking-[0.12em] text-ink-400">
            <tr>
              {Object.keys(rows[0] || { result: 'empty' }).map((k) => (
                <th key={k} className="whitespace-nowrap px-4 py-3">{humanize(k)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-line">
                {Object.values(flatten(row)).map((v, j) => (
                  <td key={j} className="px-4 py-3">{formatCell(v)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && !query.isLoading ? <p className="p-8 text-center text-sm text-ink-400">No report rows for these filters.</p> : null}
      </Card>
    </div>
  )
}

const tooltipProps = {
  contentStyle: {
    background: 'var(--color-paper)',
    backdropFilter: 'blur(14px)',
    border: '1px solid var(--color-line)',
    borderRadius: 12,
    color: 'var(--color-ink-950)',
  },
  
}

function humanize(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
}

function flatten(row) {
  if (row && typeof row === 'object' && row._id && typeof row._id === 'object') {
    return { ...row, _id: JSON.stringify(row._id) }
  }
  return row
}

function formatCell(v) {
  if (v == null) return '—'
  if (typeof v === 'number') return v
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
