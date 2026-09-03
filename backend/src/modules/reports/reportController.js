import {
  getOccupancyReport,
  getRentReport,
  getPaymentReport,
  getExpenseReport,
  getComplaintReport,
  getTenantReport,
  getBookingReport,
} from './reportService.js'

const getQuery = (req) =>
  req.validatedQuery || {}

export const occupancyReport =
  async (req, res, next) => {
    try {
      const data =
        await getOccupancyReport({
          user: req.user,
          ...getQuery(req),
        })

      res.status(200).json({
        success: true,
        data,
      })
    } catch (error) {
      next(error)
    }
  }

export const rentReport =
  async (req, res, next) => {
    try {
      const data =
        await getRentReport({
          user: req.user,
          ...getQuery(req),
        })

      res.status(200).json({
        success: true,
        data,
      })
    } catch (error) {
      next(error)
    }
  }

export const paymentReport =
  async (req, res, next) => {
    try {
      const data =
        await getPaymentReport({
          user: req.user,
          ...getQuery(req),
        })

      res.status(200).json({
        success: true,
        data,
      })
    } catch (error) {
      next(error)
    }
  }

export const expenseReport =
  async (req, res, next) => {
    try {
      const data =
        await getExpenseReport({
          user: req.user,
          ...getQuery(req),
        })

      res.status(200).json({
        success: true,
        data,
      })
    } catch (error) {
      next(error)
    }
  }

export const complaintReport =
  async (req, res, next) => {
    try {
      const data =
        await getComplaintReport({
          user: req.user,
          ...getQuery(req),
        })

      res.status(200).json({
        success: true,
        data,
      })
    } catch (error) {
      next(error)
    }
  }

export const tenantReport =
  async (req, res, next) => {
    try {
      const data =
        await getTenantReport({
          user: req.user,
          ...getQuery(req),
        })

      res.status(200).json({
        success: true,
        data,
      })
    } catch (error) {
      next(error)
    }
  }

export const bookingReport =
  async (req, res, next) => {
    try {
      const data =
        await getBookingReport({
          user: req.user,
          ...getQuery(req),
        })

      res.status(200).json({
        success: true,
        data,
      })
    } catch (error) {
      next(error)
    }
  }