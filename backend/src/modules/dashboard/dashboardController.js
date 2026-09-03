import {
  getDashboardOverview,
} from './dashboardService.js'

export const getOverview = async (
  req,
  res,
  next
) => {
  try {
    const data =
      await getDashboardOverview({
        user: req.user,
        propertyId:
          req.validatedQuery?.propertyId ||
          null,
      })

    res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    next(error)
  }
}