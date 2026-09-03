import Expense from '../models/Expense.js'
import Property from '../models/Property.js'
import PropertyManagerAssignment from '../models/PropertyManagerAssignment.js'
import StaffAssignment from '../models/StaffAssignment.js'

import { PERMISSIONS } from '../constants/permissions.js'

// --------------------------------------------------
// ERROR
// --------------------------------------------------

const createError = (
  message,
  statusCode
) => {
  const error = new Error(message)

  error.statusCode = statusCode

  return error
}

// --------------------------------------------------
// PROPERTY ACCESS
// --------------------------------------------------

const checkExpenseAccess = async ({
  user,
  propertyId,
  permission,
}) => {
  if (!user.organization) {
    throw createError(
      'User is not associated with an organization.',
      400
    )
  }

  // BUSINESS OWNER
  if (
    user.role === 'BUSINESS_OWNER'
  ) {
    return
  }

  // PROPERTY MANAGER
  if (
    user.role === 'PROPERTY_MANAGER'
  ) {
    const assignment =
      await PropertyManagerAssignment.findOne({
        manager: user._id,
        property: propertyId,
        status: 'ACTIVE',
      })

    if (!assignment) {
      throw createError(
        'You are not assigned to this property.',
        403
      )
    }

    if (
      permission &&
      !assignment.permissions.includes(
        permission
      )
    ) {
      throw createError(
        'You do not have permission to perform this action.',
        403
      )
    }

    return
  }

  // STAFF
if (user.role === 'STAFF') {
  const assignment = await StaffAssignment.findOne({
    staff: user._id,
    property: propertyId,
    status: 'ACTIVE',
  })

  if (!assignment) {
    throw createError(
      'You are not assigned to this property.',
      403
    )
  }

  if (
    permission &&
    !assignment.permissions.includes(permission)
  ) {
    throw createError(
      'You do not have permission to perform this action.',
      403
    )
  }

  return
}

  throw createError(
    'You are not authorized to access expenses.',
    403
  )
}

// --------------------------------------------------
// VERIFY PROPERTY
// --------------------------------------------------

const getProperty = async ({
  user,
  propertyId,
}) => {
  const property =
    await Property.findOne({
      _id: propertyId,
      organization: user.organization,
    })

  if (!property) {
    throw createError(
      'Property not found.',
      404
    )
  }

  return property
}

// --------------------------------------------------
// CREATE EXPENSE
// --------------------------------------------------

export const createExpense = async ({
  user,
  expenseData,
}) => {
  const {
    propertyId,
    category,
    amount,
    paymentMethod,
    expenseDate,
    description,
    receiptUrl,
  } = expenseData

  await getProperty({
    user,
    propertyId,
  })

  await checkExpenseAccess({
    user,
    propertyId,
    permission:
      PERMISSIONS.ADD_EXPENSES,
  })

  const expense =
    await Expense.create({
      organization:
        user.organization,

      property:
        propertyId,

      category,

      amount,

      paymentMethod,

      expenseDate,

      description:
        description || null,

      receiptUrl:
        receiptUrl || null,

      recordedBy:
        user._id,

      status: 'ACTIVE',
    })

  return expense
}

// --------------------------------------------------
// GET EXPENSES
// --------------------------------------------------

export const getExpenses = async ({
  user,
  propertyId,
  category,
  paymentMethod,
  status,
  startDate,
  endDate,
}) => {
  if (!user.organization) {
    throw createError(
      'User is not associated with an organization.',
      400
    )
  }

  const filter = {
    organization:
      user.organization,
  }

  if (propertyId) {
    filter.property =
      propertyId
  }

  if (category) {
    filter.category =
      category
  }

  if (paymentMethod) {
    filter.paymentMethod =
      paymentMethod
  }

  if (status) {
    filter.status =
      status
  }

  if (startDate || endDate) {
    filter.expenseDate = {}

    if (startDate) {
      filter.expenseDate.$gte =
        startDate
    }

    if (endDate) {
      filter.expenseDate.$lte =
        endDate
    }
  }

  // BUSINESS OWNER
  if (
    user.role === 'BUSINESS_OWNER'
  ) {
    return Expense.find(filter)
      .populate(
        'property',
        'name type city state'
      )
      .populate(
        'recordedBy',
        'name email role'
      )
      .populate(
        'voidedBy',
        'name email role'
      )
      .sort({
        expenseDate: -1,
        createdAt: -1,
      })
  }

  // PROPERTY MANAGER
  if (
    user.role === 'PROPERTY_MANAGER'
  ) {
    const assignments =
      await PropertyManagerAssignment.find({
        manager: user._id,
        status: 'ACTIVE',
      }).select('property permissions')

    const allowedProperties =
      assignments
        .filter((assignment) =>
          assignment.permissions.includes(
            PERMISSIONS.VIEW_EXPENSES
          )
        )
        .map(
          (assignment) =>
            assignment.property
        )

    if (
      allowedProperties.length === 0
    ) {
      return []
    }

    filter.property = {
      $in: allowedProperties,
    }

    return Expense.find(filter)
      .populate(
        'property',
        'name type city state'
      )
      .populate(
        'recordedBy',
        'name email role'
      )
      .populate(
        'voidedBy',
        'name email role'
      )
      .sort({
        expenseDate: -1,
        createdAt: -1,
      })
  }

  // STAFF
if (user.role === 'STAFF') {
  const assignments =
    await StaffAssignment.find({
      staff: user._id,
      status: 'ACTIVE',
    }).select('property permissions')

  const allowedProperties =
    assignments
      .filter((assignment) =>
        assignment.permissions.includes(
          PERMISSIONS.VIEW_EXPENSES
        )
      )
      .map(
        (assignment) =>
          assignment.property
      )

  if (
    allowedProperties.length === 0
  ) {
    throw createError(
      'You are not authorized to view expenses.',
      403
    )
  }

  filter.property = {
    $in: allowedProperties,
  }

  return Expense.find(filter)
    .populate(
      'property',
      'name type city state'
    )
    .populate(
      'recordedBy',
      'name email role'
    )
    .populate(
      'voidedBy',
      'name email role'
    )
    .sort({
      expenseDate: -1,
      createdAt: -1,
    })
}

  throw createError(
    'You are not authorized to view expenses.',
    403
  )
}

// --------------------------------------------------
// GET EXPENSE BY ID
// --------------------------------------------------

export const getExpenseById = async ({
  user,
  expenseId,
}) => {
  if (!user.organization) {
    throw createError(
      'User is not associated with an organization.',
      400
    )
  }

  const expense =
    await Expense.findOne({
      _id: expenseId,
      organization:
        user.organization,
    })
      .populate(
        'property',
        'name type address city state pincode status'
      )
      .populate(
        'recordedBy',
        'name email role'
      )
      .populate(
        'voidedBy',
        'name email role'
      )

  if (!expense) {
    throw createError(
      'Expense not found.',
      404
    )
  }

  await checkExpenseAccess({
    user,
    propertyId:
      expense.property._id,
    permission:
      PERMISSIONS.VIEW_EXPENSES,
  })

  return expense
}

// --------------------------------------------------
// UPDATE EXPENSE
// --------------------------------------------------

export const updateExpense = async ({
  user,
  expenseId,
  expenseData,
}) => {
  if (!user.organization) {
    throw createError(
      'User is not associated with an organization.',
      400
    )
  }

  const expense =
    await Expense.findOne({
      _id: expenseId,
      organization:
        user.organization,
    })

  if (!expense) {
    throw createError(
      'Expense not found.',
      404
    )
  }

  if (
    expense.status === 'VOIDED'
  ) {
    throw createError(
      'A voided expense cannot be updated.',
      409
    )
  }

  await checkExpenseAccess({
    user,
    propertyId:
      expense.property,
    permission:
      PERMISSIONS.EDIT_EXPENSES,
  })

  const allowedFields = [
    'category',
    'amount',
    'paymentMethod',
    'expenseDate',
    'description',
    'receiptUrl',
  ]

  for (
    const field of allowedFields
  ) {
    if (
      expenseData[field] !==
      undefined
    ) {
      expense[field] =
        expenseData[field]
    }
  }

  await expense.save()

  return expense
}

// --------------------------------------------------
// VOID EXPENSE
// --------------------------------------------------

export const voidExpense = async ({
  user,
  expenseId,
  reason,
}) => {
  if (!user.organization) {
    throw createError(
      'User is not associated with an organization.',
      400
    )
  }

  const expense =
    await Expense.findOne({
      _id: expenseId,
      organization:
        user.organization,
    })

  if (!expense) {
    throw createError(
      'Expense not found.',
      404
    )
  }

  if (
    expense.status === 'VOIDED'
  ) {
    throw createError(
      'Expense is already voided.',
      409
    )
  }

  await checkExpenseAccess({
    user,
    propertyId:
      expense.property,
    permission:
      PERMISSIONS.REMOVE_EXPENSES,
  })

  expense.status =
    'VOIDED'

  expense.voidedBy =
    user._id

  expense.voidedAt =
    new Date()

  expense.voidReason =
    reason

  await expense.save()

  return expense
}

// --------------------------------------------------
// DELETE EXPENSE
// --------------------------------------------------
//
// Intentionally disabled for now.
//
// Financial records should be voided instead of
// permanently deleted.
//
// --------------------------------------------------