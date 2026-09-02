import {
  createRoom as createRoomService,
  getRooms as getRoomsService,
  getRoomById as getRoomByIdService,
  updateRoom as updateRoomService,
  deactivateRoom as deactivateRoomService,
} from '../services/roomService.js'

export const createRoom = async (
  req,
  res,
  next
) => {
  try {
    const room =
      await createRoomService({
        user: req.user,
        roomData: req.body,
      })

    res.status(201).json({
      success: true,
      message: 'Room created successfully.',
      data: {
        room,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getRooms = async (
  req,
  res,
  next
) => {
  try {
    const rooms =
      await getRoomsService({
        user: req.user,
        propertyId:
          req.validatedQuery.propertyId,
        status:
          req.validatedQuery.status,
      })

    res.status(200).json({
      success: true,
      message: 'Rooms retrieved successfully.',
      data: {
        rooms,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getRoomById = async (
  req,
  res,
  next
) => {
  try {
    const room =
      await getRoomByIdService({
        user: req.user,
        roomId: req.params.roomId,
      })

    res.status(200).json({
      success: true,
      message: 'Room retrieved successfully.',
      data: {
        room,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const updateRoom = async (
  req,
  res,
  next
) => {
  try {
    const room =
      await updateRoomService({
        user: req.user,
        roomId: req.params.roomId,
        roomData: req.body,
      })

    res.status(200).json({
      success: true,
      message: 'Room updated successfully.',
      data: {
        room,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const deactivateRoom = async (
  req,
  res,
  next
) => {
  try {
    const room =
      await deactivateRoomService({
        user: req.user,
        roomId: req.params.roomId,
      })

    res.status(200).json({
      success: true,
      message: 'Room deactivated successfully.',
      data: {
        room,
      },
    })
  } catch (error) {
    next(error)
  }
}