import Property from '../../models/Property.js'
import Tenant from '../../models/Tenant.js'
import Room from '../../models/Room.js'
import Bed from '../../models/Bed.js'
import RentDue from '../../models/RentDue.js'
import Payment from '../../models/Payment.js'
import Expense from '../../models/Expense.js'
import Complaint from '../../models/Complaint.js'
import Booking from '../../models/Booking.js'

import PropertyManagerAssignment from '../../models/PropertyManagerAssignment.js'
import StaffAssignment from '../../models/StaffAssignment.js'

import { PERMISSIONS } from '../../constants/permissions.js'

const createError = (message, statusCode = 400) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

/*
|--------------------------------------------------------------------------
| GET USER PROPERTY ACCESS
|--------------------------------------------------------------------------
*/

const getAccessibleProperties = async ({
  user,
  permission = null,
  propertyId = null,
}) => {
  if (!user.organization) {
    throw createError(
      'User is not associated with an organization.',
      400
    )
  }

  /*
  |--------------------------------------------------------------------------
  | BUSINESS OWNER
  |--------------------------------------------------------------------------
  */

  if (user.role === 'BUSINESS_OWNER') {
    const propertyQuery = {
  organization: user.organization,
  status: 'ACTIVE',
}

if (propertyId) {
    propertyQuery._id = propertyId
    }

    return Property.find(propertyQuery)
    .select('_id name type city state')
  }

  /*
  |--------------------------------------------------------------------------
  | PROPERTY MANAGER
  |--------------------------------------------------------------------------
  */

  if (user.role === 'PROPERTY_MANAGER') {
    const query = {
      manager: user._id,
      status: 'ACTIVE',
    }

    if (permission) {
      query.permissions = permission
    }

    const assignments =
      await PropertyManagerAssignment
        .find(query)
        .select('property')

    const propertyIds = assignments.map(
      (assignment) => assignment.property
    )

    if (!propertyIds.length) {
      return []
    }

    const propertyQuery = {
    _id: { $in: propertyIds },
    organization: user.organization,
    status: 'ACTIVE',
    }

    if (propertyId) {
        propertyQuery._id = propertyId
        }

        return Property.find(propertyQuery)
        .select('_id name type city state')
    }

  /*
  |--------------------------------------------------------------------------
  | STAFF
  |--------------------------------------------------------------------------
  */

  if (user.role === 'STAFF') {
    const query = {
      staff: user._id,
      status: 'ACTIVE',
    }

    if (permission) {
      query.permissions = permission
    }

    const assignments =
      await StaffAssignment
        .find(query)
        .select('property')

    const propertyIds = assignments.map(
      (assignment) => assignment.property
    )

    if (!propertyIds.length) {
      return []
    }

    const propertyQuery = {
    _id: { $in: propertyIds },
    organization: user.organization,
    status: 'ACTIVE',
    }

    if (propertyId) {
    propertyQuery._id = propertyId
    }

    return Property.find(propertyQuery)
    .select('_id name type city state')
  }

  return []
}

/*
|--------------------------------------------------------------------------
| PROPERTY FILTER
|--------------------------------------------------------------------------
*/

const getPropertyIds = async ({
  user,
  propertyId,
  permission,
}) => {
  const properties = await getAccessibleProperties({
    user,
    permission,
  })

  let propertyIds = properties.map(
    (property) => property._id
  )

  if (propertyId) {
    const matchedPropertyId = propertyIds.find(
      (id) =>
        id.toString() === propertyId.toString()
    )

    if (!matchedPropertyId) {
      throw createError(
        'You are not authorized to access this property.',
        403
      )
    }

    propertyIds = [matchedPropertyId]
  }

  return propertyIds
}

/*
|--------------------------------------------------------------------------
| DATE HELPERS
|--------------------------------------------------------------------------
*/

const getMonthRange = () => {
  const now = new Date()

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  )

  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  )

  return { start, end }
}

/*
|--------------------------------------------------------------------------
| DASHBOARD OVERVIEW
|--------------------------------------------------------------------------
*/

export const getDashboardOverview = async ({
  user,
  propertyId = null,
}) => {
  if (!user.organization) {
    throw createError(
      'User is not associated with an organization.',
      400
    )
  }

  /*
  |--------------------------------------------------------------------------
  | Determine permissions
  |--------------------------------------------------------------------------
  */

  const permissionMap = {
    tenants: PERMISSIONS.VIEW_TENANTS,
    rooms: PERMISSIONS.VIEW_ROOMS,
    allocations: PERMISSIONS.VIEW_ALLOCATIONS,
    dues: PERMISSIONS.VIEW_DUES,
    payments: PERMISSIONS.VIEW_PAYMENTS,
    expenses: PERMISSIONS.VIEW_EXPENSES,
    complaints: PERMISSIONS.VIEW_COMPLAINTS,
    bookings: PERMISSIONS.VIEW_BOOKINGS,
  }

  /*
  |--------------------------------------------------------------------------
  | PROPERTY IDS
  |--------------------------------------------------------------------------
  */

  const allProperties =
    await getAccessibleProperties({
      user,
      propertyId,
    })

  const propertyIds =
    allProperties.map(
      (property) => property._id
    )

  if (!propertyIds.length) {
    return {
      properties: {
        total: 0,
      },
      tenants: null,
      rooms: null,
      occupancy: null,
      rent: null,
      payments: null,
      expenses: null,
      complaints: null,
      bookings: null,
    }
  }

  /*
  |--------------------------------------------------------------------------
  | PROPERTY
  |--------------------------------------------------------------------------
  */

  const propertyCount = propertyIds.length

  /*
  |--------------------------------------------------------------------------
  | TENANTS
  |--------------------------------------------------------------------------
  */

  let tenants = null

  const tenantProperties =
    await getPropertyIds({
      user,
      propertyId,
      permission:
        permissionMap.tenants,
    })

  if (tenantProperties.length) {
    const tenantStats =
      await Tenant.aggregate([
        {
          $match: {
            organization: user.organization,
            property: {
              $in: tenantProperties,
            },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ])

    tenants = {
      total: tenantStats.reduce(
        (sum, item) => sum + item.count,
        0
      ),
      active:
        tenantStats.find(
          (item) => item._id === 'ACTIVE'
        )?.count || 0,
      inactive:
        tenantStats.find(
          (item) => item._id !== 'ACTIVE'
        )?.count || 0,
    }
  }

  /*
  |--------------------------------------------------------------------------
  | ROOMS / BEDS
  |--------------------------------------------------------------------------
  */

  let rooms = null
  let occupancy = null

  const roomProperties =
    await getPropertyIds({
      user,
      propertyId,
      permission:
        permissionMap.rooms,
    })

  if (roomProperties.length) {
    const roomCount =
      await Room.countDocuments({
        organization: user.organization,
        property: {
          $in: roomProperties,
        },
      })

    const bedStats =
      await Bed.aggregate([
        {
          $match: {
            organization: user.organization,
            property: {
              $in: roomProperties,
            },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ])

    const totalBeds = bedStats.reduce(
      (sum, item) => sum + item.count,
      0
    )

    const occupiedBeds =
      bedStats.find(
        (item) => item._id === 'OCCUPIED'
      )?.count || 0

    const availableBeds =
      bedStats.find(
        (item) => item._id === 'AVAILABLE'
      )?.count || 0

    rooms = {
      total: roomCount,
      beds: totalBeds,
    }

    occupancy = {
      totalBeds,
      occupiedBeds,
      availableBeds,
      occupancyPercentage:
        totalBeds > 0
          ? Number(
              (
                (occupiedBeds / totalBeds) *
                100
              ).toFixed(2)
            )
          : 0,
    }
  }

  /*
  |--------------------------------------------------------------------------
  | RENT
  |--------------------------------------------------------------------------
  */

  let rent = null

  const dueProperties =
    await getPropertyIds({
      user,
      propertyId,
      permission:
        permissionMap.dues,
    })

  if (dueProperties.length) {
    const dueStats =
      await RentDue.aggregate([
        {
          $match: {
            organization: user.organization,
            property: {
              $in: dueProperties,
            },
          },
        },
        {
          $group: {
            _id: '$status',
            amount: {
              $sum: '$amount',
            },
            paidAmount: {
              $sum: '$paidAmount',
            },
            count: {
              $sum: 1,
            },
          },
        },
      ])

    const totalDue =
      dueStats.reduce(
        (sum, item) =>
          sum + item.amount,
        0
      )

    const totalPaid =
      dueStats.reduce(
        (sum, item) =>
          sum + item.paidAmount,
        0
      )

    rent = {
      totalDue,
      totalPaid,
      pending:
        dueStats.find(
          (item) => item._id === 'PENDING'
        )?.amount || 0,
      partial:
        dueStats.find(
          (item) => item._id === 'PARTIAL'
        )?.amount || 0,
      paid:
        dueStats.find(
          (item) => item._id === 'PAID'
        )?.amount || 0,
      outstanding:
        totalDue - totalPaid,
    }
  }

  /*
  |--------------------------------------------------------------------------
  | PAYMENTS
  |--------------------------------------------------------------------------
  */

  let payments = null

  const paymentProperties =
    await getPropertyIds({
      user,
      propertyId,
      permission:
        permissionMap.payments,
    })

  if (paymentProperties.length) {
    const paymentStats =
      await Payment.aggregate([
        {
          $match: {
            organization: user.organization,
            property: {
              $in: paymentProperties,
            },
          },
        },
        {
          $group: {
            _id: '$status',
            amount: {
              $sum: '$amount',
            },
            count: {
              $sum: 1,
            },
          },
        },
      ])

    payments = {
      pending:
        paymentStats.find(
          (item) => item._id === 'PENDING'
        ) || {
          amount: 0,
          count: 0,
        },

      verified:
        paymentStats.find(
          (item) => item._id === 'VERIFIED'
        ) || {
          amount: 0,
          count: 0,
        },

      rejected:
        paymentStats.find(
          (item) => item._id === 'REJECTED'
        ) || {
          amount: 0,
          count: 0,
        },
    }
  }

  /*
  |--------------------------------------------------------------------------
  | EXPENSES
  |--------------------------------------------------------------------------
  */

  let expenses = null

  const expenseProperties =
    await getPropertyIds({
      user,
      propertyId,
      permission:
        permissionMap.expenses,
    })

  if (expenseProperties.length) {
    const { start, end } =
      getMonthRange()

    const expenseStats =
      await Expense.aggregate([
        {
          $match: {
            organization: user.organization,
            property: {
              $in: expenseProperties,
            },
            status: 'ACTIVE',
            expenseDate: {
              $gte: start,
              $lt: end,
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: '$amount',
            },
            count: {
              $sum: 1,
            },
          },
        },
      ])

    expenses =
      expenseStats[0] || {
        total: 0,
        count: 0,
      }
  }

  /*
  |--------------------------------------------------------------------------
  | COMPLAINTS
  |--------------------------------------------------------------------------
  */

  let complaints = null

  const complaintProperties =
    await getPropertyIds({
      user,
      propertyId,
      permission:
        permissionMap.complaints,
    })

  if (complaintProperties.length) {
    const complaintStats =
      await Complaint.aggregate([
        {
          $match: {
            organization:
              user.organization,
            property: {
              $in: complaintProperties,
            },
          },
        },
        {
          $group: {
            _id: '$status',
            count: {
              $sum: 1,
            },
          },
        },
      ])

    complaints = {
      open:
        complaintStats.find(
          (item) => item._id === 'OPEN'
        )?.count || 0,

      assigned:
        complaintStats.find(
          (item) => item._id === 'ASSIGNED'
        )?.count || 0,

      inProgress:
        complaintStats.find(
          (item) => item._id === 'IN_PROGRESS'
        )?.count || 0,

      resolved:
        complaintStats.find(
          (item) => item._id === 'RESOLVED'
        )?.count || 0,

      closed:
        complaintStats.find(
          (item) => item._id === 'CLOSED'
        )?.count || 0,

      urgent:
        await Complaint.countDocuments({
          organization:
            user.organization,
          property: {
            $in: complaintProperties,
          },
          priority: 'URGENT',
          status: {
            $nin: [
              'RESOLVED',
              'CLOSED',
              'CANCELLED',
            ],
          },
        }),
    }
  }

  /*
  |--------------------------------------------------------------------------
  | BOOKINGS
  |--------------------------------------------------------------------------
  */

  let bookings = null

  const bookingProperties =
    await getPropertyIds({
      user,
      propertyId,
      permission:
        permissionMap.bookings,
    })

  if (bookingProperties.length) {
    const bookingStats =
      await Booking.aggregate([
        {
          $match: {
            organization:
              user.organization,
            property: {
              $in: bookingProperties,
            },
          },
        },
        {
          $group: {
            _id: '$status',
            count: {
              $sum: 1,
            },
          },
        },
      ])

    bookings = {
      pending:
        bookingStats.find(
          (item) => item._id === 'PENDING'
        )?.count || 0,

      confirmed:
        bookingStats.find(
          (item) => item._id === 'CONFIRMED'
        )?.count || 0,

      completed:
        bookingStats.find(
          (item) => item._id === 'COMPLETED'
        )?.count || 0,

      cancelled:
        bookingStats.find(
          (item) => item._id === 'CANCELLED'
        )?.count || 0,
    }
  }

  return {
    properties: {
      total: propertyCount,
      items: allProperties,
    },

    tenants,

    rooms,

    occupancy,

    rent,

    payments,

    expenses,

    complaints,

    bookings,
  }
}