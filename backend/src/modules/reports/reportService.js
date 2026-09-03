import Tenant from '../../models/Tenant.js'
import Bed from '../../models/Bed.js'
import RentDue from '../../models/RentDue.js'
import Payment from '../../models/Payment.js'
import Expense from '../../models/Expense.js'
import Complaint from '../../models/Complaint.js'
import Booking from '../../models/Booking.js'
import PropertyManagerAssignment from '../../models/PropertyManagerAssignment.js'
import StaffAssignment from '../../models/StaffAssignment.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import Property from '../../models/Property.js'

const createError = (
  message,
  statusCode = 400
) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const getPropertyIds = async ({
  user,
  propertyId,
  permission,
}) => {
  if (!user.organization) {
    throw createError(
      'User is not associated with an organization.',
      400
    )
  }

  let propertyIds = []

  if (user.role === 'BUSINESS_OWNER') {
    const properties =
      await Property.find({
        organization:
          user.organization,
        status: 'ACTIVE',
      }).select('_id')

    propertyIds =
      properties.map(
        (property) => property._id
      )
  }

  else if (
    user.role === 'PROPERTY_MANAGER'
  ) {
    const assignments =
      await PropertyManagerAssignment
        .find({
          manager: user._id,
          status: 'ACTIVE',
          ...(permission
            ? {
                permissions:
                  permission,
              }
            : {}),
        })
        .select('property')

    propertyIds =
      assignments.map(
        (assignment) =>
          assignment.property
      )
  }

else if (user.role === 'STAFF') {
  const assignments = await StaffAssignment.find({
    staff: user._id,
    status: 'ACTIVE',
  }).select('property permissions')

  if (!assignments.length) {
    throw createError(
      'You are not assigned to any property.',
      403
    )
  }

  if (permission) {
    const allowedAssignments = assignments.filter(
      (assignment) =>
        assignment.permissions.includes(permission)
    )

    if (!allowedAssignments.length) {
      throw createError(
        'You do not have permission to view this report.',
        403
      )
    }

    propertyIds = allowedAssignments.map(
      (assignment) => assignment.property
    )
  } else {
    propertyIds = assignments.map(
      (assignment) => assignment.property
    )
  }
}

  else {
    throw createError(
      'You are not authorized to access reports.',
      403
    )
  }

  if (propertyId) {
    const matchedPropertyId = propertyIds.find(
        (id) => id.toString() === propertyId.toString()
    )

    if (!matchedPropertyId) {
        throw createError(
            'You are not authorized to access this property.',
            403
        )
    }

    return [matchedPropertyId]
}

return propertyIds

}

/*
|--------------------------------------------------------------------------
| OCCUPANCY
|--------------------------------------------------------------------------
*/

export const getOccupancyReport =
  async ({
    user,
    propertyId,
  }) => {
    const propertyIds =
      await getPropertyIds({
        user,
        propertyId,
        permission:
          PERMISSIONS.VIEW_ROOMS,
      })

    const beds =
      await Bed.aggregate([
        {
          $match: {
            organization:
              user.organization,
            property: {
              $in: propertyIds,
            },
          },
        },
        {
          $group: {
            _id: '$property',
            totalBeds: {
              $sum: 1,
            },
            occupiedBeds: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      '$status',
                      'OCCUPIED',
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            availableBeds: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      '$status',
                      'AVAILABLE',
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ])

    return beds.map(
      (item) => ({
        property: item._id,
        totalBeds:
          item.totalBeds,
        occupiedBeds:
          item.occupiedBeds,
        availableBeds:
          item.availableBeds,
        occupancyPercentage:
          item.totalBeds
            ? Number(
                (
                  (item.occupiedBeds /
                    item.totalBeds) *
                  100
                ).toFixed(2)
              )
            : 0,
      })
    )
  }

/*
|--------------------------------------------------------------------------
| RENT
|--------------------------------------------------------------------------
*/

export const getRentReport =
  async ({
    user,
    propertyId,
    startDate,
    endDate,
  }) => {
    const propertyIds =
      await getPropertyIds({
        user,
        propertyId,
        permission:
          PERMISSIONS.VIEW_DUES,
      })

    const match = {
      organization:
        user.organization,
      property: {
        $in: propertyIds,
      },
    }

    if (startDate || endDate) {
      match.dueDate = {}

      if (startDate) {
        match.dueDate.$gte =
          new Date(startDate)
      }

      if (endDate) {
        const end =
          new Date(endDate)

        end.setDate(
          end.getDate() + 1
        )

        match.dueDate.$lt = end
      }
    }

    return RentDue.aggregate([
      {
        $match: match,
      },
      {
        $group: {
          _id: '$property',
          totalDue: {
            $sum: '$amount',
          },
          totalPaid: {
            $sum: '$paidAmount',
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          property: '$_id',
          _id: 0,
          totalDue: 1,
          totalPaid: 1,
          outstanding: {
            $subtract: [
              '$totalDue',
              '$totalPaid',
            ],
          },
          count: 1,
        },
      },
    ])
  }

/*
|--------------------------------------------------------------------------
| PAYMENTS
|--------------------------------------------------------------------------
*/

export const getPaymentReport =
  async ({
    user,
    propertyId,
    startDate,
    endDate,
  }) => {
    const propertyIds =
      await getPropertyIds({
        user,
        propertyId,
        permission:
          PERMISSIONS.VIEW_PAYMENTS,
      })

    const match = {
      organization:
        user.organization,
      property: {
        $in: propertyIds,
      },
    }

    if (startDate || endDate) {
      match.paymentDate = {}

      if (startDate) {
        match.paymentDate.$gte =
          new Date(startDate)
      }

      if (endDate) {
        const end =
          new Date(endDate)

        end.setDate(
          end.getDate() + 1
        )

        match.paymentDate.$lt =
          end
      }
    }

    return Payment.aggregate([
      {
        $match: match,
      },
      {
        $group: {
          _id: {
            property: '$property',
            status: '$status',
          },
          amount: {
            $sum: '$amount',
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          amount: -1,
        },
      },
    ])
  }

/*
|--------------------------------------------------------------------------
| EXPENSES
|--------------------------------------------------------------------------
*/

export const getExpenseReport =
  async ({
    user,
    propertyId,
    startDate,
    endDate,
  }) => {
    const propertyIds =
      await getPropertyIds({
        user,
        propertyId,
        permission:
          PERMISSIONS.VIEW_EXPENSES,
      })

    const match = {
      organization:
        user.organization,
      property: {
        $in: propertyIds,
      },
      status: 'ACTIVE',
    }

    if (startDate || endDate) {
      match.expenseDate = {}

      if (startDate) {
        match.expenseDate.$gte =
          new Date(startDate)
      }

      if (endDate) {
        const end =
          new Date(endDate)

        end.setDate(
          end.getDate() + 1
        )

        match.expenseDate.$lt =
          end
      }
    }

    return Expense.aggregate([
      {
        $match: match,
      },
      {
        $group: {
          _id: {
            property: '$property',
            category: '$category',
          },
          amount: {
            $sum: '$amount',
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          amount: -1,
        },
      },
    ])
  }

/*
|--------------------------------------------------------------------------
| COMPLAINTS
|--------------------------------------------------------------------------
*/

export const getComplaintReport =
  async ({
    user,
    propertyId,
  }) => {
    const propertyIds =
      await getPropertyIds({
        user,
        propertyId,
        permission:
          PERMISSIONS.VIEW_COMPLAINTS,
      })

    return Complaint.aggregate([
      {
        $match: {
          organization:
            user.organization,
          property: {
            $in: propertyIds,
          },
        },
      },
      {
        $group: {
          _id: {
            property: '$property',
            status: '$status',
            priority: '$priority',
            category: '$category',
          },
          count: {
            $sum: 1,
          },
        },
      },
    ])
  }

/*
|--------------------------------------------------------------------------
| TENANTS
|--------------------------------------------------------------------------
*/

export const getTenantReport =
  async ({
    user,
    propertyId,
  }) => {
    const propertyIds =
      await getPropertyIds({
        user,
        propertyId,
        permission:
          PERMISSIONS.VIEW_TENANTS,
      })

    return Tenant.aggregate([
      {
        $match: {
          organization:
            user.organization,
          property: {
            $in: propertyIds,
          },
        },
      },
      {
        $group: {
          _id: {
            property: '$property',
            status: '$status',
          },
          count: {
            $sum: 1,
          },
        },
      },
    ])
  }

/*
|--------------------------------------------------------------------------
| BOOKINGS
|--------------------------------------------------------------------------
*/

export const getBookingReport =
  async ({
    user,
    propertyId,
  }) => {
    const propertyIds =
      await getPropertyIds({
        user,
        propertyId,
        permission:
          PERMISSIONS.VIEW_BOOKINGS,
      })

    return Booking.aggregate([
      {
        $match: {
          organization:
            user.organization,
          property: {
            $in: propertyIds,
          },
        },
      },
      {
        $group: {
          _id: {
            property: '$property',
            status: '$status',
          },
          count: {
            $sum: 1,
          },
        },
      },
    ])
  }