import Room from '../models/Room.js'
import Property from '../models/Property.js'
import PropertyManagerAssignment from '../models/PropertyManagerAssignment.js'
import { PERMISSIONS } from '../constants/permissions.js'

const UPDATABLE_ROOM_FIELDS = [
  'roomNumber',
  'floor',
  'type',
  'capacity',
  'status',
]

const checkRoomPropertyAccess = async ({
  user,
  propertyId,
  permission = null,
}) => {
  if (!user.organization) {
    const error = new Error(
      'User is not associated with an organization.'
    )

    error.statusCode = 400
    throw error
  }

  const property = await Property.findOne({
    _id: propertyId,
    organization: user.organization,
    status: 'ACTIVE',
  })

  if (!property) {
    const error = new Error(
      'Property not found.'
    )

    error.statusCode = 404
    throw error
  }

  // Business Owner has access to all properties
  // in their organization.
  if (user.role === 'BUSINESS_OWNER') {
    return property
  }

  // Property Manager must have an active
  // assignment to this property.
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

    if (permission) {
      const requiredPermissions = Array.isArray(
        permission
      )
        ? permission
        : [permission]

      const hasPermission =
        requiredPermissions.some((required) =>
          assignment.permissions.includes(required)
        )

      if (!hasPermission) {
        const error = new Error(
          'You do not have permission to perform this action.'
        )

        error.statusCode = 403
        throw error
      }
    }

    return property
  }

  const error = new Error(
    'You are not authorized to access this property.'
  )

  error.statusCode = 403

  throw error
}

const checkRoomAccess = async ({
  user,
  room,
  permission = null,
}) => {
  return checkRoomPropertyAccess({
    user,
    propertyId: room.property,
    permission,
  })
}

export const createRoom = async ({
  user,
  roomData,
}) => {
  const {
    propertyId,
    ...data
  } = roomData

  await checkRoomPropertyAccess({
    user,
    propertyId,
    permission: PERMISSIONS.ADD_ROOMS,
  })

  const existingRoom = await Room.findOne({
    property: propertyId,
    roomNumber: data.roomNumber,
  })

  if (existingRoom) {
    const error = new Error(
      'A room with this number already exists in this property.'
    )

    error.statusCode = 409
    throw error
  }

  const room = await Room.create({
    ...data,
    property: propertyId,
    organization: user.organization,
  })

  return room
}

export const getRooms = async ({
  user,
  propertyId,
  status = 'ACTIVE',
}) => {
  if (!user.organization) {
    const error = new Error(
      'User is not associated with an organization.'
    )

    error.statusCode = 400
    throw error
  }

  let filter = {
    organization: user.organization,
  }

  if (status !== 'ALL') {
    filter.status = status
  }

  if (user.role === 'BUSINESS_OWNER') {
    if (propertyId) {
      await checkRoomPropertyAccess({
        user,
        propertyId,
      })

      filter.property = propertyId
    }
  } else if (
    user.role === 'PROPERTY_MANAGER'
  ) {
    const assignments =
      await PropertyManagerAssignment.find({
        manager: user._id,
        status: 'ACTIVE',
      }).select('property')

    const propertyIds = assignments.map(
      (assignment) => assignment.property
    )

    if (propertyId) {
      const hasAccess = propertyIds.some(
        (id) =>
          id.toString() === propertyId
      )

      if (!hasAccess) {
        const error = new Error(
          'You are not assigned to this property.'
        )

        error.statusCode = 403
        throw error
      }

      filter.property = propertyId
    } else {
      filter.property = {
        $in: propertyIds,
      }
    }
  } else {
    const error = new Error(
      'You are not authorized to view rooms.'
    )

    error.statusCode = 403
    throw error
  }

  const rooms = await Room.find(filter)
    .populate(
      'property',
      'name type city state'
    )
    .sort({
      floor: 1,
      roomNumber: 1,
    })

  return rooms
}

export const getRoomById = async ({
  user,
  roomId,
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
  }).populate(
    'property',
    'name type city state'
  )

  if (!room) {
    const error = new Error(
      'Room not found.'
    )

    error.statusCode = 404
    throw error
  }

  await checkRoomAccess({
    user,
    room,
  })

  return room
}

export const updateRoom = async ({
  user,
  roomId,
  roomData,
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

  await checkRoomAccess({
    user,
    room,
    permission: PERMISSIONS.EDIT_ROOMS,
  })

  if (
    roomData.roomNumber &&
    roomData.roomNumber !== room.roomNumber
  ) {
    const duplicateRoom =
      await Room.findOne({
        property: room.property,
        roomNumber: roomData.roomNumber,
        _id: {
          $ne: room._id,
        },
      })

    if (duplicateRoom) {
      const error = new Error(
        'A room with this number already exists in this property.'
      )

      error.statusCode = 409
      throw error
    }
  }

  for (const field of UPDATABLE_ROOM_FIELDS) {
    if (roomData[field] !== undefined) {
      room[field] = roomData[field]
    }
  }

  await room.save()

  return room
}

export const deactivateRoom = async ({
  user,
  roomId,
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

  await checkRoomAccess({
    user,
    room,
    permission: PERMISSIONS.REMOVE_ROOMS,
  })

  if (room.status === 'INACTIVE') {
    const error = new Error(
      'Room is already inactive.'
    )

    error.statusCode = 400
    throw error
  }

  room.status = 'INACTIVE'

  await room.save()

  return room
}