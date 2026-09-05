import mongoose from 'mongoose'

import Payment from '../models/Payment.js'
import RentDue from '../models/RentDue.js'
import Tenant from '../models/Tenant.js'
import PaymentSettings from '../models/PaymentSettings.js'
import Allocation from '../models/Allocation.js'
import User from '../models/User.js'
import {
  createNotification,
  createNotifications,
} from './notificationService.js'


import StaffAssignment from '../models/StaffAssignment.js'
import PropertyManagerAssignment from '../models/PropertyManagerAssignment.js'
import { PERMISSIONS } from '../constants/permissions.js'


const createError = (
  message,
  statusCode
) => {
  const error = new Error(message)
  
  error.statusCode =
  statusCode
  
  return error
}

// const notifyPropertyManagerPaymentReceived = async ({ payment }) => {
//   const managerAssignment = await PropertyManagerAssignment.findOne({
//     property: payment.property,
//     status: 'ACTIVE',
//   }).select('manager')

//   if (!managerAssignment?.manager) {
//     return null
//   }

//   const manager = await User.findOne({
//     _id: managerAssignment.manager,
//     organization: payment.organization,
//     role: 'PROPERTY_MANAGER',
//     status: 'ACTIVE',
//   }).select('_id')

//   if (!manager) {
//     return null
//   }

//   return createNotification({
//     recipient: manager._id,
//     organization: payment.organization,
//     property: payment.property,
//     type: 'PAYMENT_RECEIVED',
//     title: 'New Payment Received',
//     message: `A rent payment of ₹${payment.amount} has been submitted for verification.`,
//     data: {
//       paymentId: payment._id,
//       tenantId: payment.tenant,
//       rentDueId: payment.rentDue,
//       amount: payment.amount,
//       method: payment.method,
//       transactionReference: payment.transactionReference,
//       status: payment.status,
//     },
//     createdBy: payment.recordedBy,
//   })
// }

const notifyPropertyManagerPaymentReceived = async ({ payment }) => {
  console.log('🔔 PAYMENT_RECEIVED: finding manager...')
  console.log('Property:', payment.property)
  console.log('Organization:', payment.organization)

  const managerAssignments = await PropertyManagerAssignment.find({
    property: payment.property,
    status: 'ACTIVE',
  }).select('manager')

  const managerIds = managerAssignments
    .map((assignment) => assignment.manager)
    .filter(Boolean)

  if (!managerIds.length) {
    console.log('❌ No active managers found')
    return []
  }

  const managers = await User.find({
    _id: { $in: managerIds },
    organization: payment.organization,
    role: 'PROPERTY_MANAGER',
    status: 'ACTIVE',
  }).select('_id')

  if (!managers.length) {
    console.log('❌ No valid active managers found')
    return []
  }

  return createNotifications({
    recipients: managers.map((manager) => manager._id),
    organization: payment.organization,
    property: payment.property,
    type: 'PAYMENT_RECEIVED',
    title: 'New Payment Received',
    message: `A rent payment of ₹${payment.amount} has been submitted for verification.`,
    data: {
      paymentId: payment._id,
      tenantId: payment.tenant,
      rentDueId: payment.rentDue,
      amount: payment.amount,
      method: payment.method,
      transactionReference: payment.transactionReference,
      status: payment.status,
    },
    createdBy: payment.recordedBy,
  })
}

// --------------------------------------------------
// CHECK PAYMENT ACCESS
// --------------------------------------------------

const checkPaymentAccess = async ({
  user,
  propertyId,
  permission,
}) => {
  if (!user.organization) {
    const error = new Error(
      'User is not associated with an organization.'
    )

    error.statusCode = 400
    throw error
  }

  // BUSINESS OWNER
  if (user.role === 'BUSINESS_OWNER') {
    return true
  }

  // PROPERTY MANAGER
  if (user.role === 'PROPERTY_MANAGER') {
    const assignment =
      await PropertyManagerAssignment.findOne({
        manager: user._id,
        property: propertyId,
        status: 'ACTIVE',
      })

    if (!assignment) {
      const error = new Error(
        'You are not assigned to this property.'
      )

      error.statusCode = 403
      throw error
    }

    if (
      permission &&
      !assignment.permissions.includes(permission)
    ) {
      const error = new Error(
        'You do not have permission to perform this action.'
      )

      error.statusCode = 403
      throw error
    }

    return true
  }

  // STAFF
  if (user.role === 'STAFF') {
    const assignment =
      await StaffAssignment.findOne({
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

    return true
  }

  // OTHER ROLES
  const error = new Error(
    'You are not authorized to access payments.'
  )

  error.statusCode = 403
  throw error
}

// --------------------------------------------------
// CHECK PAYMENT VERIFICATION ACCESS
// --------------------------------------------------

// --------------------------------------------------
// CHECK PAYMENT VERIFICATION ACCESS
// --------------------------------------------------

// --------------------------------------------------
// CHECK PAYMENT VERIFICATION ACCESS
// --------------------------------------------------

const checkPaymentVerificationAccess = async ({
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
  if (user.role === 'BUSINESS_OWNER') {
    return
  }

  // PROPERTY MANAGER
  if (user.role === 'PROPERTY_MANAGER') {
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

  // TENANT / STAFF / OTHER ROLES
  throw createError(
    'Only business owners and property managers can verify or reject payments.',
    403
  )
}

// --------------------------------------------------
// CREATE PAYMENT
// --------------------------------------------------

export const createPayment = async ({
  user,
  paymentData,
}) => {
  if (!user.organization) {
    const error = new Error(
      'User is not associated with an organization.'
    )

    error.statusCode = 400
    throw error
  }

  const rentDue = await RentDue.findOne({
    _id: paymentData.rentDueId,
    organization: user.organization,
  })

  if (!rentDue) {
    const error = new Error(
      'Rent due not found.'
    )

    error.statusCode = 404
    throw error
  }

  // Check property access + COLLECT_RENT
  await checkPaymentAccess({
    user,
    propertyId: rentDue.property,
    permission: PERMISSIONS.COLLECT_RENT,
  })

  // Cannot pay an already fully paid due.
  if (rentDue.status === 'PAID') {
    const error = new Error(
      'This rent due has already been fully paid.'
    )

    error.statusCode = 409
    throw error
  }

  const remainingAmount =
    rentDue.amount - rentDue.paidAmount

  if (remainingAmount <= 0) {
    const error = new Error(
      'No remaining amount is due.'
    )

    error.statusCode = 409
    throw error
  }

  if (paymentData.amount > remainingAmount) {
    const error = new Error(
      `Payment amount cannot exceed the remaining due amount of ₹${remainingAmount}.`
    )

    error.statusCode = 400
    throw error
  }

  const payment = await Payment.create({
    organization: rentDue.organization,
    property: rentDue.property,
    tenant: rentDue.tenant,
    rentDue: rentDue._id,
    amount: paymentData.amount,
    method: paymentData.method,
    transactionReference:
      paymentData.transactionReference || null,
    paymentDate: paymentData.paymentDate,
    notes: paymentData.notes || null,
    recordedBy: user._id,
    status: 'PENDING',
  })

  return payment
}

const createPaymentReceivedNotifications = async ({
  payment,
}) => {
  const managerAssignments =
    await PropertyManagerAssignment.find({
      property: payment.property,
      status: 'ACTIVE',
    }).select('manager')

  const managerIds =
    managerAssignments.map(
      (assignment) => assignment.manager
    )

  const businessOwners =
    await User.find({
      organization: payment.organization,
      role: 'BUSINESS_OWNER',
      status: 'ACTIVE',
    }).select('_id')

  const recipients = [
    ...managerIds,
    ...businessOwners.map(
      (owner) => owner._id
    ),
  ]

  if (!recipients.length) {
    return []
  }

  return createNotifications({
    recipients,

    organization:
      payment.organization,

    property:
      payment.property,

    type:
      'PAYMENT_RECEIVED',

    title:
      'New Payment Received',

    message:
      `A rent payment of ₹${payment.amount} has been submitted.`,

    data: {
      paymentId:
        payment._id,

      tenantId:
        payment.tenant,

      rentDueId:
        payment.rentDue,

      amount:
        payment.amount,

      method:
        payment.method,

      transactionReference:
        payment.transactionReference,

      status:
        payment.status,
    },

    createdBy:
      payment.recordedBy,
  })
}

// --------------------------------------------------
// CREATE PAYMENT - TENANT
// --------------------------------------------------

export const createTenantPayment = async ({
  user,
  paymentData,
}) => {
  // ------------------------------------------------
  // USER VALIDATION
  // ------------------------------------------------

  if (!user.organization) {
    throw createError(
      'User is not associated with an organization.',
      400
    )
  }

  if (user.role !== 'TENANT') {
    throw createError(
      'Only tenants can submit rent payments.',
      403
    )
  }

  // ------------------------------------------------
  // FIND TENANT PROFILE
  // ------------------------------------------------

  const tenant =
    await Tenant.findOne({
      user: user._id,
      organization: user.organization,
    })

  if (!tenant) {
    throw createError(
      'Tenant profile not found.',
      404
    )
  }

  // ------------------------------------------------
  // FIND RENT DUE
  // ------------------------------------------------

  const rentDue =
    await RentDue.findOne({
      _id: paymentData.rentDueId,
      organization: user.organization,
      tenant: tenant._id,
    })

  if (!rentDue) {
    throw createError(
      'Rent due not found for this tenant.',
      404
    )
  }

  // ------------------------------------------------
  // RENT DUE STATUS
  // ------------------------------------------------

  if (rentDue.status === 'PAID') {
    throw createError(
      'This rent due has already been fully paid.',
      409
    )
  }

  // ------------------------------------------------
  // REMAINING AMOUNT
  // ------------------------------------------------

  const remainingAmount =
    rentDue.amount -
    rentDue.paidAmount

  if (remainingAmount <= 0) {
    throw createError(
      'No remaining amount is due.',
      409
    )
  }

  if (
    paymentData.amount >
    remainingAmount
  ) {
    throw createError(
      `Payment amount cannot exceed the remaining due amount of ₹${remainingAmount}.`,
      400
    )
  }

  // ------------------------------------------------
  // PAYMENT METHOD
  // ------------------------------------------------

  if (
    paymentData.method !== 'UPI'
  ) {
    throw createError(
      'Tenants can only submit UPI payments through this endpoint.',
      400
    )
  }

  // ------------------------------------------------
  // PAYMENT SETTINGS
  // ------------------------------------------------

  const paymentSettings =
    await PaymentSettings.findOne({
      organization:
        user.organization,

      property:
        rentDue.property,

      isEnabled: true,
    })

  if (!paymentSettings) {
    throw createError(
      'Online payment is currently unavailable for this property.',
      400
    )
  }

  // ------------------------------------------------
  // DUPLICATE UTR CHECK
  // ------------------------------------------------

  const existingPayment =
    await Payment.findOne({
      organization:
        user.organization,

      transactionReference:
        paymentData.transactionReference,

      status: {
        $in: [
          'PENDING',
          'VERIFIED',
        ],
      },
    })

  if (existingPayment) {
    throw createError(
      'A payment with this transaction reference already exists.',
      409
    )
  }

  // ------------------------------------------------
  // CREATE PAYMENT
  // ------------------------------------------------

  const payment =
  await Payment.create({
    organization:
      rentDue.organization,

    property:
      rentDue.property,

    tenant:
      tenant._id,

    rentDue:
      rentDue._id,

    amount:
      paymentData.amount,

    method:
      'UPI',

    transactionReference:
      paymentData.transactionReference,

    paymentDate:
      paymentData.paymentDate,

    notes:
      paymentData.notes || null,

    recordedBy:
      user._id,

    status:
      'PENDING',

    verifiedBy:
      null,

    verifiedAt:
      null,
  })

  try {
  await notifyPropertyManagerPaymentReceived({
    payment,
  })
} catch (error) {
  console.error(
    'Failed to create PAYMENT_RECEIVED notification:',
    error
  )
}

return payment
}

// --------------------------------------------------
// GET TENANT PAYMENT INFORMATION
// --------------------------------------------------

export const getTenantPaymentInformation = async ({
  user,
}) => {
  if (!user.organization) {
    throw createError(
      'User is not associated with an organization.',
      400
    )
  }

  // TENANT ONLY
  if (user.role !== 'TENANT') {
    throw createError(
      'Only tenants can access this payment information.',
      403
    )
  }

  // FIND TENANT PROFILE
  const tenant =
    await Tenant.findOne({
      user: user._id,
      organization: user.organization,
    }).populate(
      'property',
      'name type address city state pincode status'
    )

  if (!tenant) {
    throw createError(
      'Tenant profile not found.',
      404
    )
  }

  // GET ALL RENT DUES FOR THIS TENANT
  const dues =
    await RentDue.find({
      organization:
        user.organization,

      tenant:
        tenant._id,
    })
      .populate(
        'rentPlan',
        'monthlyRent dueDay'
      )
      .sort({
        dueDate: -1,
      })

  // GET ACTIVE PAYMENT SETTINGS
  const paymentSettings =
    await PaymentSettings.findOne({
      organization:
        user.organization,

      property:
        tenant.property._id,

      isEnabled: true,
    }).select(
      'upiId accountName qrImageUrl paymentInstructions isEnabled'
    )

  return {
    tenant: {
      id: tenant._id,
      name: tenant.name,
      phone: tenant.phone,
      email: tenant.email,
      status: tenant.status,
    },

    property:
      tenant.property,

    dues,

    paymentSettings:
      paymentSettings || null,
  }
}

// --------------------------------------------------
// GET PAYMENTS
// --------------------------------------------------

export const getPayments = async ({
  user,
  status,
  method,
  tenantId,
  rentDueId,
}) => {
  if (!user.organization) {
    const error = new Error(
      'User is not associated with an organization.'
    )

    error.statusCode = 400
    throw error
  }

  const filter = {
    organization: user.organization,
  }

  if (status) {
    filter.status = status
  }

  if (method) {
    filter.method = method
  }

  if (tenantId) {
    filter.tenant = tenantId
  }

  if (rentDueId) {
    filter.rentDue = rentDueId
  }

  // Owner can see organization payments.
  if (user.role === 'BUSINESS_OWNER') {
    return Payment.find(filter)
      .populate(
        'property',
        'name type city state'
      )
      .populate(
        'tenant',
        'name phone email status'
      )
      .populate(
        'rentDue',
        'billingMonth amount paidAmount status dueDate'
      )
      .populate(
        'recordedBy',
        'name email role'
      )
      .populate(
        'verifiedBy',
        'name email role'
      )
      .sort({
        createdAt: -1,
      })
  }

  if (user.role === 'PROPERTY_MANAGER') {
    const assignments =
      await PropertyManagerAssignment.find({
        manager: user._id,
        status: 'ACTIVE',
      }).select('property')

    const propertyIds =
      assignments.map(
        (assignment) =>
          assignment.property
      )

    if (propertyIds.length === 0) {
      return []
    }

    filter.property = {
      $in: propertyIds,
    }

    return Payment.find(filter)
      .populate(
        'property',
        'name type city state'
      )
      .populate(
        'tenant',
        'name phone email status'
      )
      .populate(
        'rentDue',
        'billingMonth amount paidAmount status dueDate'
      )
      .populate(
        'recordedBy',
        'name email role'
      )
      .populate(
        'verifiedBy',
        'name email role'
      )
      .sort({
        createdAt: -1,
      })
  }

  if (user.role === 'STAFF') {
  const assignments =
    await StaffAssignment.find({
      staff: user._id,
      status: 'ACTIVE',
    }).select('property permissions')

  const viewableProperties =
    assignments
      .filter((assignment) =>
        assignment.permissions.includes(
          PERMISSIONS.VIEW_PAYMENTS
        )
      )
      .map((assignment) => assignment.property)

  if (viewableProperties.length === 0) {
    const error = new Error(
      'You are not authorized to view payments.'
    )

    error.statusCode = 403
    throw error
  }

  filter.property = {
    $in: viewableProperties,
  }

  return Payment.find(filter)
    .populate(
      'property',
      'name type city state'
    )
    .populate(
      'tenant',
      'name phone email status'
    )
    .populate(
      'rentDue',
      'billingMonth amount paidAmount status dueDate'
    )
    .populate(
      'recordedBy',
      'name email role'
    )
    .populate(
      'verifiedBy',
      'name email role'
    )
    .sort({
      createdAt: -1,
    })
}

  const error = new Error(
    'You are not authorized to view payments.'
  )

  error.statusCode = 403
  throw error
}

// --------------------------------------------------
// GET PAYMENT BY ID
// --------------------------------------------------

export const getPaymentById = async ({
  user,
  paymentId,
}) => {
  if (!user.organization) {
    const error = new Error(
      'User is not associated with an organization.'
    )

    error.statusCode = 400
    throw error
  }

  const payment = await Payment.findOne({
    _id: paymentId,
    organization: user.organization,
  })
    .populate(
      'property',
      'name type city state'
    )
    .populate(
      'tenant',
      'name phone email status'
    )
    .populate(
      'rentDue',
      'billingMonth amount paidAmount status dueDate'
    )
    .populate(
      'recordedBy',
      'name email role'
    )
    .populate(
      'verifiedBy',
      'name email role'
    )

  if (!payment) {
    const error = new Error(
      'Payment not found.'
    )

    error.statusCode = 404
    throw error
  }

  await checkPaymentAccess({
    user,
    propertyId: payment.property._id,
    permission: PERMISSIONS.VIEW_PAYMENTS,
  })

  return payment
}

// --------------------------------------------------
// VERIFY PAYMENT
// --------------------------------------------------

export const verifyPayment = async ({
  user,
  paymentId,
}) => {
  if (!user.organization) {
    const error = new Error(
      'User is not associated with an organization.'
    )

    error.statusCode = 400
    throw error
  }

  const session =
    await mongoose.startSession()

  try {
    session.startTransaction()

    const payment =
      await Payment.findOne({
        _id: paymentId,
        organization: user.organization,
      }).session(session)

    if (!payment) {
      const error = new Error(
        'Payment not found.'
      )

      error.statusCode = 404
      throw error
    }

    await checkPaymentVerificationAccess({
      user,
      propertyId: payment.property,
      permission: PERMISSIONS.VERIFY_PAYMENTS,
    })

    if (payment.status === 'VERIFIED') {
      const error = new Error(
        'Payment has already been verified.'
      )

      error.statusCode = 409
      throw error
    }

    if (payment.status === 'REJECTED') {
      const error = new Error(
        'A rejected payment cannot be verified.'
      )

      error.statusCode = 400
      throw error
    }

    const rentDue =
      await RentDue.findOne({
        _id: payment.rentDue,
        organization: user.organization,
      }).session(session)

    if (!rentDue) {
      const error = new Error(
        'Rent due associated with this payment was not found.'
      )

      error.statusCode = 404
      throw error
    }

    const remainingAmount =
      rentDue.amount -
      rentDue.paidAmount

    if (payment.amount > remainingAmount) {
      const error = new Error(
        'This payment exceeds the remaining rent due amount.'
      )

      error.statusCode = 409
      throw error
    }

    // Mark payment verified.
    payment.status = 'VERIFIED'
    payment.verifiedBy = user._id
    payment.verifiedAt = new Date()

    payment.rejectedBy = null
    payment.rejectedAt = null
    payment.rejectionReason = null

    await payment.save({
      session,
    })

    // Update rent due.
    rentDue.paidAmount +=
      payment.amount

    if (
      rentDue.paidAmount >=
      rentDue.amount
    ) {
      rentDue.paidAmount =
        rentDue.amount

      rentDue.status = 'PAID'
    } else if (
      rentDue.paidAmount > 0
    ) {
      rentDue.status = 'PARTIAL'
    } else {
      rentDue.status = 'PENDING'
    }

    await rentDue.save({
      session,
    })

    // Notify tenant that payment was verified.
try {
  await createNotification({
    recipient: payment.recordedBy,
    organization: payment.organization,
    property: payment.property,
    type: 'PAYMENT_VERIFIED',
    title: 'Payment Verified',
    message: `Your rent payment of ₹${payment.amount} has been verified successfully.`,
    data: {
      paymentId: payment._id,
      tenantId: payment.tenant,
      rentDueId: payment.rentDue,
      amount: payment.amount,
      method: payment.method,
      transactionReference:
        payment.transactionReference,
      status: payment.status,
    },
    createdBy: user._id,
    session,
  })
} catch (error) {
  console.error(
    'Failed to create PAYMENT_VERIFIED notification:',
    error
  )

  throw error
}

    await session.commitTransaction()

    return payment
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    await session.endSession()
  }
}

// --------------------------------------------------
// REJECT PAYMENT
// --------------------------------------------------

export const rejectPayment = async ({
  user,
  paymentId,
  notes,
}) => {
  if (!user.organization) {
    const error = new Error(
      'User is not associated with an organization.'
    )

    error.statusCode = 400
    throw error
  }

  const payment =
    await Payment.findOne({
      _id: paymentId,
      organization: user.organization,
    })

  if (!payment) {
    const error = new Error(
      'Payment not found.'
    )

    error.statusCode = 404
    throw error
  }

  await checkPaymentVerificationAccess({
    user,
    propertyId: payment.property,
    permission: PERMISSIONS.REJECT_PAYMENTS,
  })

  if (payment.status === 'VERIFIED') {
    const error = new Error(
      'A verified payment cannot be rejected.'
    )

    error.statusCode = 400
    throw error
  }

  if (payment.status === 'REJECTED') {
    const error = new Error(
      'Payment is already rejected.'
    )

    error.statusCode = 409
    throw error
  }

  payment.status = 'REJECTED'

  if (notes !== undefined) {
    payment.rejectionReason = notes
  }

  payment.rejectedBy = user._id
  payment.rejectedAt = new Date()

  payment.verifiedBy = null
  payment.verifiedAt = null

  await payment.save()

try {
  await createNotification({
    recipient: payment.recordedBy,
    organization: payment.organization,
    property: payment.property,
    type: 'PAYMENT_REJECTED',
    title: 'Payment Rejected',
    message: `Your rent payment of ₹${payment.amount} was rejected.${payment.rejectionReason ? ` Reason: ${payment.rejectionReason}` : ''}`,
    data: {
      paymentId: payment._id,
      tenantId: payment.tenant,
      rentDueId: payment.rentDue,
      amount: payment.amount,
      method: payment.method,
      transactionReference:
        payment.transactionReference,
      status: payment.status,
      rejectionReason:
        payment.rejectionReason,
    },
    createdBy: user._id,
  })
} catch (error) {
  console.error(
    'Failed to create PAYMENT_REJECTED notification:',
    error
  )
}

return payment
}

export const getTenantPaymentHistory = async ({
  user,
  tenantId,
  status,
  method,
}) => {
  if (!user.organization) {
    throw createError(
      'User is not associated with an organization.',
      400
    )
  }

  let targetTenantId = tenantId

  // --------------------------------------------------
  // TENANT ACCESS
  // --------------------------------------------------

  if (user.role === 'TENANT') {
    const tenant = await Tenant.findOne({
      user: user._id,
      organization: user.organization,
    }).select('_id name phone email status')

    if (!tenant) {
      throw createError(
        'Tenant account is not linked to a tenant.',
        400
      )
    }

    // Ignore any tenantId supplied by the tenant.
    // Always use the authenticated user's tenant.
    targetTenantId = tenant._id
  }

  // --------------------------------------------------
  // OWNER / MANAGER REQUIRE TENANT ID
  // --------------------------------------------------

  if (
    user.role !== 'TENANT' &&
    !targetTenantId
  ) {
    throw createError(
      'tenantId is required.',
      400
    )
  }

  // --------------------------------------------------
  // FIND TARGET TENANT
  // --------------------------------------------------

  const tenant = await Tenant.findOne({
    _id: targetTenantId,
    organization: user.organization,
  })

  if (!tenant) {
    throw createError(
      'Tenant not found.',
      404
    )
  }

  // --------------------------------------------------
  // PROPERTY MANAGER ACCESS
  // --------------------------------------------------

  if (user.role === 'PROPERTY_MANAGER') {
    const allocation =
      await Allocation.findOne({
        tenant: targetTenantId,
        status: 'ACTIVE',
      })

    if (!allocation) {
      throw createError(
        'Tenant does not have an active allocation.',
        400
      )
    }

    const assignment =
      await PropertyManagerAssignment.findOne({
        manager: user._id,
        property: allocation.property,
        status: 'ACTIVE',
      })

    if (!assignment) {
      throw createError(
        'You are not assigned to this tenant’s property.',
        403
      )
    }

    if (
      !assignment.permissions.includes(
        PERMISSIONS.VIEW_PAYMENTS
      )
    ) {
      throw createError(
        'You do not have permission to view payments.',
        403
      )
    }
  }

  // --------------------------------------------------
  // ROLE ACCESS
  // --------------------------------------------------

  if (
    ![
      'BUSINESS_OWNER',
      'PROPERTY_MANAGER',
      'TENANT',
    ].includes(user.role)
  ) {
    throw createError(
      'You are not authorized to view payment history.',
      403
    )
  }

  // --------------------------------------------------
  // PAYMENT FILTER
  // --------------------------------------------------

  const filter = {
    organization: user.organization,
    tenant: targetTenantId,
  }

  if (status) {
    filter.status = status
  }

  if (method) {
    filter.method = method
  }

  // --------------------------------------------------
  // GET PAYMENT HISTORY
  // --------------------------------------------------

  const payments = await Payment.find(filter)
    .sort({
      paymentDate: -1,
      createdAt: -1,
    })
    .populate(
      'rentDue',
      'billingMonth dueDate amount paidAmount status'
    )
    .populate(
      'recordedBy',
      'name email role'
    )
    .populate(
      'verifiedBy',
      'name email role'
    )
    .populate(
      'rejectedBy',
      'name email role'
    )

  return {
    tenant,
    payments,
  }
}
