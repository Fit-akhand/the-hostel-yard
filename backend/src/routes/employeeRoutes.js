import express from 'express'
import { protect } from '../middlewares/authMiddleware.js'
import { validate, validateParams, validateQuery } from '../middlewares/validateMiddleware.js'
import * as v from '../validators/employeeValidator.js'
import * as c from '../controllers/employeeController.js'

export const employeeRouter = express.Router()
employeeRouter.use(protect)
employeeRouter.get('/', validateQuery(v.employeeListQuerySchema), c.listEmployees)
employeeRouter.post('/', validate(v.createEmployeeSchema), c.createEmployee)
employeeRouter.get('/:id', validateParams(v.idParamSchema), c.getEmployee)
employeeRouter.put('/:id', validateParams(v.idParamSchema), validate(v.updateEmployeeSchema), c.updateEmployee)
employeeRouter.patch('/:id/status', validateParams(v.idParamSchema), validate(v.employeeStatusSchema), c.setEmployeeStatus)

export const attendanceRouter = express.Router()
attendanceRouter.use(protect)
attendanceRouter.get('/', validateQuery(v.attendanceSheetQuerySchema), c.getAttendanceSheet)
attendanceRouter.put('/', validate(v.saveAttendanceSchema), c.saveAttendance)
attendanceRouter.get('/month', validateQuery(v.monthAttendanceQuerySchema), c.getMonthAttendance)

export const payrollRouter = express.Router()
payrollRouter.use(protect)
payrollRouter.get('/', validateQuery(v.payrollListQuerySchema), c.listPayroll)
payrollRouter.post('/generate', validate(v.generatePayrollSchema), c.generatePayroll)
payrollRouter.get('/adjustments', validateQuery(v.adjustmentListQuerySchema), c.listAdjustments)
payrollRouter.post('/adjustments', validate(v.createAdjustmentSchema), c.createAdjustment)
payrollRouter.delete('/adjustments/:id', validateParams(v.idParamSchema), c.deleteAdjustment)
payrollRouter.get('/:id', validateParams(v.idParamSchema), c.getPayroll)
payrollRouter.post('/:id/pay', validateParams(v.idParamSchema), validate(v.payPayrollSchema), c.payPayroll)
