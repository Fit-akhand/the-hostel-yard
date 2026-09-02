import {
  createProperty as createPropertyService,
  getProperties as getPropertiesService,
  getPropertyById as getPropertyByIdService,
  updateProperty as updatePropertyService,
  deactivateProperty as deactivatePropertyService,
} from '../services/propertyService.js'

export const createProperty = async (
  req,
  res,
  next
) => {
  try {
    const property =
      await createPropertyService({
        user: req.user,
        propertyData: req.body,
      })

    res.status(201).json({
      success: true,
      message: 'Property created successfully.',
      data: {
        property,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getProperties = async (
  req,
  res,
  next
) => {
  try {
    const properties =
      await getPropertiesService(req.user)

    res.status(200).json({
      success: true,
      message: 'Properties retrieved successfully.',
      data: {
        properties,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getPropertyById = async (
  req,
  res,
  next
) => {
  try {
    const property =
      await getPropertyByIdService({
        user: req.user,
        propertyId: req.params.propertyId,
      })

    res.status(200).json({
      success: true,
      message: 'Property retrieved successfully.',
      data: {
        property,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const updateProperty = async (
  req,
  res,
  next
) => {
  try {
    const property =
      await updatePropertyService({
        user: req.user,
        propertyId: req.params.propertyId,
        propertyData: req.body,
      })

    res.status(200).json({
      success: true,
      message: 'Property updated successfully.',
      data: {
        property,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const deactivateProperty = async (
  req,
  res,
  next
) => {
  try {
    const property =
      await deactivatePropertyService({
        user: req.user,
        propertyId: req.params.propertyId,
      })

    res.status(200).json({
      success: true,
      message: 'Property deactivated successfully.',
      data: {
        property,
      },
    })
  } catch (error) {
    next(error)
  }
}