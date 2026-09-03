import RentPlan from '../models/RentPlan.js'
import RentDue from '../models/RentDue.js'
import Tenant from '../models/Tenant.js'
import Allocation from '../models/Allocation.js'
import PaymentSettings from '../models/PaymentSettings.js'
import StaffAssignment from '../models/StaffAssignment.js'
import PropertyManagerAssignment from '../models/PropertyManagerAssignment.js'
import { PERMISSIONS } from '../constants/permissions.js'

const createError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const checkPropertyAccess = async ({
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

  if (user.role === 'BUSINESS_OWNER') {
  return
}

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

  return
}

if (user.role !== 'PROPERTY_MANAGER') {
  throw createError(
    'You are not authorized to access this property.',
    403
  )
}
}

export const createRentPlan = async ({
  user,
  rentData,
}) => {
  const {
    tenantId,
    allocationId,
    monthlyRent,
    dueDay,
    startDate,
    notes,
  } = rentData

  const tenant = await Tenant.findOne({
    _id: tenantId,
    organization: user.organization,
    status: 'ACTIVE',
  })

  if (!tenant) {
    throw createError(
      'Active tenant not found.',
      404
    )
  }

  const allocation =
    await Allocation.findOne({
      _id: allocationId,
      organization: user.organization,
      tenant: tenantId,
      status: 'ACTIVE',
    })

  if (!allocation) {
    throw createError(
      'Active bed allocation not found for this tenant.',
      404
    )
  }

  await checkPropertyAccess({
    user,
    propertyId: allocation.property,
    permission: 'ADD_DUES',
  })

  const existingPlan =
    await RentPlan.findOne({
      tenant: tenantId,
      status: 'ACTIVE',
    })

  if (existingPlan) {
    throw createError(
      'Tenant already has an active rent plan.',
      409
    )
  }

  const rentPlan = await RentPlan.create({
    organization: user.organization,
    property: allocation.property,
    tenant: tenantId,
    allocation: allocationId,
    monthlyRent,
    dueDay,
    startDate,
    notes: notes || null,
    status: 'ACTIVE',
  })

  return rentPlan
}

export const generateRentDue = async ({
  user,
  rentPlanId,
  billingMonth,
}) => {
  const rentPlan =
    await RentPlan.findOne({
      _id: rentPlanId,
      organization: user.organization,
      status: 'ACTIVE',
    })

  if (!rentPlan) {
    throw createError(
      'Active rent plan not found.',
      404
    )
  }

  await checkPropertyAccess({
    user,
    propertyId: rentPlan.property,
    permission: 'ADD_DUES',
  })

  const existingDue =
    await RentDue.findOne({
      rentPlan: rentPlan._id,
      billingMonth,
    })

  if (existingDue) {
    throw createError(
      'Rent due for this billing month already exists.',
      409
    )
  }

  const [year, month] =
    billingMonth.split('-').map(Number)

  const dueDate = new Date(
    year,
    month - 1,
    rentPlan.dueDay
  )

  const rentDue = await RentDue.create({
    organization: rentPlan.organization,
    property: rentPlan.property,
    tenant: rentPlan.tenant,
    allocation: rentPlan.allocation,
    rentPlan: rentPlan._id,
    billingMonth,
    dueDate,
    amount: rentPlan.monthlyRent,
    paidAmount: 0,
    status: 'PENDING',
  })

  return rentDue
}

export const getRentPlans = async ({
  user,
  tenantId,
}) => {
  const filter = {
    organization: user.organization,
    status: 'ACTIVE',
  }

  if (tenantId) {
    filter.tenant = tenantId
  }

  let rentPlans =
    await RentPlan.find(filter)
      .populate(
        'tenant',
        'name phone email status'
      )
      .populate(
        'property',
        'name type city state'
      )
      .populate(
        'allocation',
        'room bed startDate endDate status'
      )
      .sort({
        createdAt: -1,
      })

  if (user.role === 'BUSINESS_OWNER') {
  return rentPlans
}

if (user.role === 'STAFF') {
  const assignments =
    await StaffAssignment.find({
      staff: user._id,
      status: 'ACTIVE',
    }).select('property permissions')

  const propertyIds =
    assignments
      .filter((assignment) =>
        assignment.permissions.includes(
          'VIEW_DUES'
        )
      )
      .map((assignment) =>
        assignment.property.toString()
      )

  if (!propertyIds.length) {
    throw createError(
      'You are not authorized to view rent plans.',
      403
    )
  }

  rentPlans = rentPlans.filter((plan) =>
    propertyIds.includes(
      plan.property._id.toString()
    )
  )

  return rentPlans
}

if (user.role !== 'PROPERTY_MANAGER') {
  throw createError(
    'You are not authorized to view rent plans.',
    403
  )
}

  const assignments =
    await PropertyManagerAssignment.find({
      manager: user._id,
      status: 'ACTIVE',
    }).select('property')

  const propertyIds = assignments.map(
    (assignment) =>
      assignment.property.toString()
  )

  rentPlans = rentPlans.filter((plan) =>
    propertyIds.includes(
      plan.property._id.toString()
    )
  )

  return rentPlans
}

export const getRentDues = async ({
  user,
  tenantId,
  status,
}) => {
  const filter = {
    organization: user.organization,
  }

  if (tenantId) {
    filter.tenant = tenantId
  }

  if (status) {
    filter.status = status
  }

  let dues =
    await RentDue.find(filter)
      .populate(
        'tenant',
        'name phone email status'
      )
      .populate(
        'property',
        'name type city state'
      )
      .populate(
        'rentPlan',
        'monthlyRent dueDay'
      )
      .sort({
        dueDate: -1,
      })

  if (user.role === 'BUSINESS_OWNER') {
  return dues
}

if (user.role === 'STAFF') {
  const assignments =
    await StaffAssignment.find({
      staff: user._id,
      status: 'ACTIVE',
    }).select('property permissions')

  const propertyIds =
    assignments
      .filter((assignment) =>
        assignment.permissions.includes(
          PERMISSIONS.VIEW_DUES
        )
      )
      .map((assignment) =>
        assignment.property.toString()
      )

  if (!propertyIds.length) {
    throw createError(
      'You are not authorized to view rent dues.',
      403
    )
  }

  dues = dues.filter((due) =>
    propertyIds.includes(
      due.property._id.toString()
    )
  )

  return dues
}

if (user.role !== 'PROPERTY_MANAGER') {
  throw createError(
    'You are not authorized to view rent dues.',
    403
  )
}

  const assignments =
    await PropertyManagerAssignment.find({
      manager: user._id,
      status: 'ACTIVE',
    }).select('property')

  const propertyIds = assignments.map(
    (assignment) =>
      assignment.property.toString()
  )

  dues = dues.filter((due) =>
    propertyIds.includes(
      due.property._id.toString()
    )
  )

  return dues
}

// --------------------------------------------------
// GET TENANT RENT PAYMENT INFO
// --------------------------------------------------

export const getTenantRentPaymentInfo = async ({
  user,
  rentDueId,
}) => {
  if (!user.organization) {
    throw createError(
      'User is not associated with an organization.',
      400
    )
  }

  // ------------------------------------------------
  // TENANT ONLY
  // ------------------------------------------------

  if (user.role !== 'TENANT') {
    throw createError(
      'Only tenants can access this payment information.',
      403
    )
  }

  // ------------------------------------------------
  // FIND TENANT'S OWN RENT DUE
  // ------------------------------------------------

  const rentDue =
    await RentDue.findOne({
      _id: rentDueId,
      organization: user.organization,
      tenant: user._id,
    })
      .populate(
        'property',
        'name type address city state pincode status'
      )
      .populate(
        'rentPlan',
        'monthlyRent dueDay'
      )

  if (!rentDue) {
    throw createError(
      'Rent due not found.',
      404
    )
  }

  // ------------------------------------------------
  // CALCULATE REMAINING
  // ------------------------------------------------

  const remainingAmount =
    Math.max(
      rentDue.amount -
        rentDue.paidAmount,
      0
    )

  // ------------------------------------------------
  // PAYMENT SETTINGS
  // ------------------------------------------------

  const paymentSettings =
    await PaymentSettings.findOne({
      organization:
        user.organization,
      property:
        rentDue.property._id,
    }).select(
      'upiId accountName qrImageUrl paymentInstructions isEnabled'
    )

  if (!paymentSettings) {
    throw createError(
      'Payment settings are not configured for this property.',
      404
    )
  }

  // ------------------------------------------------
  // PAYMENT DISABLED
  // ------------------------------------------------

  if (!paymentSettings.isEnabled) {
    throw createError(
      'Online rent payment is currently disabled for this property.',
      400
    )
  }

  // ------------------------------------------------
  // RESPONSE
  // ------------------------------------------------

  return {
    rentDue: {
      _id: rentDue._id,
      billingMonth:
        rentDue.billingMonth,
      dueDate:
        rentDue.dueDate,
      amount:
        rentDue.amount,
      paidAmount:
        rentDue.paidAmount,
      remainingAmount,
      status:
        rentDue.status,
    },

    property: {
      _id:
        rentDue.property._id,
      name:
        rentDue.property.name,
      type:
        rentDue.property.type,
    },

    paymentSettings: {
      upiId:
        paymentSettings.upiId,
      accountName:
        paymentSettings.accountName,
      qrImageUrl:
        paymentSettings.qrImageUrl,
      paymentInstructions:
        paymentSettings.paymentInstructions,
      isEnabled:
        paymentSettings.isEnabled,
    },
  }
}