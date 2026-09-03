import bcrypt from 'bcryptjs'

import Property from '../models/Property.js'
import User from '../models/User.js'
import StaffAssignment from '../models/StaffAssignment.js'
import StaffInvitation from '../models/StaffInvitation.js'
import PropertyManagerAssignment from '../models/PropertyManagerAssignment.js'

import {
  generateInvitationToken,
  hashInvitationToken,
} from '../utils/invitationToken.js'

import {
  STAFF_ALLOWED_PERMISSIONS,
} from '../constants/staffPermissions.js'

import {
  PERMISSIONS,
} from '../constants/permissions.js'


const createError = (
  message,
  statusCode
) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}


/*
|--------------------------------------------------------------------------
| Authorization helpers
|--------------------------------------------------------------------------
*/

const getManagerAssignment = async ({
  user,
  propertyId,
}) => {
  return StaffAssignment
    .findOne({
      staff: user._id,
      property: propertyId,
      status: 'ACTIVE',
    })
}


const getPropertyManagerAssignment =
  async ({
    user,
    propertyId,
  }) => {

    return PropertyManagerAssignment.findOne({
      manager: user._id,
      property: propertyId,
      status: 'ACTIVE',
    })
  }


const verifyPropertyAccess = async ({
  user,
  propertyId,
  requireManage = false,
}) => {
  if (!user.organization) {
    throw createError(
      'User is not associated with an organization.',
      400
    )
  }

  const property =
    await Property.findOne({
      _id: propertyId,
      organization: user.organization,
      status: 'ACTIVE',
    })

  if (!property) {
    throw createError(
      'Property not found in your organization.',
      404
    )
  }

  if (
    user.role === 'BUSINESS_OWNER'
  ) {
    return property
  }

  if (
    user.role === 'PROPERTY_MANAGER'
  ) {
    const assignment =
      await PropertyManagerAssignment.findOne({
        manager: user._id,
        property: propertyId,
        status: 'ACTIVE',
      })

    if (!assignment) {
      throw createError(
        'You are not assigned to this property.',
        403
      )
    }

    if (
      requireManage &&
      !assignment.permissions.includes(
        PERMISSIONS.MANAGE_STAFF
      )
    ) {
      throw createError(
        'You do not have permission to manage staff for this property.',
        403
      )
    }

    if (
      !requireManage &&
      !assignment.permissions.includes(
        PERMISSIONS.VIEW_STAFF
      ) &&
      !assignment.permissions.includes(
        PERMISSIONS.MANAGE_STAFF
      )
    ) {
      throw createError(
        'You do not have permission to view staff for this property.',
        403
      )
    }

    return property
  }

  throw createError(
    'You are not authorized to access staff for this property.',
    403
  )
}


/*
|--------------------------------------------------------------------------
| Create Staff Invitation
|--------------------------------------------------------------------------
*/

export const createStaffInvitation =
  async ({
    user,
    staffData,
  }) => {
    if (!user.organization) {
      throw createError(
        'User is not associated with an organization.',
        400
      )
    }

    const {
      propertyId,
      staffName,
      phone,
      email,
      designation,
      permissions,
      joiningDate,
      notes,
    } = staffData

    const property =
      await verifyPropertyAccess({
        user,
        propertyId,
        requireManage: true,
      })

    const invalidPermissions =
      permissions.filter(
        (permission) =>
          !STAFF_ALLOWED_PERMISSIONS.includes(
            permission
          )
      )

    if (
      invalidPermissions.length > 0
    ) {
      throw createError(
        'One or more requested permissions are not allowed for staff.',
        400
      )
    }

    const existingUser =
      await User.findOne({
        phone,
      })

    if (existingUser) {
      throw createError(
        'This phone number is already registered.',
        409
      )
    }

    await StaffInvitation.deleteMany({
      organization: user.organization,
      property: property._id,
      phone,
      status: 'PENDING',
    })

    const {
      token,
      tokenHash,
    } = generateInvitationToken()

    const expiresAt =
      new Date(
        Date.now() +
          24 * 60 * 60 * 1000
      )

    const invitation =
      await StaffInvitation.create({
        organization:
          user.organization,

        property:
          property._id,

        staffName,

        phone,

        email:
          email || null,

        designation,

        permissions,

        joiningDate:
          joiningDate || null,

        notes:
          notes || '',

        invitedBy:
          user._id,

        invitationTokenHash:
          tokenHash,

        status: 'PENDING',

        expiresAt,
      })

    const frontendUrl =
      process.env.FRONTEND_URL ||
      'http://localhost:5173'

    const invitationLink =
      `${frontendUrl}/staff/activate/${token}`

    return {
      invitationId:
        invitation._id,

      staff: {
        name: staffName,
        phone,
        email:
          email || null,
        designation,
      },

      property: {
        id: property._id,
        name: property.name,
      },

      permissions,

      invitationLink,

      expiresAt,
    }
  }


/*
|--------------------------------------------------------------------------
| Get Staff Invitation
|--------------------------------------------------------------------------
*/

export const getStaffInvitation =
  async ({
    token,
  }) => {
    if (!token) {
      throw createError(
        'Invitation token is required.',
        400
      )
    }

    const tokenHash =
      hashInvitationToken(token)

    const invitation =
      await StaffInvitation
        .findOne({
          invitationTokenHash:
            tokenHash,
        })
        .populate(
          'property',
          'name type city state'
        )
        .lean()

    if (!invitation) {
      throw createError(
        'Invalid invitation link.',
        404
      )
    }

    if (
      invitation.status !==
      'PENDING'
    ) {
      throw createError(
        'This invitation is no longer active.',
        400
      )
    }

    if (
      invitation.expiresAt <
      new Date()
    ) {
      await StaffInvitation.updateOne(
        {
          _id:
            invitation._id,
        },
        {
          $set: {
            status:
              'EXPIRED',
          },
        }
      )

      throw createError(
        'This invitation has expired.',
        400
      )
    }

    return {
      invitationId:
        invitation._id,

      staff: {
        name:
          invitation.staffName,

        phone:
          invitation.phone,

        email:
          invitation.email,

        designation:
          invitation.designation,
      },

      property: {
        id:
          invitation.property._id,

        name:
          invitation.property.name,

        type:
          invitation.property.type,

        city:
          invitation.property.city,

        state:
          invitation.property.state,
      },

      role: 'STAFF',

      permissions:
        invitation.permissions,

      joiningDate:
        invitation.joiningDate,

      notes:
        invitation.notes,

      expiresAt:
        invitation.expiresAt,
    }
  }


/*
|--------------------------------------------------------------------------
| Activate Staff
|--------------------------------------------------------------------------
*/

export const activateStaff =
  async ({
    token,
    password,
  }) => {
    if (!token) {
      throw createError(
        'Invitation token is required.',
        400
      )
    }

    const tokenHash =
      hashInvitationToken(token)

    const invitation =
      await StaffInvitation.findOne({
        invitationTokenHash:
          tokenHash,
      })

    if (!invitation) {
      throw createError(
        'Invalid invitation link.',
        404
      )
    }

    if (
      invitation.status !==
      'PENDING'
    ) {
      throw createError(
        'This invitation is no longer active.',
        400
      )
    }

    if (
      invitation.expiresAt <
      new Date()
    ) {
      invitation.status =
        'EXPIRED'

      await invitation.save()

      throw createError(
        'This invitation has expired.',
        400
      )
    }

    const existingUser =
      await User.findOne({
        phone:
          invitation.phone,
      })

    if (existingUser) {
      throw createError(
        'An account with this phone number already exists.',
        409
      )
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      )

    const user =
      await User.create({
        name:
          invitation.staffName,

        phone:
          invitation.phone,

        email:
          invitation.email,

        organization:
          invitation.organization,

        role: 'STAFF',

        status: 'ACTIVE',

        passwordHash,

        isPhoneVerified:
          false,
      })

    let assignment

    try {
      assignment =
        await StaffAssignment.create({
          staff:
            user._id,

          property:
            invitation.property,

          assignedBy:
            invitation.invitedBy,

          designation:
            invitation.designation,

          permissions:
            invitation.permissions,

          joiningDate:
            invitation.joiningDate,

          notes:
            invitation.notes,

          status: 'ACTIVE',
        })
    } catch (error) {
      await User.deleteOne({
        _id: user._id,
      })

      throw error
    }

    invitation.status =
      'ACTIVATED'

    invitation.activatedAt =
      new Date()

    await invitation.save()

    return {
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status,
      },

      assignment: {
        id:
          assignment._id,

        property:
          assignment.property,

        designation:
          assignment.designation,

        permissions:
          assignment.permissions,

        status:
          assignment.status,
      },
    }
  }


/*
|--------------------------------------------------------------------------
| Get Staff
|--------------------------------------------------------------------------
*/

export const getStaff =
  async ({
    user,
    query,
  }) => {
    const {
      propertyId,
      status,
      page,
      limit,
    } = query

    const filter = {}

    if (propertyId) {
      await verifyPropertyAccess({
        user,
        propertyId,
        requireManage: false,
      })

      filter.property =
        propertyId
    } else if (
      user.role ===
      'BUSINESS_OWNER'
    ) {
      const properties =
        await Property.find({
          organization:
            user.organization,
          status: 'ACTIVE',
        }).select('_id')

      filter.property = {
        $in:
          properties.map(
            (property) =>
              property._id
          ),
      }
    } else if (
      user.role ===
      'PROPERTY_MANAGER'
    ) {
      const assignments =
        await PropertyManagerAssignment
          .find({
            manager: user._id,
            status: 'ACTIVE',
            permissions: {
              $in: [
                PERMISSIONS.VIEW_STAFF,
                PERMISSIONS.MANAGE_STAFF,
              ],
            },
          })
          .select('property')

      filter.property = {
        $in:
          assignments.map(
            (assignment) =>
              assignment.property
          ),
      }
    } else {
      throw createError(
        'You are not authorized to view staff.',
        403
      )
    }

    filter.status =
      status === 'ALL'
        ? {
            $in: [
              'ACTIVE',
              'SUSPENDED',
              'REMOVED',
            ],
          }
        : status

    const skip =
      (page - 1) * limit

    const [
      assignments,
      total,
    ] = await Promise.all([
      StaffAssignment.find(filter)
        .populate(
          'staff',
          'name phone email role status'
        )
        .populate(
          'property',
          'name type city state'
        )
        .populate(
          'assignedBy',
          'name email role'
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      StaffAssignment.countDocuments(
        filter
      ),
    ])

    return {
      staff: assignments,

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(
            total / limit
          ),
      },
    }
  }


/*
|--------------------------------------------------------------------------
| Get Staff By ID
|--------------------------------------------------------------------------
*/

export const getStaffById =
  async ({
    user,
    staffId,
  }) => {
    const assignment =
      await StaffAssignment
        .findById(staffId)
        .populate(
          'staff',
          'name phone email role status'
        )
        .populate(
          'property',
          'name type city state'
        )
        .populate(
          'assignedBy',
          'name email role'
        )

    if (!assignment) {
      throw createError(
        'Staff not found.',
        404
      )
    }

    await verifyPropertyAccess({
      user,
      propertyId:
        assignment.property._id,
      requireManage: false,
    })

    return assignment
  }


/*
|--------------------------------------------------------------------------
| Update Staff
|--------------------------------------------------------------------------
*/

export const updateStaff =
  async ({
    user,
    staffId,
    staffData,
  }) => {
    const assignment =
      await StaffAssignment.findById(
        staffId
      )

    if (!assignment) {
      throw createError(
        'Staff not found.',
        404
      )
    }

    await verifyPropertyAccess({
      user,
      propertyId:
        assignment.property,
      requireManage: true,
    })

    if (
      assignment.status ===
      'REMOVED'
    ) {
      throw createError(
        'Removed staff cannot be updated.',
        400
      )
    }

    if (
      staffData.permissions
    ) {
      const invalidPermissions =
        staffData.permissions.filter(
          (permission) =>
            !STAFF_ALLOWED_PERMISSIONS.includes(
              permission
            )
        )

      if (
        invalidPermissions.length > 0
      ) {
        throw createError(
          'One or more requested permissions are not allowed for staff.',
          400
        )
      }
    }

    Object.assign(
      assignment,
      staffData
    )

    await assignment.save()

    return assignment
  }


/*
|--------------------------------------------------------------------------
| Change Staff Status
|--------------------------------------------------------------------------
*/

export const changeStaffStatus =
  async ({
    user,
    staffId,
    status,
  }) => {
    const assignment =
      await StaffAssignment.findById(
        staffId
      )

    if (!assignment) {
      throw createError(
        'Staff not found.',
        404
      )
    }

    await verifyPropertyAccess({
      user,
      propertyId:
        assignment.property,
      requireManage: true,
    })

    if (
      assignment.status ===
        'REMOVED' &&
      status !== 'REMOVED'
    ) {
      throw createError(
        'Removed staff cannot be reactivated.',
        400
      )
    }

    assignment.status = status

    if (
      status === 'REMOVED'
    ) {
      assignment.removedAt =
        new Date()
    } else {
      assignment.removedAt =
        null
    }

    await assignment.save()

    return assignment
  }