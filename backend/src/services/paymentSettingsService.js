import PaymentSettings from '../models/PaymentSettings.js'
import Property from '../models/Property.js'
import PropertyManagerAssignment from '../models/PropertyManagerAssignment.js'
import { PERMISSIONS } from '../constants/permissions.js'

// --------------------------------------------------
// PROPERTY ACCESS
// --------------------------------------------------

const checkPropertyAccess = async ({
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
  })

  if (!property) {
    const error = new Error(
      'Property not found.'
    )

    error.statusCode = 404
    throw error
  }

  // Business Owner has access to
  // every property in organization.
  if (
    user.role === 'BUSINESS_OWNER'
  ) {
    return property
  }

  // Property Manager requires
  // active assignment.
  if (
    user.role === 'PROPERTY_MANAGER'
  ) {
    const assignment =
      await PropertyManagerAssignment.findOne({
        manager: user._id,
        property: property._id,
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

    return property
  }

  const error = new Error(
    'You are not authorized to access this property.'
  )

  error.statusCode = 403
  throw error
}

// --------------------------------------------------
// CREATE PAYMENT SETTINGS
// --------------------------------------------------

export const createPaymentSettings = async ({
  user,
  propertyId,
  settingsData,
}) => {
  await checkPropertyAccess({
  user,
  propertyId,
  permission:
    PERMISSIONS.MANAGE_PAYMENT_SETTINGS,
})

  const existing =
    await PaymentSettings.findOne({
      property: propertyId,
      organization: user.organization,
    })

  if (existing) {
    const error = new Error(
      'Payment settings already exist for this property.'
    )

    error.statusCode = 409
    throw error
  }

  const paymentSettings =
  await PaymentSettings.create({
    organization: user.organization,
    property: propertyId,

    upiId:
      settingsData.upiId ?? null,

    accountName:
      settingsData.accountName ?? null,

    qrImageUrl: null,

    qrImagePublicId: null,

    paymentInstructions:
      settingsData.paymentInstructions ??
      'Scan the QR and pay your rent.',

    isEnabled:
      settingsData.isEnabled ?? true,
  })

  return paymentSettings
}

// --------------------------------------------------
// GET PAYMENT SETTINGS
// --------------------------------------------------

export const getPaymentSettings = async ({
  user,
  propertyId,
}) => {
  await checkPropertyAccess({
  user,
  propertyId,
  permission:
    PERMISSIONS.VIEW_PAYMENT_SETTINGS,
})

  const paymentSettings =
    await PaymentSettings.findOne({
      property: propertyId,
      organization: user.organization,
    }).populate(
      'property',
      'name type city state address pincode status'
    )

  if (!paymentSettings) {
    const error = new Error(
      'Payment settings not configured for this property.'
    )

    error.statusCode = 404
    throw error
  }

  return paymentSettings
}

// --------------------------------------------------
// UPDATE PAYMENT SETTINGS
// --------------------------------------------------

export const updatePaymentSettings = async ({
  user,
  propertyId,
  settingsData,
}) => {
await checkPropertyAccess({
  user,
  propertyId,
  permission:
    PERMISSIONS.MANAGE_PAYMENT_SETTINGS,
})

  const paymentSettings =
    await PaymentSettings.findOne({
      property: propertyId,
      organization: user.organization,
    })

  if (!paymentSettings) {
    const error = new Error(
      'Payment settings not configured for this property.'
    )

    error.statusCode = 404
    throw error
  }

  if (
    settingsData.upiId !== undefined
  ) {
    paymentSettings.upiId =
      settingsData.upiId
  }

  if (
    settingsData.accountName !==
    undefined
  ) {
    paymentSettings.accountName =
      settingsData.accountName
  }

  if (
    settingsData.paymentInstructions !==
    undefined
  ) {
    paymentSettings.paymentInstructions =
      settingsData.paymentInstructions
  }

  if (
    settingsData.isEnabled !==
    undefined
  ) {
    paymentSettings.isEnabled =
      settingsData.isEnabled
  }

  await paymentSettings.save()

  return paymentSettings
}

// --------------------------------------------------
// UPLOAD PAYMENT QR
// --------------------------------------------------

export const uploadPaymentQr = async ({
  user,
  propertyId,
  file,
}) => {
  await checkPropertyAccess({
    user,
    propertyId,
    permission:
      PERMISSIONS.MANAGE_PAYMENT_SETTINGS,
  })

  if (!file) {
    const error = new Error(
      'Payment QR image is required.'
    )

    error.statusCode = 400
    throw error
  }

  const paymentSettings =
    await PaymentSettings.findOne({
      property: propertyId,
      organization: user.organization,
    })

  if (!paymentSettings) {
    const error = new Error(
      'Payment settings not configured for this property.'
    )

    error.statusCode = 404
    throw error
  }

  // Store the URL/path generated by the upload middleware.
  paymentSettings.qrImageUrl =
    file.path || file.location || file.filename

  // Keep public ID null for now.
  // Cloudinary will populate this later.
  paymentSettings.qrImagePublicId =
    paymentSettings.qrImagePublicId || null

  await paymentSettings.save()

  return paymentSettings
}

// --------------------------------------------------
// ENABLE PAYMENT SETTINGS
// --------------------------------------------------

export const enablePaymentSettings = async ({
  user,
  propertyId,
}) => {
 await checkPropertyAccess({
  user,
  propertyId,
  permission:
    PERMISSIONS.MANAGE_PAYMENT_SETTINGS,
})

  const paymentSettings =
    await PaymentSettings.findOne({
      property: propertyId,
      organization: user.organization,
    })

  if (!paymentSettings) {
    const error = new Error(
      'Payment settings not configured for this property.'
    )

    error.statusCode = 404
    throw error
  }

  paymentSettings.isEnabled = true

  await paymentSettings.save()

  return paymentSettings
}

// --------------------------------------------------
// DISABLE PAYMENT SETTINGS
// --------------------------------------------------

export const disablePaymentSettings = async ({
  user,
  propertyId,
}) => {
  await checkPropertyAccess({
  user,
  propertyId,
  permission:
    PERMISSIONS.MANAGE_PAYMENT_SETTINGS,
})

  const paymentSettings =
    await PaymentSettings.findOne({
      property: propertyId,
      organization: user.organization,
    })

  if (!paymentSettings) {
    const error = new Error(
      'Payment settings not configured for this property.'
    )

    error.statusCode = 404
    throw error
  }

  paymentSettings.isEnabled = false

  await paymentSettings.save()

  return paymentSettings
}