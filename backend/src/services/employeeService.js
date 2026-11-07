import Employee from '../models/Employee.js'
import Attendance from '../models/Attendance.js'
import PayrollAdjustment from '../models/PayrollAdjustment.js'
import Payroll from '../models/Payroll.js'
import Property from '../models/Property.js'
import Expense from '../models/Expense.js'
import PropertyManagerAssignment from '../models/PropertyManagerAssignment.js'
import { PERMISSIONS } from '../constants/permissions.js'
import { calculatePayroll } from './payrollCalculator.js'

const pad = (n) => String(n).padStart(2, '0')
const todayText = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })

const isOwner = (user) => user.role === 'BUSINESS_OWNER'

// Owners can do everything in their organisation. Managers need the staff permission on that property.
// Salary figures and payroll are for owners only.
const assertAccess = async (user, propertyId, { write = false } = {}) => {
  if (!user.organization) throw fail('User is not associated with an organization.')

  const property = await Property.findOne({ _id: propertyId, organization: user.organization }).select('name')
  if (!property) throw fail('Property not found.', 404)
  if (isOwner(user)) return property

  if (user.role === 'PROPERTY_MANAGER') {
    const assignment = await PropertyManagerAssignment.findOne({ manager: user._id, property: propertyId, status: 'ACTIVE' })
    const needed = write ? PERMISSIONS.MANAGE_STAFF : PERMISSIONS.VIEW_STAFF
    if (assignment?.permissions.includes(needed)) return property
  }
  throw fail('You do not have permission to do this.', 403)
}

const assertOwner = (user) => {
  if (!isOwner(user)) throw fail('Only the owner can manage salaries.', 403)
}

// Property ids the user may look at.
const visibleProperties = async (user, propertyId) => {
  if (propertyId) {
    await assertAccess(user, propertyId)
    return [propertyId]
  }
  if (isOwner(user)) return null // all
  const rows = await PropertyManagerAssignment.find({ manager: user._id, status: 'ACTIVE', permissions: PERMISSIONS.VIEW_STAFF }).select('property')
  return rows.map((r) => r.property)
}

const hideSalary = (employee, user) => {
  if (isOwner(user)) return employee
  const { salary, payType, ...rest } = employee.toObject ? employee.toObject() : employee
  return rest
}

// ---------------------------------------------------------------- employees

export const listEmployees = async ({ user, propertyId, status }) => {
  const properties = await visibleProperties(user, propertyId)
  const filter = { organization: user.organization }
  if (properties) filter.property = { $in: properties }
  if (status) filter.status = status
  const rows = await Employee.find(filter).populate('property', 'name').sort({ status: 1, name: 1 })
  return rows.map((e) => hideSalary(e, user))
}

export const getEmployee = async ({ user, employeeId }) => {
  const employee = await Employee.findOne({ _id: employeeId, organization: user.organization }).populate('property', 'name')
  if (!employee) throw fail('Employee not found.', 404)
  await assertAccess(user, employee.property._id)
  return hideSalary(employee, user)
}

export const createEmployee = async ({ user, data }) => {
  assertOwner(user)
  await assertAccess(user, data.propertyId, { write: true })
  const { propertyId, ...rest } = data
  return Employee.create({ ...rest, organization: user.organization, property: propertyId })
}

export const updateEmployee = async ({ user, employeeId, data }) => {
  assertOwner(user)
  const employee = await Employee.findOne({ _id: employeeId, organization: user.organization })
  if (!employee) throw fail('Employee not found.', 404)
  const { propertyId, ...rest } = data
  if (propertyId && String(propertyId) !== String(employee.property)) {
    await assertAccess(user, propertyId, { write: true })
    employee.property = propertyId
  }
  Object.assign(employee, rest)
  await employee.save()
  return employee
}

export const setEmployeeStatus = async ({ user, employeeId, status, leftDate }) => {
  assertOwner(user)
  const employee = await Employee.findOne({ _id: employeeId, organization: user.organization })
  if (!employee) throw fail('Employee not found.', 404)
  employee.status = status
  employee.leftDate = status === 'LEFT' ? leftDate || todayText() : null
  await employee.save()
  return employee
}

// --------------------------------------------------------------- attendance

export const getAttendanceSheet = async ({ user, propertyId, date }) => {
  await assertAccess(user, propertyId)
  const employees = await Employee.find({
    organization: user.organization, property: propertyId, status: 'ACTIVE', joinDate: { $lte: date },
  }).sort({ name: 1 }).lean()
  const records = await Attendance.find({ property: propertyId, date }).lean()
  const byEmployee = new Map(records.map((r) => [String(r.employee), r]))
  return employees.map((e) => ({
    employeeId: e._id, name: e.name, designation: e.designation, weeklyOff: e.weeklyOff,
    status: byEmployee.get(String(e._id))?.status || null, note: byEmployee.get(String(e._id))?.note || null,
  }))
}

export const saveAttendance = async ({ user, propertyId, date, entries }) => {
  await assertAccess(user, propertyId, { write: true })
  const ids = entries.map((e) => e.employeeId)
  const valid = new Set((await Employee.find({ _id: { $in: ids }, organization: user.organization, property: propertyId }).select('_id')).map((e) => String(e._id)))

  const ops = entries.filter((e) => valid.has(String(e.employeeId))).map((e) =>
    e.status
      ? { updateOne: { filter: { employee: e.employeeId, date }, update: { $set: { organization: user.organization, property: propertyId, status: e.status, note: e.note || null, markedBy: user._id } }, upsert: true } }
      : { deleteOne: { filter: { employee: e.employeeId, date } } }
  )
  if (ops.length) await Attendance.bulkWrite(ops)
  return { saved: ops.length }
}

export const getMonthAttendance = async ({ user, employeeId, month }) => {
  const employee = await Employee.findOne({ _id: employeeId, organization: user.organization })
  if (!employee) throw fail('Employee not found.', 404)
  await assertAccess(user, employee.property)
  return Attendance.find({ employee: employeeId, date: { $gte: `${month}-01`, $lte: `${month}-31` } }).sort({ date: 1 }).lean()
}

// -------------------------------------------------------------- adjustments

export const listAdjustments = async ({ user, employeeId, month }) => {
  assertOwner(user)
  const filter = { organization: user.organization }
  if (employeeId) filter.employee = employeeId
  if (month) filter.month = month
  return PayrollAdjustment.find(filter).populate('employee', 'name').sort({ date: -1 })
}

export const createAdjustment = async ({ user, data }) => {
  assertOwner(user)
  const employee = await Employee.findOne({ _id: data.employeeId, organization: user.organization })
  if (!employee) throw fail('Employee not found.', 404)
  const { employeeId, ...rest } = data
  return PayrollAdjustment.create({
    ...rest, organization: user.organization, property: employee.property, employee: employeeId,
    month: data.month || data.date.slice(0, 7), createdBy: user._id,
  })
}

export const deleteAdjustment = async ({ user, adjustmentId }) => {
  assertOwner(user)
  const adjustment = await PayrollAdjustment.findOne({ _id: adjustmentId, organization: user.organization })
  if (!adjustment) throw fail('Entry not found.', 404)
  if (adjustment.status === 'APPLIED' || adjustment.recoveredAmount > 0) throw fail('This entry was already used in a salary and cannot be deleted.', 409)
  await adjustment.deleteOne()
  return { deleted: true }
}

// ------------------------------------------------------------------ payroll

const advanceBalanceFor = async (employeeId, month) => {
  const rows = await PayrollAdjustment.find({ employee: employeeId, type: 'ADVANCE', status: 'OPEN', month: { $lte: month } })
  return rows.reduce((t, a) => t + a.amount - a.recoveredAmount, 0)
}

export const generatePayroll = async ({ user, month, propertyId }) => {
  assertOwner(user)
  const properties = await visibleProperties(user, propertyId)
  const filter = { organization: user.organization, status: { $in: ['ACTIVE', 'LEFT'] }, joinDate: { $lte: `${month}-31` } }
  if (properties) filter.property = { $in: properties }
  // People who left before this month started have nothing to be paid.
  const employees = (await Employee.find(filter)).filter((e) => !e.leftDate || e.leftDate >= `${month}-01`)

  let created = 0
  let updated = 0
  let locked = 0
  for (const employee of employees) {
    const existing = await Payroll.findOne({ employee: employee._id, month })
    if (existing?.status === 'PAID') { locked++; continue }

    const [records, adjustments, advanceBalance] = await Promise.all([
      Attendance.find({ employee: employee._id, date: { $gte: `${month}-01`, $lte: `${month}-31` } }).lean(),
      PayrollAdjustment.find({ employee: employee._id, month, type: { $in: ['BONUS', 'DEDUCTION'] }, status: 'OPEN' }).lean(),
      advanceBalanceFor(employee._id, month),
    ])
    const figures = calculatePayroll({ employee, month, records, adjustments, advanceBalance })

    if (existing) { Object.assign(existing, figures); await existing.save(); updated++ }
    else { await Payroll.create({ ...figures, organization: user.organization, property: employee.property, employee: employee._id, month }); created++ }
  }
  return { month, created, updated, locked }
}

export const listPayroll = async ({ user, month, propertyId }) => {
  assertOwner(user)
  const properties = await visibleProperties(user, propertyId)
  const filter = { organization: user.organization, month }
  if (properties) filter.property = { $in: properties }
  const rows = await Payroll.find(filter).populate('employee', 'name designation phone').populate('property', 'name').sort({ status: 1 })
  const sum = (list, key = 'netPay') => list.reduce((t, r) => t + r[key], 0)
  return {
    payrolls: rows,
    summary: {
      count: rows.length, totalNet: sum(rows), paid: sum(rows.filter((r) => r.status === 'PAID')),
      pending: sum(rows.filter((r) => r.status === 'DRAFT')), advanceRecovered: sum(rows, 'advanceRecovered'),
    },
  }
}

export const getPayroll = async ({ user, payrollId }) => {
  assertOwner(user)
  const payroll = await Payroll.findOne({ _id: payrollId, organization: user.organization })
    .populate('employee', 'name designation phone joinDate').populate('property', 'name city')
  if (!payroll) throw fail('Salary record not found.', 404)
  return payroll
}

// Marks a salary as paid: settles advances / bonuses / deductions and records the money as a SALARY expense.
export const payPayroll = async ({ user, payrollId, method, reference, paidOn }) => {
  assertOwner(user)
  const payroll = await Payroll.findOne({ _id: payrollId, organization: user.organization }).populate('employee', 'name')
  if (!payroll) throw fail('Salary record not found.', 404)
  if (payroll.status === 'PAID') throw fail('This salary is already paid.', 409)

  const date = paidOn || todayText()

  // Take back advances, oldest first, up to the amount shown on the slip.
  let toRecover = payroll.advanceRecovered
  const advances = await PayrollAdjustment.find({ employee: payroll.employee._id, type: 'ADVANCE', status: 'OPEN', month: { $lte: payroll.month } }).sort({ date: 1 })
  for (const advance of advances) {
    if (toRecover <= 0) break
    const take = Math.min(toRecover, advance.amount - advance.recoveredAmount)
    advance.recoveredAmount += take
    if (advance.recoveredAmount >= advance.amount) advance.status = 'APPLIED'
    await advance.save()
    toRecover -= take
  }
  await PayrollAdjustment.updateMany(
    { employee: payroll.employee._id, month: payroll.month, type: { $in: ['BONUS', 'DEDUCTION'] }, status: 'OPEN' },
    { $set: { status: 'APPLIED' } }
  )

  const expense = payroll.netPay > 0
    ? await Expense.create({
        organization: payroll.organization, property: payroll.property, category: 'SALARY', amount: Math.round(payroll.netPay),
        paymentMethod: method === 'OTHER' ? 'OTHER' : method, expenseDate: new Date(`${date}T00:00:00`),
        description: `Salary - ${payroll.employee.name} - ${payroll.month}`, recordedBy: user._id,
      })
    : null

  Object.assign(payroll, { status: 'PAID', paidOn: date, paymentMethod: method, reference: reference || null, expense: expense?._id || null, paidBy: user._id })
  await payroll.save()
  return payroll
}
