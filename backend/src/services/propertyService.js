import Property from '../models/Property.js'
import PropertyManagerAssignment from '../models/PropertyManagerAssignment.js'

export const createProperty = async ({
  user,
  propertyData,
}) => {
  if (!user.organization) {
    const error = new Error(
      'User is not associated with an organization.'
    )

    error.statusCode = 400

    throw error
  }

  const property = await Property.create({
    ...propertyData,
    organization: user.organization,
  })

  return property
}

export const getProperties = async (user) => {
  if (!user.organization) {
    const error = new Error(
      'User is not associated with an organization.'
    )

    error.statusCode = 400

    throw error
  }

  // Business Owner can see all properties
  if (user.role === 'BUSINESS_OWNER') {
    const properties = await Property.find({
      organization: user.organization,
      status: 'ACTIVE',
    }).sort({
      createdAt: -1,
    })

    return properties
  }

  // Property Manager can only see assigned properties
  if (user.role === 'PROPERTY_MANAGER') {
    const assignments =
      await PropertyManagerAssignment.find({
        manager: user._id,
        status: 'ACTIVE',
      }).select('property')

    const propertyIds = assignments.map(
      (assignment) => assignment.property
    )

    const properties = await Property.find({
      _id: { $in: propertyIds },
      organization: user.organization,
      status: 'ACTIVE',
    }).sort({
      createdAt: -1,
    })

    return properties
  }

  const error = new Error(
    'You are not authorized to view properties.'
  )

  error.statusCode = 403

  throw error
}

export const getPropertyById = async ({
  user,
  propertyId,
}) => {
  if (!user.organization) {
    const error = new Error(
      'User is not associated with an organization.'
    )

    error.statusCode = 400

    throw error
  }

  // Business Owner can access any property
  // belonging to their organization.
  if (user.role === 'BUSINESS_OWNER') {
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

    return property
  }

  // Property Manager can only access
  // properties assigned to them.
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

    return property
  }

  const error = new Error(
    'You are not authorized to access properties.'
  )

  error.statusCode = 403

  throw error
}

export const updateProperty = async ({
  user,
  propertyId,
  propertyData,
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

  Object.assign(property, propertyData)

  await property.save()

  return property
}

export const deactivateProperty = async ({
  user,
  propertyId,
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
      'Active property not found.'
    )

    error.statusCode = 404

    throw error
  }

  property.status = 'INACTIVE'

  await property.save()

  return property
}