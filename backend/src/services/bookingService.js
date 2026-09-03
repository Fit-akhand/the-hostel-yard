import mongoose from 'mongoose'

import Booking from '../models/Booking.js'
import Property from '../models/Property.js'
import Tenant from '../models/Tenant.js'
import Room from '../models/Room.js'
import Bed from '../models/Bed.js'
import Allocation from '../models/Allocation.js'
import PropertyManagerAssignment from '../models/PropertyManagerAssignment.js'
import StaffAssignment from '../models/StaffAssignment.js'
import {
  createAllocationFromBooking,
} from './allocationService.js'

import { PERMISSIONS } from '../constants/permissions.js'

const createError = (message, statusCode = 400) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id)

const getManagerAssignment = async ({
  user,
  propertyId,
}) => {
  return PropertyManagerAssignment.findOne({
    manager: user._id,
    property: propertyId,
    status: 'ACTIVE',
  })
}

const hasManagerPermission = (
  assignment,
  permission
) => {
  return Boolean(
    assignment?.permissions?.includes(permission)
  )
}

const verifyPropertyAccess = async ({
  user,
  propertyId,
  requireManage = false,
}) => {
  if (!isValidObjectId(propertyId)) {
    throw createError('Invalid property ID.', 400)
  }

  const property = await Property.findOne({
    _id: propertyId,
    organization: user.organization,
  })

  if (!property) {
    throw createError('Property not found.', 404)
  }

  if (user.role === 'BUSINESS_OWNER') {
    return property
  }

  if (user.role === 'PROPERTY_MANAGER') {
    const assignment = await getManagerAssignment({
      user,
      propertyId,
    })

    if (!assignment) {
      throw createError(
        'You are not assigned to this property.',
        403
      )
    }

    if (
      requireManage &&
      !hasManagerPermission(
        assignment,
        PERMISSIONS.MANAGE_BOOKINGS
      )
    ) {
      throw createError(
        'You are not authorized to manage bookings.',
        403
      )
    }

    return property
  }

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

  if (requireManage) {
    if (
      !assignment.permissions.includes(
        PERMISSIONS.MANAGE_BOOKINGS
      )
    ) {
      throw createError(
        'You are not authorized to manage bookings for this property.',
        403
      )
    }
  } else {
    if (
      !assignment.permissions.includes(
        PERMISSIONS.VIEW_BOOKINGS
      ) &&
      !assignment.permissions.includes(
        PERMISSIONS.MANAGE_BOOKINGS
      )
    ) {
      throw createError(
        'You are not authorized to view bookings for this property.',
        403
      )
    }
  }

  return property
}

  throw createError(
    'You are not authorized to access this property.',
    403
  )
}

const verifyTenant = async ({
  user,
  tenantId,
}) => {
  const tenant = await Tenant.findOne({
    _id: tenantId,
    organization: user.organization,
  })

  if (!tenant) {
    throw createError('Tenant not found.', 404)
  }

  return tenant
}

const verifyRoomAndBed = async ({
  user,
  propertyId,
  roomId,
  bedId,
}) => {
  const room = await Room.findOne({
    _id: roomId,
    property: propertyId,
    organization: user.organization,
  })

  if (!room) {
    throw createError(
      'Room not found in this property.',
      404
    )
  }

  const bed = await Bed.findOne({
    _id: bedId,
    room: room._id,
    property: propertyId,
    organization: user.organization,
  })

  if (!bed) {
    throw createError(
      'Bed not found in this room.',
      404
    )
  }

  return { room, bed }
}

const checkBedAvailability = async ({
  bedId,
  expectedMoveInDate,
  expectedMoveOutDate,
  excludeBookingId = null,
}) => {
  const moveIn = new Date(expectedMoveInDate)

  const moveOut = expectedMoveOutDate
    ? new Date(expectedMoveOutDate)
    : null

  if (Number.isNaN(moveIn.getTime())) {
    throw createError(
      'Invalid expected move-in date.',
      400
    )
  }

  if (
    moveOut &&
    Number.isNaN(moveOut.getTime())
  ) {
    throw createError(
      'Invalid expected move-out date.',
      400
    )
  }

  if (
    moveOut &&
    moveOut <= moveIn
  ) {
    throw createError(
      'Expected move-out date must be after move-in date.',
      400
    )
  }

  const bed = await Bed.findById(bedId)

  if (!bed) {
    throw createError(
      'Bed not found.',
      404
    )
  }

  if (bed.status !== 'AVAILABLE') {
    throw createError(
      `This bed is not available. Current status: ${bed.status}.`,
      409
    )
  }

  /*
   * A currently active allocation means
   * the bed is already occupied.
   */
  const activeAllocation =
    await Allocation.findOne({
      bed: bedId,
      status: 'ACTIVE',
    })

  if (activeAllocation) {
    throw createError(
      'This bed is currently occupied.',
      409
    )
  }

  /*
   * Check confirmed bookings for date overlap.
   *
   * Existing booking:
   *
   * start < requested end
   * AND
   * existing end > requested start
   *
   * A booking without move-out date is
   * treated as open-ended.
   */
  const bookingFilter = {
    bed: bedId,
    status: 'CONFIRMED',
  }

  if (excludeBookingId) {
    bookingFilter._id = {
      $ne: excludeBookingId,
    }
  }

  const conflictingBooking =
    await Booking.findOne({
      ...bookingFilter,

      expectedMoveInDate: {
        $lt:
          moveOut ||
          new Date('9999-12-31'),
      },

      $or: [
        {
          expectedMoveOutDate: null,
        },
        {
          expectedMoveOutDate: {
            $gt: moveIn,
          },
        },
      ],
    })

  if (conflictingBooking) {
    throw createError(
      'This bed already has a conflicting confirmed booking.',
      409
    )
  }
}

const populateBooking = (query) =>
  query
    .populate(
      'property',
      'name city state address'
    )
    .populate(
      'tenant',
      'firstName lastName email phone status'
    )
    .populate(
      'room',
      'roomNumber floor type'
    )
    .populate(
      'bed',
      'bedNumber status'
    )
    .populate(
      'createdBy',
      'name email role'
    )
    .populate(
      'confirmedBy',
      'name email role'
    )
    .populate(
      'cancelledBy',
      'name email role'
    )

export const createBooking = async ({
  user,
  propertyId,
  tenantId,
  roomId,
  bedId,
  bookingDate,
  expectedMoveInDate,
  expectedMoveOutDate,
  amount = 0,
  paymentStatus = 'UNPAID',
  notes = '',
}) => {
  if (
    user.role !== 'BUSINESS_OWNER' &&
    user.role !== 'PROPERTY_MANAGER'
  ) {
    throw createError(
      'You are not authorized to create bookings.',
      403
    )
  }

  await verifyPropertyAccess({
    user,
    propertyId,
    requireManage: true,
  })

  const tenant = await verifyTenant({
    user,
    tenantId,
  })

  if (
    ['MOVED_OUT', 'INACTIVE', 'DEACTIVATED'].includes(
      tenant.status
    )
  ) {
    throw createError(
      'This tenant is not eligible for a booking.',
      400
    )
  }

  const { room, bed } =
    await verifyRoomAndBed({
      user,
      propertyId,
      roomId,
      bedId,
    })

  await checkBedAvailability({
    bedId: bed._id,
    expectedMoveInDate,
    expectedMoveOutDate,
  })

  const booking = await Booking.create({
    organization: user.organization,
    property: propertyId,
    tenant: tenant._id,
    room: room._id,
    bed: bed._id,
    bookingDate: bookingDate
      ? new Date(bookingDate)
      : new Date(),
    expectedMoveInDate:
      new Date(expectedMoveInDate),
    expectedMoveOutDate:
      expectedMoveOutDate
        ? new Date(expectedMoveOutDate)
        : null,
    amount,
    paymentStatus,
    notes,
    createdBy: user._id,
  })

  return populateBooking(
    Booking.findById(booking._id)
  )
}

export const getBookings = async ({
  user,
  filters = {},
}) => {
  const {
    propertyId,
    tenantId,
    roomId,
    bedId,
    status,
    paymentStatus,
    page = 1,
    limit = 20,
  } = filters

  const filter = {
    organization: user.organization,
  }

  if (user.role === 'BUSINESS_OWNER') {
    if (propertyId) {
      await verifyPropertyAccess({
        user,
        propertyId,
      })

      filter.property = propertyId
    }
  } else if (user.role === 'PROPERTY_MANAGER') {
    const assignments =
      await PropertyManagerAssignment.find({
        manager: user._id,
        status: 'ACTIVE',
      }).select('property permissions')

    const manageableProperties =
      assignments
        .filter((assignment) =>
          hasManagerPermission(
            assignment,
            PERMISSIONS.VIEW_BOOKINGS
          )
        )
        .map(
          (assignment) => assignment.property
        )

    if (!manageableProperties.length) {
      throw createError(
        'You are not authorized to view bookings.',
        403
      )
    }

    if (propertyId) {
      const allowed =
        manageableProperties.some(
          (id) => id.toString() === propertyId
        )

      if (!allowed) {
        throw createError(
          'You are not authorized to view bookings for this property.',
          403
        )
      }

      filter.property = propertyId
    } else {
      filter.property = {
        $in: manageableProperties,
      }
    }
    } else if (user.role === 'STAFF') {
    const assignments =
      await StaffAssignment.find({
        staff: user._id,
        status: 'ACTIVE',
      }).select('property permissions')

    const viewableProperties =
      assignments
        .filter((assignment) =>
          assignment.permissions.includes(
            PERMISSIONS.VIEW_BOOKINGS
          ) ||
          assignment.permissions.includes(
            PERMISSIONS.MANAGE_BOOKINGS
          )
        )
        .map(
          (assignment) => assignment.property
        )

    if (!viewableProperties.length) {
      throw createError(
        'You are not authorized to view bookings.',
        403
      )
    }

    if (propertyId) {
      const allowed =
        viewableProperties.some(
          (id) =>
            id.toString() ===
            propertyId
        )

      if (!allowed) {
        throw createError(
          'You are not authorized to view bookings for this property.',
          403
        )
      }

      filter.property = propertyId
    } else {
      filter.property = {
        $in: viewableProperties,
      }
    }

  } else if (user.role === 'TENANT') {
    const tenant = await Tenant.findOne({
      user: user._id,
      organization: user.organization,
    })

    if (!tenant) {
      throw createError(
        'Tenant profile not found.',
        404
      )
    }

    filter.tenant = tenant._id

  } else {
    throw createError(
      'You are not authorized to view bookings.',
      403
    )
  }

  if (
    user.role !== 'TENANT' &&
    tenantId
  ) {
    await verifyTenant({
      user,
      tenantId,
    })

    filter.tenant = tenantId
  }

  if (roomId) {
    filter.room = roomId
  }

  if (bedId) {
    filter.bed = bedId
  }

  if (status) {
    filter.status = status
  }

  if (paymentStatus) {
    filter.paymentStatus = paymentStatus
  }

  const skip = (page - 1) * limit

  const [bookings, total] =
    await Promise.all([
      populateBooking(
        Booking.find(filter)
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
      ),
      Booking.countDocuments(filter),
    ])

  return {
    bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(
        total / limit
      ),
    },
  }
}

export const getBookingById = async ({
  user,
  bookingId,
}) => {
  if (!isValidObjectId(bookingId)) {
    throw createError(
      'Invalid booking ID.',
      400
    )
  }

  const booking = await populateBooking(
    Booking.findOne({
      _id: bookingId,
      organization: user.organization,
    })
  )

  if (!booking) {
    throw createError(
      'Booking not found.',
      404
    )
  }

  if (user.role === 'TENANT') {
    const tenant = await Tenant.findOne({
      user: user._id,
      organization: user.organization,
    })

    if (
      !tenant ||
      booking.tenant._id.toString() !==
        tenant._id.toString()
    ) {
      throw createError(
        'Booking not found.',
        404
      )
    }

    return booking
  }

  if (user.role === 'BUSINESS_OWNER') {
    return booking
  }

    if (user.role === 'STAFF') {
    const assignment =
      await StaffAssignment.findOne({
        staff: user._id,
        property: booking.property._id,
        status: 'ACTIVE',
      })

    if (!assignment) {
      throw createError(
        'You are not assigned to this property.',
        403
      )
    }

    if (
      !assignment.permissions.includes(
        PERMISSIONS.VIEW_BOOKINGS
      ) &&
      !assignment.permissions.includes(
        PERMISSIONS.MANAGE_BOOKINGS
      )
    ) {
      throw createError(
        'You are not authorized to view bookings.',
        403
      )
    }

    return booking
  }

  throw createError(
    'You are not authorized to view bookings.',
    403
  )

  if (user.role === 'PROPERTY_MANAGER') {
    const assignment =
      await getManagerAssignment({
        user,
        propertyId:
          booking.property._id,
      })

    if (!assignment) {
      throw createError(
        'You are not assigned to this property.',
        403
      )
    }

    if (
      !hasManagerPermission(
        assignment,
        PERMISSIONS.VIEW_BOOKINGS
      )
    ) {
      throw createError(
        'You are not authorized to view bookings.',
        403
      )
    }

    return booking
  }

  throw createError(
    'You are not authorized to view bookings.',
    403
  )
}

export const updateBooking = async ({
  user,
  bookingId,
  expectedMoveInDate,
  expectedMoveOutDate,
  amount,
  paymentStatus,
  notes,
}) => {
  const booking =
    await Booking.findOne({
      _id: bookingId,
      organization: user.organization,
    })

  if (!booking) {
    throw createError(
      'Booking not found.',
      404
    )
  }

  if (
    !['PENDING'].includes(
      booking.status
    )
  ) {
    throw createError(
      'Only pending bookings can be edited.',
      400
    )
  }

  await verifyPropertyAccess({
    user,
    propertyId: booking.property,
    requireManage: true,
  })

  if (
    expectedMoveInDate ||
    expectedMoveOutDate !== undefined
  ) {
    const moveIn =
      expectedMoveInDate
        ? new Date(expectedMoveInDate)
        : booking.expectedMoveInDate

    const moveOut =
      expectedMoveOutDate !== undefined
        ? expectedMoveOutDate
          ? new Date(expectedMoveOutDate)
          : null
        : booking.expectedMoveOutDate

    if (
      moveOut &&
      moveOut <= moveIn
    ) {
      throw createError(
        'Expected move-out date must be after move-in date.',
        400
      )
    }

    await checkBedAvailability({
      bedId: booking.bed,
      expectedMoveInDate: moveIn,
      expectedMoveOutDate: moveOut,
      excludeBookingId: booking._id,
    })

    booking.expectedMoveInDate = moveIn
    booking.expectedMoveOutDate = moveOut
  }

  if (amount !== undefined) {
    booking.amount = amount
  }

  if (paymentStatus !== undefined) {
    booking.paymentStatus =
      paymentStatus
  }

  if (notes !== undefined) {
    booking.notes = notes
  }

  await booking.save()

  return populateBooking(
    Booking.findById(booking._id)
  )
}

export const confirmBooking = async ({
  user,
  bookingId,
}) => {
  const booking =
    await Booking.findOne({
      _id: bookingId,
      organization: user.organization,
    })

  if (!booking) {
    throw createError(
      'Booking not found.',
      404
    )
  }

  if (booking.status !== 'PENDING') {
    throw createError(
      'Only pending bookings can be confirmed.',
      400
    )
  }

  await verifyPropertyAccess({
    user,
    propertyId: booking.property,
    requireManage: true,
  })

  await checkBedAvailability({
    bedId: booking.bed,
    expectedMoveInDate:
      booking.expectedMoveInDate,
    expectedMoveOutDate:
      booking.expectedMoveOutDate,
    excludeBookingId: booking._id,
  })

  booking.status = 'CONFIRMED'
  booking.confirmedBy = user._id
  booking.confirmedAt = new Date()

  await booking.save()

  return populateBooking(
    Booking.findById(booking._id)
  )
}

export const cancelBooking = async ({
  bookingId,
  user,
  cancellationReason,
}) => {
  const booking =
    await Booking.findOne({
      _id: bookingId,
      organization: user.organization,
    })

  if (!booking) {
    throw createError(
      'Booking not found.',
      404
    )
  }

  if (
    ['CANCELLED', 'COMPLETED'].includes(
      booking.status
    )
  ) {
    throw createError(
      `Booking cannot be cancelled from ${booking.status} status.`,
      400
    )
  }

  await verifyPropertyAccess({
    user,
    propertyId: booking.property,
    requireManage: true,
  })

  booking.status = 'CANCELLED'
  booking.cancelledBy = user._id
  booking.cancelledAt = new Date()
  booking.cancellationReason = cancellationReason

  await booking.save()

  return populateBooking(
    Booking.findById(booking._id)
  )
}

export const completeBooking = async ({
  user,
  bookingId,
}) => {
  const session = await mongoose.startSession()

  try {
    let result

    await session.withTransaction(async () => {
      const booking =
        await Booking.findOne({
          _id: bookingId,
          organization: user.organization,
        }).session(session)

      if (!booking) {
        throw createError(
          'Booking not found.',
          404
        )
      }

      if (booking.status !== 'CONFIRMED') {
        throw createError(
          'Only confirmed bookings can be completed.',
          400
        )
      }

      await verifyPropertyAccess({
        user,
        propertyId: booking.property,
        requireManage: true,
      })

      const allocation =
        await createAllocationFromBooking({
          booking,
          session,
        })

      booking.status = 'COMPLETED'

      await booking.save({ session })

      result = {
        bookingId: booking._id,
        allocationId: allocation._id,
      }
    })

    const booking =
      await populateBooking(
        Booking.findById(result.bookingId)
      )

    const allocation =
      await Allocation.findById(
        result.allocationId
      )

    return {
      booking,
      allocation,
    }
  } finally {
    await session.endSession()
  }
}

export const expirePendingBookings = async ({
  user,
}) => {
  if (user.role !== 'BUSINESS_OWNER') {
    throw createError(
      'Only business owners can expire bookings.',
      403
    )
  }

  const now = new Date()

  const result =
    await Booking.updateMany(
      {
        organization: user.organization,
        status: 'PENDING',
        expectedMoveInDate: {
          $lt: now,
        },
      },
      {
        $set: {
          status: 'EXPIRED',
        },
      }
    )

  return {
    modifiedCount: result.modifiedCount,
  }
}

export const deleteBooking = async ({
  user,
  bookingId,
}) => {
  const booking =
    await Booking.findOne({
      _id: bookingId,
      organization: user.organization,
    })

  if (!booking) {
    throw createError(
      'Booking not found.',
      404
    )
  }

  if (booking.status !== 'CANCELLED') {
    throw createError(
      'Only cancelled bookings can be deleted.',
      400
    )
  }

  await verifyPropertyAccess({
    user,
    propertyId: booking.property,
    requireManage: true,
  })

  await Booking.deleteOne({
    _id: booking._id,
  })

  return {
    deleted: true,
  }
}