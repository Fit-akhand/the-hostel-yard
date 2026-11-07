import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { attendanceApi, employeeApi, payrollApi, propertyApi } from '../../services/apis'
import { Badge, Button, Card, Field, Input, PageHeader, Select } from '../../components/ui'
import { DataTable } from '../../components/tables/DataTable'
import { Modal } from '../../components/modals/Modal'
import { toast } from '../../store/toastStore'
import { formatDate, formatINR } from '../../utils/format'
import { asArray } from '../../utils/collections'
import { daysInMonth, thisMonth, todayText, WEEKDAYS } from '../../utils/dates'
import { usePropertyStore } from '../../store/propertyStore'
import { useAuthStore } from '../../store/authStore'

const DESIGNATIONS = ['Cook', 'Cleaner', 'Security guard', 'Warden', 'Manager', 'Electrician', 'Plumber', 'Driver', 'Helper']
const isOwner = (user) => user?.role === 'BUSINESS_OWNER'
const payLabel = (e) => (e.payType === 'DAILY' ? `${formatINR(e.salary)} / day` : `${formatINR(e.salary)} / month`)

function usePropertyChoice() {
  const current = usePropertyStore((s) => s.currentPropertyId)
  const properties = useQuery({ queryKey: ['properties'], queryFn: propertyApi.list })
  const [propertyId, setPropertyId] = useState(current || '')
  useEffect(() => {
    if (!propertyId && asArray(properties.data).length) setPropertyId(current || asArray(properties.data)[0]._id)
  }, [properties.data]) // eslint-disable-line react-hooks/exhaustive-deps
  return { properties: asArray(properties.data), propertyId, setPropertyId }
}

// ------------------------------------------------------------------ list

export function EmployeeListPage() {
  const user = useAuthStore((s) => s.user)
  const current = usePropertyStore((s) => s.currentPropertyId)
  const [status, setStatus] = useState('ACTIVE')
  const query = useQuery({
    queryKey: ['employees', { current, status }],
    queryFn: () => employeeApi.list({ status, ...(current ? { propertyId: current } : {}) }),
  })
  const showPay = isOwner(user)

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Cooks, guards, cleaners and everyone else on your payroll."
        actions={showPay ? <Link to="/employees/new"><Button>Add employee</Button></Link> : null}
      />
      <div className="mb-4 max-w-xs">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ACTIVE">Working</option>
          <option value="LEFT">Left</option>
        </Select>
      </div>
      <DataTable
        loading={query.isLoading}
        error={query.error}
        rows={asArray(query.data)}
        rowTo={(e) => `/employees/${e._id}`}
        emptyTitle="No employees yet"
        emptyDescription={showPay ? 'Add your first employee to start tracking attendance and salary.' : 'Ask the owner to add employees.'}
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'designation', header: 'Role' },
          { key: 'property', header: 'Property', render: (e) => e.property?.name },
          ...(showPay ? [{ key: 'salary', header: 'Pay', render: payLabel }] : []),
          { key: 'joinDate', header: 'Joined', render: (e) => formatDate(e.joinDate) },
          { key: 'status', header: 'Status', render: (e) => <Badge tone={e.status === 'ACTIVE' ? 'success' : 'neutral'}>{e.status === 'ACTIVE' ? 'Working' : 'Left'}</Badge> },
        ]}
      />
    </div>
  )
}

// ------------------------------------------------------------------ form

export function EmployeeFormPage({ mode }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { properties, propertyId, setPropertyId } = usePropertyChoice()
  const existing = useQuery({ queryKey: ['employee', id], queryFn: () => employeeApi.get(id), enabled: mode === 'edit' })
  const [form, setForm] = useState({ name: '', phone: '', designation: '', payType: 'MONTHLY', salary: '', weeklyOff: '0', joinDate: todayText() })
  const [error, setError] = useState('')

  useEffect(() => {
    const e = existing.data
    if (!e) return
    setPropertyId(e.property?._id || e.property)
    setForm({ name: e.name, phone: e.phone || '', designation: e.designation, payType: e.payType, salary: String(e.salary), weeklyOff: e.weeklyOff == null ? '' : String(e.weeklyOff), joinDate: e.joinDate })
  }, [existing.data]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (ev) => setForm({ ...form, [k]: ev.target.value })
  const save = useMutation({
    mutationFn: () => {
      const body = {
        propertyId, name: form.name, phone: form.phone || null, designation: form.designation, payType: form.payType,
        salary: Number(form.salary), weeklyOff: form.weeklyOff === '' ? null : Number(form.weeklyOff), joinDate: form.joinDate,
      }
      return mode === 'edit' ? employeeApi.update(id, body) : employeeApi.create(body)
    },
    onSuccess: (e) => { toast.success(mode === 'edit' ? 'Employee updated.' : 'Employee added.'); navigate(`/employees/${e._id || id}`) },
    onError: (e) => setError(e.message),
  })

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={mode === 'edit' ? 'Edit employee' : 'Add employee'} />
      <Card className="p-6">
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); setError(''); save.mutate() }}>
          <Field label="Property" required>
            <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              {properties.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Full name" required><Input value={form.name} onChange={set('name')} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone"><Input value={form.phone} onChange={set('phone')} inputMode="tel" /></Field>
            <Field label="Role" required>
              <Input list="designations" value={form.designation} onChange={set('designation')} />
              <datalist id="designations">{DESIGNATIONS.map((d) => <option key={d} value={d} />)}</datalist>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Paid">
              <Select value={form.payType} onChange={set('payType')}>
                <option value="MONTHLY">Fixed monthly salary</option>
                <option value="DAILY">Per day worked</option>
              </Select>
            </Field>
            <Field label={form.payType === 'DAILY' ? 'Rate per day (₹)' : 'Monthly salary (₹)'} required>
              <Input type="number" min="0" value={form.salary} onChange={set('salary')} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Weekly off">
              <Select value={form.weeklyOff} onChange={set('weeklyOff')}>
                <option value="">None</option>
                {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Joining date" required><Input type="date" value={form.joinDate} onChange={set('joinDate')} /></Field>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" loading={save.isPending} disabled={!form.name || !form.designation || form.salary === '' || !propertyId}>Save</Button>
        </form>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------- detail

const STATUS_TONE = { PRESENT: 'bg-success-bg text-success', ABSENT: 'bg-danger-bg text-danger', HALF_DAY: 'bg-warning-bg text-warning', PAID_LEAVE: 'bg-info-bg text-info', WEEKLY_OFF: 'bg-ink-50 text-ink-600' }
const STATUS_SHORT = { PRESENT: 'P', ABSENT: 'A', HALF_DAY: 'H', PAID_LEAVE: 'L', WEEKLY_OFF: 'W' }

export function EmployeeDetailPage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const owner = isOwner(user)
  const month = thisMonth()
  const employee = useQuery({ queryKey: ['employee', id], queryFn: () => employeeApi.get(id) })
  const records = useQuery({ queryKey: ['attendance-month', id, month], queryFn: () => attendanceApi.month({ employeeId: id, month }) })
  const adjustments = useQuery({ queryKey: ['adjustments', id], queryFn: () => payrollApi.adjustments({ employeeId: id }), enabled: owner })
  const [adjOpen, setAdjOpen] = useState(false)
  const [adj, setAdj] = useState({ type: 'ADVANCE', amount: '', reason: '', date: todayText() })
  const [leftOpen, setLeftOpen] = useState(false)

  const addAdj = useMutation({
    mutationFn: () => payrollApi.addAdjustment({ employeeId: id, type: adj.type, amount: Number(adj.amount), reason: adj.reason || null, date: adj.date }),
    onSuccess: () => { toast.success('Entry added.'); setAdjOpen(false); setAdj({ ...adj, amount: '', reason: '' }); qc.invalidateQueries({ queryKey: ['adjustments', id] }) },
    onError: (e) => toast.error(e.message),
  })
  const removeAdj = useMutation({
    mutationFn: (adjId) => payrollApi.removeAdjustment(adjId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adjustments', id] }),
    onError: (e) => toast.error(e.message),
  })
  const setStatus = useMutation({
    mutationFn: (status) => employeeApi.setStatus(id, { status }),
    onSuccess: () => { toast.success('Updated.'); setLeftOpen(false); qc.invalidateQueries({ queryKey: ['employee', id] }); qc.invalidateQueries({ queryKey: ['employees'] }) },
    onError: (e) => toast.error(e.message),
  })

  if (employee.isLoading) return <p className="text-sm text-ink-600">Loading…</p>
  if (employee.error) return <p className="text-sm text-danger">{employee.error.message}</p>
  const e = employee.data
  const byDate = new Map(asArray(records.data).map((r) => [r.date, r.status]))
  const dim = daysInMonth(month)
  const open = asArray(adjustments.data).filter((a) => a.type === 'ADVANCE' && a.status === 'OPEN')
  const advanceDue = open.reduce((t, a) => t + a.amount - a.recoveredAmount, 0)

  return (
    <div className="grid gap-5">
      <PageHeader
        title={e.name}
        description={`${e.designation} · ${e.property?.name}`}
        actions={owner ? (
          <div className="flex gap-2">
            <Link to={`/employees/${id}/edit`}><Button variant="secondary">Edit</Button></Link>
            <Button variant="secondary" onClick={() => (e.status === 'ACTIVE' ? setLeftOpen(true) : setStatus.mutate('ACTIVE'))}>
              {e.status === 'ACTIVE' ? 'Mark as left' : 'Rejoin'}
            </Button>
          </div>
        ) : null}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5"><p className="text-xs uppercase tracking-[0.14em] text-ink-400">Pay</p><p className="mt-1 font-display text-2xl">{owner ? payLabel(e) : '—'}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-[0.14em] text-ink-400">Joined</p><p className="mt-1 font-display text-2xl">{formatDate(e.joinDate)}</p><p className="text-xs text-ink-600">{e.phone || 'No phone saved'}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-[0.14em] text-ink-400">Weekly off</p><p className="mt-1 font-display text-2xl">{e.weeklyOff == null ? 'None' : WEEKDAYS[e.weeklyOff]}</p><Badge tone={e.status === 'ACTIVE' ? 'success' : 'neutral'}>{e.status === 'ACTIVE' ? 'Working' : `Left ${e.leftDate ? formatDate(e.leftDate) : ''}`}</Badge></Card>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl">This month's attendance</h2>
          <Link to="/attendance" className="text-sm text-brand hover:underline">Open attendance sheet</Link>
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-10 lg:grid-cols-[repeat(15,minmax(0,1fr))]">
          {Array.from({ length: dim }, (_, i) => {
            const date = `${month}-${String(i + 1).padStart(2, '0')}`
            const s = byDate.get(date)
            return (
              <div key={date} title={s || 'No entry'} className={`grid h-10 place-items-center rounded-lg border border-line text-xs ${s ? STATUS_TONE[s] : 'text-ink-400'}`}>
                <span className="leading-none">{i + 1}</span>
                <span className="text-[10px] font-bold leading-none">{s ? STATUS_SHORT[s] : ''}</span>
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-ink-600">P present · A absent · H half day · L paid leave · W weekly off. Days with no entry count as present for monthly salaries.</p>
      </Card>

      {owner ? (
        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-xl">Advances, deductions and bonuses</h2>
              <p className="text-sm text-ink-600">Advance still to recover: <strong className="text-ink-950">{formatINR(advanceDue)}</strong></p>
            </div>
            <Button size="sm" onClick={() => setAdjOpen(true)}>Add entry</Button>
          </div>
          <DataTable
            rows={asArray(adjustments.data)}
            emptyTitle="Nothing yet"
            columns={[
              { key: 'date', header: 'Date', render: (a) => formatDate(a.date) },
              { key: 'type', header: 'Type', render: (a) => <Badge tone={a.type === 'BONUS' ? 'success' : a.type === 'ADVANCE' ? 'warning' : 'danger'}>{a.type}</Badge> },
              { key: 'amount', header: 'Amount', render: (a) => formatINR(a.amount) },
              { key: 'reason', header: 'Reason', render: (a) => a.reason || '—' },
              { key: 'status', header: 'Status', render: (a) => (a.status === 'APPLIED' ? 'Settled' : a.type === 'ADVANCE' && a.recoveredAmount ? `${formatINR(a.recoveredAmount)} recovered` : 'Pending') },
              { key: 'x', header: '', render: (a) => (a.status === 'OPEN' && !a.recoveredAmount ? <button type="button" className="text-xs text-danger hover:underline" onClick={() => removeAdj.mutate(a._id)}>Remove</button> : null) },
            ]}
          />
        </Card>
      ) : null}

      <Modal open={adjOpen} onClose={() => setAdjOpen(false)} title="Add entry">
        <div className="grid gap-4">
          <Field label="Type">
            <Select value={adj.type} onChange={(ev) => setAdj({ ...adj, type: ev.target.value })}>
              <option value="ADVANCE">Advance (taken back from salary)</option>
              <option value="DEDUCTION">Deduction (fine, damage)</option>
              <option value="BONUS">Bonus / incentive</option>
            </Select>
          </Field>
          <Field label="Amount (₹)" required><Input type="number" min="1" value={adj.amount} onChange={(ev) => setAdj({ ...adj, amount: ev.target.value })} /></Field>
          <Field label="Date"><Input type="date" value={adj.date} onChange={(ev) => setAdj({ ...adj, date: ev.target.value })} /></Field>
          <Field label="Reason"><Input value={adj.reason} onChange={(ev) => setAdj({ ...adj, reason: ev.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdjOpen(false)}>Cancel</Button>
            <Button loading={addAdj.isPending} disabled={!adj.amount} onClick={() => addAdj.mutate()}>Add</Button>
          </div>
        </div>
      </Modal>

      <Modal open={leftOpen} onClose={() => setLeftOpen(false)} title="Mark as left">
        <p className="text-sm text-ink-600">{e.name} will stop appearing on the attendance sheet. Salary is paid up to today.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setLeftOpen(false)}>Cancel</Button>
          <Button variant="danger" loading={setStatus.isPending} onClick={() => setStatus.mutate('LEFT')}>Mark as left</Button>
        </div>
      </Modal>
    </div>
  )
}

// ------------------------------------------------------------ attendance

const MARKS = [['PRESENT', 'P', 'Present'], ['ABSENT', 'A', 'Absent'], ['HALF_DAY', 'H', 'Half day'], ['PAID_LEAVE', 'L', 'Paid leave'], ['WEEKLY_OFF', 'W', 'Weekly off']]

export function AttendancePage() {
  const qc = useQueryClient()
  const { properties, propertyId, setPropertyId } = usePropertyChoice()
  const [date, setDate] = useState(todayText())
  const [marks, setMarks] = useState({})
  const sheet = useQuery({
    queryKey: ['attendance', propertyId, date],
    queryFn: () => attendanceApi.sheet({ propertyId, date }),
    enabled: Boolean(propertyId),
  })
  const rows = asArray(sheet.data)

  useEffect(() => setMarks(Object.fromEntries(rows.map((r) => [r.employeeId, r.status]))), [sheet.data]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: () => attendanceApi.save({ propertyId, date, entries: rows.map((r) => ({ employeeId: r.employeeId, status: marks[r.employeeId] || null })) }),
    onSuccess: () => { toast.success('Attendance saved.'); qc.invalidateQueries({ queryKey: ['attendance'] }); qc.invalidateQueries({ queryKey: ['attendance-month'] }) },
    onError: (e) => toast.error(e.message),
  })
  const count = (s) => rows.filter((r) => marks[r.employeeId] === s).length

  return (
    <div>
      <PageHeader title="Attendance" description="Mark who came today. Days left blank count as present for monthly salaries." actions={<Button loading={save.isPending} disabled={!rows.length} onClick={() => save.mutate()}>Save attendance</Button>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
          {properties.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </Select>
        <Input type="date" value={date} max={todayText()} onChange={(e) => setDate(e.target.value)} />
        <Button variant="secondary" disabled={!rows.length} onClick={() => setMarks(Object.fromEntries(rows.map((r) => [r.employeeId, 'PRESENT'])))}>Mark everyone present</Button>
      </div>
      {rows.length ? (
        <p className="mb-3 text-sm text-ink-600">
          {count('PRESENT')} present · {count('ABSENT')} absent · {count('HALF_DAY')} half day · {count('PAID_LEAVE')} on leave · {rows.length - MARKS.reduce((t, [s]) => t + count(s), 0)} not marked
        </p>
      ) : null}
      <Card className="divide-y divide-line">
        {sheet.isLoading ? <p className="p-5 text-sm text-ink-600">Loading…</p> : null}
        {!sheet.isLoading && !rows.length ? <p className="p-8 text-center text-sm text-ink-400">No employees for this property yet. <Link to="/employees" className="text-brand hover:underline">Add employees</Link></p> : null}
        {rows.map((r) => (
          <div key={r.employeeId} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium text-ink-950">{r.name}</p>
              <p className="text-xs text-ink-600">{r.designation}{r.weeklyOff === new Date(`${date}T00:00:00`).getDay() ? ' · weekly off today' : ''}</p>
            </div>
            <div className="flex gap-1.5" role="group" aria-label={`Attendance for ${r.name}`}>
              {MARKS.map(([s, short, label]) => (
                <button
                  key={s}
                  type="button"
                  title={label}
                  aria-pressed={marks[r.employeeId] === s}
                  onClick={() => setMarks({ ...marks, [r.employeeId]: marks[r.employeeId] === s ? null : s })}
                  className={`h-9 w-9 rounded-lg border text-sm font-semibold transition ${marks[r.employeeId] === s ? `${STATUS_TONE[s]} border-current` : 'border-line text-ink-400 hover:border-ink-300'}`}
                >
                  {short}
                </button>
              ))}
            </div>
          </div>
        ))}
      </Card>
      <p className="mt-3 text-xs text-ink-600">P present · A absent · H half day · L paid leave · W weekly off. Click a button again to clear it.</p>
    </div>
  )
}
