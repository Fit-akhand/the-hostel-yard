import {
  createBed as createBedService,
  getBedsByRoom as getBedsByRoomService,
  getBedById as getBedByIdService,
  updateBed as updateBedService,
  deactivateBed as deactivateBedService,
} from '../services/bedService.js'

export const createBed = async (
  req,
  res,
  next
) => {
  try {
    const bed =
      await createBedService({
        user: req.user,
        roomId: req.params.roomId,
        bedData: req.body,
      })

    res.status(201).json({
      success: true,
      message: 'Bed created successfully.',
      data: {
        bed,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getBedsByRoom = async (
  req,
  res,
  next
) => {
  try {
    const beds =
      await getBedsByRoomService({
        user: req.user,
        roomId: req.params.roomId,
        status: req.query.status,
      })

    res.status(200).json({
      success: true,
      message: 'Beds retrieved successfully.',
      data: {
        beds,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getBedById = async (
  req,
  res,
  next
) => {
  try {
    const bed =
      await getBedByIdService({
        user: req.user,
        bedId: req.params.bedId,
      })

    res.status(200).json({
      success: true,
      message: 'Bed retrieved successfully.',
      data: {
        bed,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const updateBed = async (
  req,
  res,
  next
) => {
  try {
    const bed =
      await updateBedService({
        user: req.user,
        bedId: req.params.bedId,
        bedData: req.body,
      })

    res.status(200).json({
      success: true,
      message: 'Bed updated successfully.',
      data: {
        bed,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const deactivateBed = async (
  req,
  res,
  next
) => {
  try {
    const bed =
      await deactivateBedService({
        user: req.user,
        bedId: req.params.bedId,
      })

    res.status(200).json({
      success: true,
      message:
        'Bed deactivated successfully.',
      data: {
        bed,
      },
    })
  } catch (error) {
    next(error)
  }
}