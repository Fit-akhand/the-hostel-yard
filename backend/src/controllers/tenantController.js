import {
  createTenant as createTenantService,
  getTenants as getTenantsService,
  getTenantById as getTenantByIdService,
  updateTenant as updateTenantService,
  startTenantNotice as startTenantNoticeService,
  moveOutTenant as moveOutTenantService,
} from '../services/tenantService.js'

export const createTenant = async (
  req,
  res,
  next
) => {
  try {
    const tenant =
      await createTenantService({
        user: req.user,
        tenantData: req.body,
      })

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully.',
      data: {
        tenant,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getTenants = async (
  req,
  res,
  next
) => {
  try {
    const tenants =
      await getTenantsService({
        user: req.user,
        propertyId: req.validatedQuery.propertyId,
        status: req.validatedQuery.status,
      })

    res.status(200).json({
      success: true,
      message: 'Tenants retrieved successfully.',
      data: {
        tenants,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getTenantById = async (
  req,
  res,
  next
) => {
  try {
    const tenant =
      await getTenantByIdService({
        user: req.user,
        tenantId: req.params.tenantId,
      })

    res.status(200).json({
      success: true,
      message: 'Tenant retrieved successfully.',
      data: {
        tenant,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const updateTenant = async (
  req,
  res,
  next
) => {
  try {
    const tenant =
      await updateTenantService({
        user: req.user,
        tenantId: req.params.tenantId,
        tenantData: req.body,
      })

    res.status(200).json({
      success: true,
      message: 'Tenant updated successfully.',
      data: {
        tenant,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const startTenantNotice = async (
  req,
  res,
  next
) => {
  try {
    const tenant =
      await startTenantNoticeService({
        user: req.user,
        tenantId: req.params.tenantId,
        expectedMoveOutDate:
          req.body.expectedMoveOutDate,
      })

    res.status(200).json({
      success: true,
      message:
        'Tenant notice period started successfully.',
      data: {
        tenant,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const moveOutTenant = async (
  req,
  res,
  next
) => {
  try {
    const tenant =
      await moveOutTenantService({
        user: req.user,
        tenantId: req.params.tenantId,
        actualMoveOutDate:
          req.body.actualMoveOutDate,
      })

    res.status(200).json({
      success: true,
      message:
        'Tenant moved out successfully.',
      data: {
        tenant,
      },
    })
  } catch (error) {
    next(error)
  }
}