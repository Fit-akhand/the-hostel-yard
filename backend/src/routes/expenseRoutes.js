import express from 'express'

import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  voidExpense,
} from '../controllers/expenseController.js'

import { protect } from '../middlewares/authMiddleware.js'

import {
  validate,
  validateParams,
  validateQuery,
} from '../middlewares/validateMiddleware.js'

import {
  expenseIdParamSchema,
  createExpenseSchema,
  updateExpenseSchema,
  voidExpenseSchema,
  expenseListQuerySchema,
} from '../validators/expenseValidator.js'

const router = express.Router()

// --------------------------------------------------
// GET EXPENSES
// --------------------------------------------------

router.get(
  '/',
  protect,
  validateQuery(
    expenseListQuerySchema
  ),
  getExpenses
)

// --------------------------------------------------
// CREATE EXPENSE
// --------------------------------------------------

router.post(
  '/',
  protect,
  validate(createExpenseSchema),
  createExpense
)

// --------------------------------------------------
// GET EXPENSE BY ID
// --------------------------------------------------

router.get(
  '/:expenseId',
  protect,
  validateParams(
    expenseIdParamSchema
  ),
  getExpenseById
)

// --------------------------------------------------
// UPDATE EXPENSE
// --------------------------------------------------

router.put(
  '/:expenseId',
  protect,
  validateParams(
    expenseIdParamSchema
  ),
  validate(updateExpenseSchema),
  updateExpense
)

// --------------------------------------------------
// VOID EXPENSE
// --------------------------------------------------

router.post(
  '/:expenseId/void',
  protect,
  validateParams(
    expenseIdParamSchema
  ),
  validate(voidExpenseSchema),
  voidExpense
)

export default router