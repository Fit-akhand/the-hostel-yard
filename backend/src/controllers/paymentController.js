import {
  createPayment as createPaymentService,
  createTenantPayment as createTenantPaymentService,
  getTenantPaymentInformation as getTenantPaymentInformationService,
  getPayments as getPaymentsService,
  getPaymentById as getPaymentByIdService,
  verifyPayment as verifyPaymentService,
  rejectPayment as rejectPaymentService,
  getTenantPaymentHistory as getTenantPaymentHistoryService,
} from '../services/paymentService.js'

// --------------------------------------------------
// CREATE PAYMENT
// --------------------------------------------------

export const createPayment = async (
  req,
  res,
  next
) => {
  try {
    const payment =
      await createPaymentService({
        user: req.user,
        paymentData: req.body,
      })

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully.',
      data: {
        payment,
      },
    })
  } catch (error) {
    next(error)
  }
}

// --------------------------------------------------
// GET PAYMENTS
// --------------------------------------------------

export const getPayments = async (
  req,
  res,
  next
) => {
  try {
    const payments =
      await getPaymentsService({
        user: req.user,
        status: req.query.status,
        method: req.query.method,
        tenantId: req.query.tenantId,
        rentDueId: req.query.rentDueId,
      })

    res.status(200).json({
      success: true,
      message: 'Payments retrieved successfully.',
      data: {
        payments,
      },
    })
  } catch (error) {
    next(error)
  }
}

// --------------------------------------------------
// GET PAYMENT BY ID
// --------------------------------------------------

export const getPaymentById = async (
  req,
  res,
  next
) => {
  try {
    const payment =
      await getPaymentByIdService({
        user: req.user,
        paymentId: req.params.paymentId,
      })

    res.status(200).json({
      success: true,
      message: 'Payment retrieved successfully.',
      data: {
        payment,
      },
    })
  } catch (error) {
    next(error)
  }
}

// --------------------------------------------------
// VERIFY PAYMENT
// --------------------------------------------------

export const verifyPayment = async (
  req,
  res,
  next
) => {
  try {
    const payment =
      await verifyPaymentService({
        user: req.user,
        paymentId: req.params.paymentId,
      })

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully.',
      data: {
        payment,
      },
    })
  } catch (error) {
    next(error)
  }
}

// --------------------------------------------------
// REJECT PAYMENT
// --------------------------------------------------

export const rejectPayment = async (
  req,
  res,
  next
) => {
  try {
    const payment =
      await rejectPaymentService({
        user: req.user,
        paymentId: req.params.paymentId,
        notes: req.body.notes,
      })

    res.status(200).json({
      success: true,
      message: 'Payment rejected successfully.',
      data: {
        payment,
      },
    })
  } catch (error) {
    next(error)
  }
}

// --------------------------------------------------
// CREATE PAYMENT - TENANT
// --------------------------------------------------

export const createTenantPayment = async (
  req,
  res,
  next
) => {
  try {
    const payment =
      await createTenantPaymentService({
        user: req.user,
        paymentData: req.body,
      })

    res.status(201).json({
      success: true,
      message:
        'Rent payment submitted successfully.',
      data: {
        payment,
      },
    })
  } catch (error) {
    next(error)
  }
}

// --------------------------------------------------
// GET TENANT PAYMENT INFORMATION
// --------------------------------------------------

export const getTenantPaymentInformation =
  async (
    req,
    res,
    next
  ) => {
    try {
      const information =
        await getTenantPaymentInformationService({
          user: req.user,
        })

      res.status(200).json({
        success: true,
        message:
          'Tenant payment information retrieved successfully.',
        data: {
          information,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  export const getTenantPaymentHistory = async (
  req,
  res,
  next
) => {
  try {
    const data =
      await getTenantPaymentHistoryService({
        user: req.user,
        tenantId: req.query.tenantId,
        status: req.query.status,
        method: req.query.method,
      })

    res.status(200).json({
      success: true,
      message: 'Tenant payment history retrieved successfully.',
      data,
    })
  } catch (error) {
    next(error)
  }
}