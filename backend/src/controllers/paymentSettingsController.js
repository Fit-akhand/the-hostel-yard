import {
  createPaymentSettings as createPaymentSettingsService,
  getPaymentSettings as getPaymentSettingsService,
  updatePaymentSettings as updatePaymentSettingsService,
  enablePaymentSettings as enablePaymentSettingsService,
  disablePaymentSettings as disablePaymentSettingsService,
  uploadPaymentQr as uploadPaymentQrService,
} from '../services/paymentSettingsService.js'

// --------------------------------------------------
// CREATE
// --------------------------------------------------

export const createPaymentSettings = async (
  req,
  res,
  next
) => {
  try {
    const paymentSettings =
      await createPaymentSettingsService({
        user: req.user,
        propertyId:
          req.params.propertyId,
        settingsData: req.body,
      })

    res.status(201).json({
      success: true,
      message:
        'Payment settings created successfully.',
      data: {
        paymentSettings,
      },
    })
  } catch (error) {
    next(error)
  }
}

// --------------------------------------------------
// GET
// --------------------------------------------------

export const getPaymentSettings = async (
  req,
  res,
  next
) => {
  try {
    const paymentSettings =
      await getPaymentSettingsService({
        user: req.user,
        propertyId:
          req.params.propertyId,
      })

    res.status(200).json({
      success: true,
      message:
        'Payment settings retrieved successfully.',
      data: {
        paymentSettings,
      },
    })
  } catch (error) {
    next(error)
  }
}

// --------------------------------------------------
// UPDATE
// --------------------------------------------------

export const updatePaymentSettings = async (
  req,
  res,
  next
) => {
  try {
    const paymentSettings =
      await updatePaymentSettingsService({
        user: req.user,
        propertyId:
          req.params.propertyId,
        settingsData: req.body,
      })

    res.status(200).json({
      success: true,
      message:
        'Payment settings updated successfully.',
      data: {
        paymentSettings,
      },
    })
  } catch (error) {
    next(error)
  }
}

// --------------------------------------------------
// UPLOAD PAYMENT QR
// --------------------------------------------------

export const uploadPaymentQr = async (
  req,
  res,
  next
) => {
  try {
    const paymentSettings =
      await uploadPaymentQrService({
        user: req.user,
        propertyId:
          req.params.propertyId,
        file: req.file,
      })

    res.status(200).json({
      success: true,
      message:
        'Payment QR uploaded successfully.',
      data: {
        paymentSettings,
      },
    })
  } catch (error) {
    next(error)
  }
}

// --------------------------------------------------
// ENABLE
// --------------------------------------------------

export const enablePaymentSettings = async (
  req,
  res,
  next
) => {
  try {
    const paymentSettings =
      await enablePaymentSettingsService({
        user: req.user,
        propertyId:
          req.params.propertyId,
      })

    res.status(200).json({
      success: true,
      message:
        'Payment settings enabled successfully.',
      data: {
        paymentSettings,
      },
    })
  } catch (error) {
    next(error)
  }
}

// --------------------------------------------------
// DISABLE
// --------------------------------------------------

export const disablePaymentSettings = async (
  req,
  res,
  next
) => {
  try {
    const paymentSettings =
      await disablePaymentSettingsService({
        user: req.user,
        propertyId:
          req.params.propertyId,
      })

    res.status(200).json({
      success: true,
      message:
        'Payment settings disabled successfully.',
      data: {
        paymentSettings,
      },
    })
  } catch (error) {
    next(error)
  }
}