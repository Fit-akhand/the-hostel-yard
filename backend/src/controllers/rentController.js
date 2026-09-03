import {
  createRentPlan as createRentPlanService,
  generateRentDue as generateRentDueService,
  getRentPlans as getRentPlansService,
  getRentDues as getRentDuesService,
  getTenantRentPaymentInfo as getTenantRentPaymentInfoService,
} from '../services/rentService.js'

export const createRentPlan = async (
  req,
  res,
  next
) => {
  try {
    const rentPlan =
      await createRentPlanService({
        user: req.user,
        rentData: req.body,
      })

    res.status(201).json({
      success: true,
      message: 'Rent plan created successfully.',
      data: {
        rentPlan,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const generateRentDue = async (
  req,
  res,
  next
) => {
  try {
    const rentDue =
      await generateRentDueService({
        user: req.user,
        rentPlanId:
          req.params.rentPlanId,
        billingMonth:
          req.body.billingMonth,
      })

    res.status(201).json({
      success: true,
      message: 'Rent due generated successfully.',
      data: {
        rentDue,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getRentPlans = async (
  req,
  res,
  next
) => {
  try {
    const rentPlans =
      await getRentPlansService({
        user: req.user,
        tenantId: req.query.tenantId,
      })

    res.status(200).json({
      success: true,
      message: 'Rent plans retrieved successfully.',
      data: {
        rentPlans,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getRentDues = async (
  req,
  res,
  next
) => {
  try {
    const dues =
      await getRentDuesService({
        user: req.user,
        tenantId: req.query.tenantId,
        status: req.query.status,
      })

    res.status(200).json({
      success: true,
      message: 'Rent dues retrieved successfully.',
      data: {
        dues,
      },
    })
  } catch (error) {
    next(error)
  }
}

// --------------------------------------------------
// GET TENANT RENT PAYMENT INFO
// --------------------------------------------------

export const getTenantRentPaymentInfo = async (
  req,
  res,
  next
) => {
  try {
    const paymentInfo =
      await getTenantRentPaymentInfoService({
        user: req.user,
        rentDueId:
          req.params.rentDueId,
      })

    res.status(200).json({
      success: true,
      message:
        'Rent payment information retrieved successfully.',
      data: {
        paymentInfo,
      },
    })
  } catch (error) {
    next(error)
  }
}
