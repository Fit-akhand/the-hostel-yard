import * as svc from '../services/employeeService.js'

// Wraps a service call: `run(req)` returns the data, the response shape stays uniform.
const handle = (run, { status = 200, message } = {}) => async (req, res, next) => {
  try {
    const data = await run(req)
    res.status(status).json({ success: true, message, data })
  } catch (error) {
    next(error)
  }
}

export const listEmployees = handle((req) => svc.listEmployees({ user: req.user, ...req.validatedQuery }).then((employees) => ({ employees })))
export const getEmployee = handle((req) => svc.getEmployee({ user: req.user, employeeId: req.params.id }).then((employee) => ({ employee })))
export const createEmployee = handle((req) => svc.createEmployee({ user: req.user, data: req.body }).then((employee) => ({ employee })), { status: 201, message: 'Employee added.' })
export const updateEmployee = handle((req) => svc.updateEmployee({ user: req.user, employeeId: req.params.id, data: req.body }).then((employee) => ({ employee })), { message: 'Employee updated.' })
export const setEmployeeStatus = handle((req) => svc.setEmployeeStatus({ user: req.user, employeeId: req.params.id, ...req.body }).then((employee) => ({ employee })), { message: 'Employee status updated.' })

export const getAttendanceSheet = handle((req) => svc.getAttendanceSheet({ user: req.user, ...req.validatedQuery }).then((sheet) => ({ sheet })))
export const saveAttendance = handle((req) => svc.saveAttendance({ user: req.user, ...req.body }), { message: 'Attendance saved.' })
export const getMonthAttendance = handle((req) => svc.getMonthAttendance({ user: req.user, ...req.validatedQuery }).then((records) => ({ records })))

export const listAdjustments = handle((req) => svc.listAdjustments({ user: req.user, ...req.validatedQuery }).then((adjustments) => ({ adjustments })))
export const createAdjustment = handle((req) => svc.createAdjustment({ user: req.user, data: req.body }).then((adjustment) => ({ adjustment })), { status: 201, message: 'Entry added.' })
export const deleteAdjustment = handle((req) => svc.deleteAdjustment({ user: req.user, adjustmentId: req.params.id }), { message: 'Entry removed.' })

export const generatePayroll = handle((req) => svc.generatePayroll({ user: req.user, ...req.body }), { message: 'Salaries calculated.' })
export const listPayroll = handle((req) => svc.listPayroll({ user: req.user, ...req.validatedQuery }))
export const getPayroll = handle((req) => svc.getPayroll({ user: req.user, payrollId: req.params.id }).then((payroll) => ({ payroll })))
export const payPayroll = handle((req) => svc.payPayroll({ user: req.user, payrollId: req.params.id, ...req.body }).then((payroll) => ({ payroll })), { message: 'Salary marked as paid.' })
