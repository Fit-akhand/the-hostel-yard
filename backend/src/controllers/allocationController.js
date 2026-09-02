import {
  createAllocation as createAllocationService,
  getAllocations as getAllocationsService,
  getAllocationById as getAllocationByIdService,
  endAllocation as endAllocationService,
} from '../services/allocationService.js'

export const createAllocation = async (
  req,
  res,
  next
) => {
  try {
    const allocation =
      await createAllocationService({
        user: req.user,
        allocationData: req.body,
      })

    res.status(201).json({
      success: true,
      message:
        'Bed allocated successfully.',
      data: {
        allocation,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getAllocations = async (
  req,
  res,
  next
) => {
  try {
    const allocations =
      await getAllocationsService({
        user: req.user,
        propertyId:
          req.query.propertyId,
      })

    res.status(200).json({
      success: true,
      message:
        'Allocations retrieved successfully.',
      data: {
        allocations,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getAllocationById = async (
  req,
  res,
  next
) => {
  try {
    const allocation =
      await getAllocationByIdService({
        user: req.user,
        allocationId:
          req.params.allocationId,
      })

    res.status(200).json({
      success: true,
      message:
        'Allocation retrieved successfully.',
      data: {
        allocation,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const endAllocation = async (
  req,
  res,
  next
) => {
  try {
    const allocation =
      await endAllocationService({
        user: req.user,
        allocationId:
          req.params.allocationId,
        endDate: req.body.endDate,
      })

    res.status(200).json({
      success: true,
      message:
        'Bed allocation ended successfully.',
      data: {
        allocation,
      },
    })
  } catch (error) {
    next(error)
  }
}