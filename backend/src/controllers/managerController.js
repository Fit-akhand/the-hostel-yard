import {
  createManagerInvitation as createManagerInvitationService,
  getManagerInvitation as getManagerInvitationService,
  activateManager as activateManagerService,
  updateManagerPermissions as updateManagerPermissionsService,
} from '../services/managerService.js'

export const createManagerInvitation = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await createManagerInvitationService({
        user: req.user,
        managerData: req.body,
      })

    res.status(201).json({
      success: true,
      message:
          'Manager invitation created successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export const getManagerInvitation = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await getManagerInvitationService({
        token: req.params.token,
      })

    res.status(200).json({
      success: true,
      message:
        'Manager invitation retrieved successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export const activateManager = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await activateManagerService({
        token: req.params.token,
        password: req.body.password,
      })

    res.status(201).json({
      success: true,
      message:
        'Manager account activated successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export const updateManagerPermissions = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await updateManagerPermissionsService({
        owner: req.user,
        managerId: req.params.managerId,
        propertyId: req.params.propertyId,
        permissions: req.body.permissions,
      })

    res.status(200).json({
      success: true,
      message:
        'Manager permissions updated successfully.',
      data: {
        assignment: result,
      },
    })
  } catch (error) {
    next(error)
  }
}