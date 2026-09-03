import {
  createStaffInvitation,
  getStaffInvitation,
  activateStaff,
  getStaff,
  getStaffById,
  updateStaff,
  changeStaffStatus,
} from '../services/staffService.js'


export const createStaff =
  async (req, res, next) => {
    try {
      const result =
        await createStaffInvitation({
          user: req.user,
          staffData: req.body,
        })

      res.status(201).json({
        success: true,
        message:
          'Staff invitation created successfully.',
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }


export const getStaffList =
  async (req, res, next) => {
    try {
      const result =
        await getStaff({
          user: req.user,
          query:
            req.validatedQuery,
        })

      res.status(200).json({
        success: true,
        message:
          'Staff retrieved successfully.',
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }


export const getStaffDetails =
  async (req, res, next) => {
    try {
      const result =
        await getStaffById({
          user: req.user,
          staffId:
            req.params.staffId,
        })

      res.status(200).json({
        success: true,
        message:
          'Staff retrieved successfully.',
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }


export const updateStaffDetails =
  async (req, res, next) => {
    try {
      const result =
        await updateStaff({
          user: req.user,
          staffId:
            req.params.staffId,
          staffData: req.body,
        })

      res.status(200).json({
        success: true,
        message:
          'Staff updated successfully.',
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }


export const updateStaffStatus =
  async (req, res, next) => {
    try {
      const result =
        await changeStaffStatus({
          user: req.user,
          staffId:
            req.params.staffId,
          status:
            req.body.status,
        })

      res.status(200).json({
        success: true,
        message:
          'Staff status updated successfully.',
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }


export const getStaffInvitationDetails =
  async (req, res, next) => {
    try {
      const result =
        await getStaffInvitation({
          token:
            req.params.token,
        })

      res.status(200).json({
        success: true,
        message:
          'Staff invitation retrieved successfully.',
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }


export const activateStaffAccount =
  async (req, res, next) => {
    try {
      const result =
        await activateStaff({
          token:
            req.body.token,
          password:
            req.body.password,
        })

      res.status(201).json({
        success: true,
        message:
          'Staff account activated successfully.',
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }