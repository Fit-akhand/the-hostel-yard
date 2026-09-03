import {
  inviteTenant as inviteTenantService,
  acceptTenantInvitation as acceptTenantInvitationService,
} from '../services/tenantAccountService.js'

export const inviteTenant =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await inviteTenantService({
          user: req.user,
          tenantId:
            req.params.tenantId,
        })

      res.status(201).json({
        success: true,
        message:
          'Tenant invitation created successfully.',
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

export const acceptTenantInvitation =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await acceptTenantInvitationService(
          req.body
        )

      res.status(200).json({
        success: true,
        message:
          'Tenant account activated successfully.',
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }