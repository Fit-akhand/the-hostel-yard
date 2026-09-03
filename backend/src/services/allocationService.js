import mongoose from 'mongoose'

import Allocation from '../models/Allocation.js'
import Tenant from '../models/Tenant.js'
import Bed from '../models/Bed.js'
import Room from '../models/Room.js'
import Property from '../models/Property.js'
import StaffAssignment from '../models/StaffAssignment.js'
import PropertyManagerAssignment from '../models/PropertyManagerAssignment.js'

import { PERMISSIONS } from '../constants/permissions.js'

const getError = (
  message,
  statusCode
) => {
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
    throw getError(
      'User is not associated with an organization.',
      400
    )
  }

  const property =
    await Property.findOne({
      _id: propertyId,
      organization: user.organization,
      status: 'ACTIVE',
    })

  if (!property) {
    throw getError(
      'Property not found.',
      404
    )
  }

  if (user.role === 'BUSINESS_OWNER') {
    return property
  }

  if (user.role === 'PROPERTY_MANAGER') {
    const assignment =
      await PropertyManagerAssignment.findOne({
        manager: user._id,
        property: propertyId,
        status: 'ACTIVE',
      })

    if (!assignment) {
      throw getError(
        'You are not assigned to this property.',
        403
      )
    }

    if (
      permission &&
      !assignment.permissions.includes(permission)
    ) {
      throw getError(
        'You do not have permission to perform this action.',
        403
      )
    }

    return property
  }

    if (user.role === 'STAFF') {
    const assignment =
      await StaffAssignment.findOne({
        staff: user._id,
        property: propertyId,
        status: 'ACTIVE',
      })

    if (!assignment) {
      throw getError(
        'You are not assigned to this property.',
        403
      )
    }

    if (
      permission &&
      !assignment.permissions.includes(permission)
    ) {
      throw getError(
        'You do not have permission to perform this action.',
        403
      )
    }

    return property
  }

  throw getError(
    'You are not authorized to access this property.',
    403
  )
}

const createAllocationRecord = async ({
  organizationId,
  tenantId,
  bedId,
  startDate,
  notes = null,
  session = null,
}) => {
  const tenant =
    await Tenant.findOne({
      _id: tenantId,
      organization: organizationId,
    }).session(session)

  if (!tenant) {
    throw getError(
      'Tenant not found.',
      404
    )
  }

  if (tenant.status !== 'ACTIVE') {
    throw getError(
      'Only an active tenant can be allocated a bed.',
      400
    )
  }

  const bed = await Bed.findOne({
    _id: bedId,
    organization: organizationId,
  }).session(session)

  if (!bed) {
    throw getError(
      'Bed not found.',
      404
    )
  }

  const room = await Room.findOne({
    _id: bed.room,
    organization: organizationId,
  }).session(session)

  if (!room) {
    throw getError(
      'Room not found.',
      404
    )
  }

  if (room.status !== 'ACTIVE') {
    throw getError(
      'Cannot allocate a bed in an inactive room.',
      400
    )
  }

  if (bed.status !== 'AVAILABLE') {
    throw getError(
      `Bed is not available. Current status: ${bed.status}.`,
      400
    )
  }

  const existingTenantAllocation =
    await Allocation.findOne({
      organization: organizationId,
      tenant: tenant._id,
      status: 'ACTIVE',
    }).session(session)

  if (existingTenantAllocation) {
    throw getError(
      'Tenant already has an active bed allocation.',
      409
    )
  }

  const existingBedAllocation =
    await Allocation.findOne({
      organization: organizationId,
      bed: bed._id,
      status: 'ACTIVE',
    }).session(session)

  if (existingBedAllocation) {
    throw getError(
      'This bed is already allocated.',
      409
    )
  }

  if (
    tenant.moveInDate &&
    new Date(startDate) <
      new Date(tenant.moveInDate)
  ) {
    throw getError(
      'Allocation start date cannot be before the tenant move-in date.',
      400
    )
  }

  const allocation =
    await Allocation.create(
      [
        {
          organization: organizationId,
          property: bed.property,
          tenant: tenant._id,
          room: room._id,
          bed: bed._id,
          startDate,
          notes,
          status: 'ACTIVE',
        },
      ],
      { session }
    )

  const createdAllocation = allocation[0]

  bed.status = 'OCCUPIED'

  await bed.save({ session })

  return createdAllocation
}

export const createAllocation = async ({
  user,
  allocationData,
}) => {
  const {
    tenantId,
    bedId,
    startDate,
    notes,
  } = allocationData

  const bed =
    await Bed.findOne({
      _id: bedId,
      organization: user.organization,
    })

  if (!bed) {
    throw getError(
      'Bed not found.',
      404
    )
  }

  await checkPropertyAccess({
    user,
    propertyId: bed.property,
    permission: PERMISSIONS.ADD_ALLOCATIONS,
  })

  return createAllocationRecord({
    organizationId: user.organization,
    tenantId,
    bedId,
    startDate,
    notes: notes || null,
  })
}

export const getAllocations = async ({
  user,
  propertyId,
}) => {
  if (!user.organization) {
    throw getError(
      'User is not associated with an organization.',
      400
    )
  }

  let filter = {
    organization: user.organization,
    status: 'ACTIVE',
  }

if (user.role === 'BUSINESS_OWNER') {
  if (propertyId) {
    await checkPropertyAccess({
      user,
      propertyId,
    })

    filter.property = propertyId
  }
}

else if (user.role === 'PROPERTY_MANAGER') {
  const assignments =
    await PropertyManagerAssignment.find({
      manager: user._id,
      status: 'ACTIVE',
    }).select('property')

  const propertyIds =
    assignments.map(
      (assignment) => assignment.property
    )

  if (propertyId) {
    const hasAccess =
      propertyIds.some(
        (id) =>
          id.toString() === propertyId
      )

    if (!hasAccess) {
      throw getError(
        'You are not assigned to this property.',
        403
      )
    }

    filter.property = propertyId
  } else {
    filter.property = {
      $in: propertyIds,
    }
  }
}

else if (user.role === 'STAFF') {
  const assignments =
    await StaffAssignment.find({
      staff: user._id,
      status: 'ACTIVE',
    }).select('property permissions')

  const viewableProperties =
    assignments
      .filter((assignment) =>
        assignment.permissions.includes(
          PERMISSIONS.VIEW_ALLOCATIONS
        )
      )
      .map(
        (assignment) =>
          assignment.property
      )

  if (!viewableProperties.length) {
    throw getError(
      'You are not authorized to view allocations.',
      403
    )
  }

  if (propertyId) {
    await checkPropertyAccess({
      user,
      propertyId,
      permission: PERMISSIONS.VIEW_ALLOCATIONS,
    })

    filter.property = propertyId
  } else {
    filter.property = {
      $in: viewableProperties,
    }
  }
}

else {
  throw getError(
    'You are not authorized to view allocations.',
    403
  )
}

  return Allocation.find(filter)
    .populate(
      'tenant',
      'name phone email gender status'
    )
    .populate(
      'property',
      'name type city state'
    )
    .populate(
      'room',
      'roomNumber floor type capacity status'
    )
    .populate(
      'bed',
      'bedNumber status'
    )
    .sort({
      createdAt: -1,
    })
}

export const getAllocationById = async ({
  user,
  allocationId,
}) => {
  const allocation =
    await Allocation.findOne({
      _id: allocationId,
      organization: user.organization,
    })
      .populate(
        'tenant',
        'name phone email gender status'
      )
      .populate(
        'property',
        'name type city state'
      )
      .populate(
        'room',
        'roomNumber floor type capacity status'
      )
      .populate(
        'bed',
        'bedNumber status'
      )

  if (!allocation) {
    throw getError(
      'Allocation not found.',
      404
    )
  }

  await checkPropertyAccess({
    user,
    propertyId: allocation.property._id,
    permission: PERMISSIONS.VIEW_ALLOCATIONS,
  })

  return allocation
}

export const endAllocation = async ({
  user,
  allocationId,
  endDate,
}) => {
  const allocation =
    await Allocation.findOne({
      _id: allocationId,
      organization: user.organization,
    })

  if (!allocation) {
    throw getError(
      'Allocation not found.',
      404
    )
  }

  await checkPropertyAccess({
    user,
    propertyId: allocation.property,
    permission: PERMISSIONS.REMOVE_ALLOCATIONS,
  })

  if (allocation.status === 'ENDED') {
    throw getError(
      'Allocation has already ended.',
      400
    )
  }

  if (
    new Date(endDate) <
    new Date(allocation.startDate)
  ) {
    throw getError(
      'End date cannot be before allocation start date.',
      400
    )
  }

  const bed =
    await Bed.findOne({
      _id: allocation.bed,
      organization: user.organization,
    })

  if (!bed) {
    throw getError(
      'Allocated bed not found.',
      404
    )
  }

  allocation.status = 'ENDED'
  allocation.endDate = endDate

  await allocation.save()

  bed.status = 'AVAILABLE'

  await bed.save()

  return allocation
}

export const createAllocationFromBooking = async ({
  booking,
  session = null,
}) => {
  return createAllocationRecord({
    organizationId: booking.organization,
    tenantId: booking.tenant,
    bedId: booking.bed,
    startDate: booking.expectedMoveInDate,
    notes: `Created automatically from booking ${booking._id}`,
    session,
  })
}