import {
  createExpense as createExpenseService,
  getExpenses as getExpensesService,
  getExpenseById as getExpenseByIdService,
  updateExpense as updateExpenseService,
  voidExpense as voidExpenseService,
} from '../services/expenseService.js'

// --------------------------------------------------
// CREATE
// --------------------------------------------------

export const createExpense = async (
  req,
  res,
  next
) => {
  try {
    const expense =
      await createExpenseService({
        user: req.user,
        expenseData: req.body,
      })

    res.status(201).json({
      success: true,
      message:
        'Expense recorded successfully.',
      data: {
        expense,
      },
    })
  } catch (error) {
    next(error)
  }
}

// --------------------------------------------------
// GET ALL
// --------------------------------------------------

export const getExpenses = async (
  req,
  res,
  next
) => {
  try {
    const expenses =
      await getExpensesService({
        user: req.user,
        propertyId:
          req.query.propertyId,
        category:
          req.query.category,
        paymentMethod:
          req.query.paymentMethod,
        status:
          req.query.status,
        startDate:
          req.query.startDate,
        endDate:
          req.query.endDate,
      })

    res.status(200).json({
      success: true,
      message:
        'Expenses retrieved successfully.',
      data: {
        expenses,
      },
    })
  } catch (error) {
    next(error)
  }
}

// --------------------------------------------------
// GET BY ID
// --------------------------------------------------

export const getExpenseById = async (
  req,
  res,
  next
) => {
  try {
    const expense =
      await getExpenseByIdService({
        user: req.user,
        expenseId:
          req.params.expenseId,
      })

    res.status(200).json({
      success: true,
      message:
        'Expense retrieved successfully.',
      data: {
        expense,
      },
    })
  } catch (error) {
    next(error)
  }
}

// --------------------------------------------------
// UPDATE
// --------------------------------------------------

export const updateExpense = async (
  req,
  res,
  next
) => {
  try {
    const expense =
      await updateExpenseService({
        user: req.user,
        expenseId:
          req.params.expenseId,
        expenseData:
          req.body,
      })

    res.status(200).json({
      success: true,
      message:
        'Expense updated successfully.',
      data: {
        expense,
      },
    })
  } catch (error) {
    next(error)
  }
}

// --------------------------------------------------
// VOID
// --------------------------------------------------

export const voidExpense = async (
  req,
  res,
  next
) => {
  try {
    const expense =
      await voidExpenseService({
        user: req.user,
        expenseId:
          req.params.expenseId,
        reason:
          req.body.reason,
      })

    res.status(200).json({
      success: true,
      message:
        'Expense voided successfully.',
      data: {
        expense,
      },
    })
  } catch (error) {
    next(error)
  }
}