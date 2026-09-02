import Bed from '../models/Bed.js'
import Room from '../models/Room.js'
import PropertyManagerAssignment from '../models/PropertyManagerAssignment.js'
import { PERMISSIONS } from '../constants/permissions.js'

const BED_UPDATE_PERMISSIONS = [
  PERMISSIONS.EDIT_ROOMS,
]

const checkRoomAccess = async ({
  user,
  roomId,
  permission = null,
}) => {
  if (!user.organization) {
    const error = new Error(
      'User is not associated with an organization.'
    )

    error.statusCode = 400
    throw error
  }

  const room = await Room.findOne({
    _id: roomId,
    organization: user.organization,
  })

  if (!room) {
    const error = new Error(
      'Room not found.'
    )

    error.statusCode = 404
    throw error
  }

  const property = room.property

  // Business Owner has access to all rooms
  // inside their organization.
  if (user.role === 'BUSINESS_OWNER') {
    return room
  }

  // Property Manager requires an active
  // assignment to the room's property.
  if (user.role === 'PROPERTY_MANAGER') {
    const assignment =
      await PropertyManagerAssignment.findOne({
        manager: user._id,
        property,
        status: 'ACTIVE',
      })

    if (!assignment) {
      const error = new Error(
        'You are not assigned to this property.'
      )

      error.statusCode = 403
      throw error
    }

    if (permission) {
      const requiredPermissions =
        Array.isArray(permission)
          ? permission
          : [permission]

      const hasPermission =
        requiredPermissions.some(
          (required) =>
            assignment.permissions.includes(
              required
            )
        )

      if (!hasPermission) {
        const error = new Error(
          'You do not have permission to perform this action.'
        )

        error.statusCode = 403
        throw error
      }
    }

    return room
  }

  const error = new Error(
    'You are not authorized to access this room.'
  )

  error.statusCode = 403
  throw error
}

// --------------------------------------------------
// CREATE BED
// --------------------------------------------------

export const createBed = async ({
  user,
  roomId,
  bedData,
}) => {
  const room = await checkRoomAccess({
    user,
    roomId,
    permission: PERMISSIONS.ADD_ROOMS,
  })

  // Beds can only be created in active rooms.
  if (room.status !== 'ACTIVE') {
    const error = new Error(
      'Cannot create a bed in an inactive room.'
    )

    error.statusCode = 400
    throw error
  }

  // Count existing beds.
  const bedCount = await Bed.countDocuments({
    room: room._id,
    status: {
      $ne: 'INACTIVE',
    },
  })

  if (bedCount >= room.capacity) {
    const error = new Error(
      'Room capacity has been reached. Cannot add more beds.'
    )

    error.statusCode = 409
    throw error
  }

  // Duplicate bed number.
  const existingBed =
    await Bed.findOne({
      room: room._id,
      bedNumber: bedData.bedNumber,
    })

  if (existingBed) {
    const error = new Error(
      'A bed with this number already exists in this room.'
    )

    error.statusCode = 409
    throw error
  }

  const bed = await Bed.create({
    organization: user.organization,
    property: room.property,
    room: room._id,
    bedNumber: bedData.bedNumber,
    status: 'AVAILABLE',
  })

  return bed
}

// --------------------------------------------------
// GET BEDS BY ROOM
// --------------------------------------------------

export const getBedsByRoom = async ({
  user,
  roomId,
  status,
}) => {
  await checkRoomAccess({
    user,
    roomId,
    permission: PERMISSIONS.VIEW_ROOMS,
  })

  const filter = {
    organization: user.organization,
    room: roomId,
  }

  if (status) {
    filter.status = status
  }

  const beds = await Bed.find(filter)
    .populate(
      'room',
      'roomNumber floor type capacity status'
    )
    .populate(
      'property',
      'name type city state'
    )
    .sort({
      bedNumber: 1,
    })

  return beds
}

// --------------------------------------------------
// GET BED BY ID
// --------------------------------------------------

export const getBedById = async ({
  user,
  bedId,
}) => {
  if (!user.organization) {
    const error = new Error(
      'User is not associated with an organization.'
    )

    error.statusCode = 400
    throw error
  }

  const bed = await Bed.findOne({
    _id: bedId,
    organization: user.organization,
  })
    .populate(
      'room',
      'roomNumber floor type capacity status'
    )
    .populate(
      'property',
      'name type city state'
    )

  if (!bed) {
    const error = new Error(
      'Bed not found.'
    )

    error.statusCode = 404
    throw error
  }

  if (
    user.role === 'BUSINESS_OWNER'
  ) {
    return bed
  }

  if (
    user.role === 'PROPERTY_MANAGER'
  ) {
    const assignment =
      await PropertyManagerAssignment.findOne({
        manager: user._id,
        property: bed.property._id,
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
      !assignment.permissions.includes(
        PERMISSIONS.VIEW_ROOMS
      )
    ) {
      const error = new Error(
        'You do not have permission to perform this action.'
      )

      error.statusCode = 403
      throw error
    }

    return bed
  }

  const error = new Error(
    'You are not authorized to view this bed.'
  )

  error.statusCode = 403
  throw error
}

// --------------------------------------------------
// UPDATE BED
// --------------------------------------------------

export const updateBed = async ({
  user,
  bedId,
  bedData,
}) => {
  if (!user.organization) {
    const error = new Error(
      'User is not associated with an organization.'
    )

    error.statusCode = 400
    throw error
  }

  const bed = await Bed.findOne({
    _id: bedId,
    organization: user.organization,
  })

  if (!bed) {
    const error = new Error(
      'Bed not found.'
    )

    error.statusCode = 404
    throw error
  }

  await checkRoomAccess({
    user,
    roomId: bed.room,
    permission: BED_UPDATE_PERMISSIONS,
  })

  // ----------------------------------------------
  // BED NUMBER
  // ----------------------------------------------

  if (
    bedData.bedNumber !== undefined &&
    bedData.bedNumber !== bed.bedNumber
  ) {
    const duplicate =
      await Bed.findOne({
        room: bed.room,
        bedNumber: bedData.bedNumber,
        _id: {
          $ne: bed._id,
        },
      })

    if (duplicate) {
      const error = new Error(
        'A bed with this number already exists in this room.'
      )

      error.statusCode = 409
      throw error
    }

    bed.bedNumber =
      bedData.bedNumber
  }

  // ----------------------------------------------
  // STATUS
  // ----------------------------------------------

if (bedData.status !== undefined) {
  const newStatus = bedData.status

  // OCCUPIED status must be controlled by
  // the Bed Allocation module.
  if (newStatus === 'OCCUPIED') {
    const error = new Error(
      'A bed can only become occupied through a bed allocation.'
    )

    error.statusCode = 400
    throw error
  }

  // An occupied bed cannot be manually changed.
  if (bed.status === 'OCCUPIED') {
    const error = new Error(
      'An occupied bed cannot be manually changed.'
    )

    error.statusCode = 400
    throw error
  }

  bed.status = newStatus
}

  await bed.save()

  return bed
}

// --------------------------------------------------
// DEACTIVATE BED
// --------------------------------------------------

export const deactivateBed = async ({
  user,
  bedId,
}) => {
  if (!user.organization) {
    const error = new Error(
      'User is not associated with an organization.'
    )

    error.statusCode = 400
    throw error
  }

  const bed = await Bed.findOne({
    _id: bedId,
    organization: user.organization,
  })

  if (!bed) {
    const error = new Error(
      'Bed not found.'
    )

    error.statusCode = 404
    throw error
  }

  await checkRoomAccess({
    user,
    roomId: bed.room,
    permission: PERMISSIONS.REMOVE_ROOMS,
  })

  if (bed.status === 'OCCUPIED') {
    const error = new Error(
      'Cannot deactivate an occupied bed.'
    )

    error.statusCode = 400
    throw error
  }

  if (bed.status === 'INACTIVE') {
    const error = new Error(
      'Bed is already inactive.'
    )

    error.statusCode = 400
    throw error
  }

  bed.status = 'INACTIVE'

  await bed.save()

  return bed
}