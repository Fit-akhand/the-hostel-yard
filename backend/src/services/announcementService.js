import mongoose from 'mongoose'

import Announcement from '../models/Announcement.js'
import Property from '../models/Property.js'
import Tenant from '../models/Tenant.js'
import Allocation from '../models/Allocation.js'
import PropertyManagerAssignment from '../models/PropertyManagerAssignment.js'

import { PERMISSIONS } from '../constants/permissions.js'
import { announcementListQuerySchema } from '../validators/announcementValidator.js'

// --------------------------------------------------
// ERROR HELPER
// --------------------------------------------------

const createError = (
  message,
  statusCode = 400
) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

// --------------------------------------------------
// OBJECT ID
// --------------------------------------------------

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id)
}

// --------------------------------------------------
// PERMISSION
// --------------------------------------------------

const hasPermission = (
  user,
  permission
) => {
  return (
    user.permissions?.includes(permission) ||
    false
  )
}

// --------------------------------------------------
// PROPERTY MANAGER ASSIGNMENT
// --------------------------------------------------

const getManagerAssignment = async ({
  user,
  propertyId,
}) => {
  return PropertyManagerAssignment.findOne({
    manager: user._id,
    property: propertyId,
    status: 'ACTIVE',
  })
}

// --------------------------------------------------
// PROPERTY ACCESS
// --------------------------------------------------

const verifyPropertyAccess = async ({
  user,
  propertyId,
  requireManage = false,
}) => {
  if (!isValidObjectId(propertyId)) {
    throw createError(
      'Invalid property ID.',
      400
    )
  }

  const property = await Property.findOne({
    _id: propertyId,
    organization: user.organization,
  })

  if (!property) {
    throw createError(
      'Property not found.',
      404
    )
  }

  // BUSINESS OWNER
  if (user.role === 'BUSINESS_OWNER') {
    return property
  }

  // PROPERTY MANAGER
  if (user.role === 'PROPERTY_MANAGER') {
    const assignment = await getManagerAssignment({
      user,
      propertyId,
    })

    if (!assignment) {
      throw createError(
        'You are not assigned to this property.',
        403
      )
    }

    if (
      requireManage &&
      !assignment.permissions?.includes(
        PERMISSIONS.SEND_ANNOUNCEMENT
      )
    ) {
      throw createError(
        'You are not authorized to manage announcements.',
        403
      )
    }

    return property
  }

  throw createError(
    'You are not authorized to access this property.',
    403
  )
}

// --------------------------------------------------
// TENANT VALIDATION
// --------------------------------------------------

const validateTargetTenant = async ({
  user,
  propertyId,
  tenantId,
}) => {
  if (!tenantId) {
    return null
  }

  if (!isValidObjectId(tenantId)) {
    throw createError(
      'Invalid tenant ID.',
      400
    )
  }

  const tenant = await Tenant.findOne({
    _id: tenantId,
    organization: user.organization,
  })

  if (!tenant) {
    throw createError(
      'Target tenant not found.',
      404
    )
  }

  const allocation =
    await Allocation.findOne({
      organization: user.organization,
      property: propertyId,
      tenant: tenantId,
      status: 'ACTIVE',
    })

  if (!allocation) {
    throw createError(
      'Target tenant is not actively allocated to this property.',
      400
    )
  }

  return tenant
}

// --------------------------------------------------
// CREATE
// --------------------------------------------------

export const createAnnouncement =
  async ({
    user,
    data,
  }) => {
    if (
      !['BUSINESS_OWNER', 'PROPERTY_MANAGER'].includes(
        user.role
      )
    ) {
      throw createError(
        'You are not authorized to create announcements.',
        403
      )
    }

    const property =
      await verifyPropertyAccess({
        user,
        propertyId: data.propertyId,
        requireManage: true,
      })

    if (
      data.audience === 'SPECIFIC_TENANT'
    ) {
      await validateTargetTenant({
        user,
        propertyId: property._id,
        tenantId: data.targetTenantId,
      })
    }

    const announcement =
      await Announcement.create({
        organization: user.organization,
        property: property._id,
        title: data.title,
        message: data.message,
        type: data.type,
        priority: data.priority,
        audience: data.audience,
        targetTenant:
          data.targetTenantId || null,
        status: 'DRAFT',
        publishedAt: null,
        expiresAt:
          data.expiresAt || null,
        createdBy: user._id,
        updatedBy: null,
      })

    return announcement
  }

// --------------------------------------------------
// EXPIRY
// --------------------------------------------------

const markExpiredIfNeeded =
  async (announcement) => {
    if (
      announcement.status === 'PUBLISHED' &&
      announcement.expiresAt &&
      new Date(announcement.expiresAt) <=
        new Date()
    ) {
      announcement.status = 'EXPIRED'

      await announcement.save()
    }

    return announcement
  }

// --------------------------------------------------
// BASE FILTER
// --------------------------------------------------

const buildListFilter = ({
  user,
  query,
}) => {
  const filter = {
    organization: user.organization,
  }

  if (query.propertyId) {
    filter.property = query.propertyId
  }

  if (query.type) {
    filter.type = query.type
  }

  if (query.priority) {
    filter.priority = query.priority
  }

  if (query.audience) {
    filter.audience = query.audience
  }

  if (query.status) {
    filter.status = query.status
  }

  if (query.createdBy) {
    filter.createdBy = query.createdBy
  }

  if (query.search) {
    filter.$or = [
      {
        title: {
          $regex: query.search,
          $options: 'i',
        },
      },
      {
        message: {
          $regex: query.search,
          $options: 'i',
        },
      },
    ]
  }

  return filter
}

// --------------------------------------------------
// LIST
// --------------------------------------------------

export const getAnnouncements =
  async ({
    user,
    query,
  }) => {
    let filter =
      buildListFilter({
        user,
        query,
      })

    // ----------------------------------------------
    // TENANT
    // ----------------------------------------------

    if (user.role === 'TENANT') {
      const tenant =
        await Tenant.findOne({
          user: user._id,
          organization:
            user.organization,
        })

      if (!tenant) {
        throw createError(
          'Tenant profile not found.',
          404
        )
      }

      const allocation =
        await Allocation.findOne({
          organization:
            user.organization,
          tenant: tenant._id,
          status: 'ACTIVE',
        })

      if (!allocation) {
        return []
      }

      const propertyId =
        allocation.property

      filter = {
        organization:
          user.organization,

        property: propertyId,

        status: 'PUBLISHED',

        $or: [
          {
            audience: 'ALL_TENANTS',
          },
          {
            audience:
              'PROPERTY_TENANTS',
          },
          {
            audience:
              'SPECIFIC_TENANT',
            targetTenant:
              tenant._id,
          },
        ],
      }

      if (query.type) {
        filter.type = query.type
      }

      if (query.priority) {
        filter.priority =
          query.priority
      }

      if (query.search) {
        filter.$and = [
          {
            $or: [
              {
                title: {
                  $regex:
                    query.search,
                  $options: 'i',
                },
              },
              {
                message: {
                  $regex:
                    query.search,
                  $options: 'i',
                },
              },
            ],
          },
        ]
      }
    }

    // ----------------------------------------------
    // PROPERTY MANAGER
    // ----------------------------------------------

    if (
      user.role === 'PROPERTY_MANAGER'
    ) {
      const assignments =
        await PropertyManagerAssignment.find(
          {
            manager: user._id,
            status: 'ACTIVE',
          }
        ).select('property')

      const propertyIds =
        assignments.map(
          (assignment) =>
            assignment.property
        )

      if (!propertyIds.length) {
        return []
      }

      filter.property = {
        $in: propertyIds,
      }
    }

    // ----------------------------------------------
    // ALLOWED ROLES
    // ----------------------------------------------

    if (
      ![
        'BUSINESS_OWNER',
        'PROPERTY_MANAGER',
        'TENANT',
      ].includes(user.role)
    ) {
      throw createError(
        'You are not authorized to view announcements.',
        403
      )
    }

    const announcements =
      await Announcement.find(filter)
        .populate(
          'property',
          'name city state'
        )
        .populate(
          'createdBy',
          'name email role'
        )
        .populate(
          'updatedBy',
          'name email role'
        )
        .populate(
          'targetTenant',
          'name phone email status'
        )
        .sort({
          createdAt: -1,
        })

    for (
      const announcement of announcements
    ) {
      await markExpiredIfNeeded(
        announcement
      )
    }

    return announcements
  }

// --------------------------------------------------
// GET ONE
// --------------------------------------------------

export const getAnnouncementById =
  async ({
    user,
    announcementId,
  }) => {
    if (
      !isValidObjectId(
        announcementId
      )
    ) {
      throw createError(
        'Invalid announcement ID.',
        400
      )
    }

    const announcement =
      await Announcement.findOne({
        _id: announcementId,
        organization:
          user.organization,
      })
        .populate(
          'property',
          'name city state'
        )
        .populate(
          'createdBy',
          'name email role'
        )
        .populate(
          'updatedBy',
          'name email role'
        )
        .populate(
          'targetTenant',
          'name phone email status'
        )

    if (!announcement) {
      throw createError(
        'Announcement not found.',
        404
      )
    }

    await markExpiredIfNeeded(
      announcement
    )

    // Tenant access
    if (user.role === 'TENANT') {
      const tenant =
        await Tenant.findOne({
          user: user._id,
          organization:
            user.organization,
        })

      if (!tenant) {
        throw createError(
          'Tenant profile not found.',
          404
        )
      }

      const allocation =
        await Allocation.findOne({
          organization:
            user.organization,
          tenant: tenant._id,
          property:
            announcement.property._id,
          status: 'ACTIVE',
        })

      if (!allocation) {
        throw createError(
          'You are not authorized to view this announcement.',
          403
        )
      }

      if (
        announcement.status !==
        'PUBLISHED'
      ) {
        throw createError(
          'Announcement not available.',
          404
        )
      }

      const visible =
        announcement.audience ===
          'ALL_TENANTS' ||
        announcement.audience ===
          'PROPERTY_TENANTS' ||
        (
          announcement.audience ===
            'SPECIFIC_TENANT' &&
          announcement.targetTenant?._id
            ?.toString() ===
            tenant._id.toString()
        )

      if (!visible) {
        throw createError(
          'You are not authorized to view this announcement.',
          403
        )
      }

      return announcement
    }

// Manager access
if (user.role === 'PROPERTY_MANAGER') {
  const assignment = await getManagerAssignment({
    user,
    propertyId: announcement.property._id,
  })

  if (!assignment) {
    throw createError(
      'You are not assigned to this property.',
      403
    )
  }

  if (
    !assignment.permissions?.includes(
      PERMISSIONS.SEND_ANNOUNCEMENT
    )
  ) {
    throw createError(
      'You are not authorized to view announcements.',
      403
    )
  }

  return announcement
}

    if (
      user.role ===
      'BUSINESS_OWNER'
    ) {
      return announcement
    }

    throw createError(
      'You are not authorized to view this announcement.',
      403
    )
  }

// --------------------------------------------------
// UPDATE
// --------------------------------------------------

export const updateAnnouncement =
  async ({
    user,
    announcementId,
    data,
  }) => {
    if (
      ![
        'BUSINESS_OWNER',
        'PROPERTY_MANAGER',
      ].includes(user.role)
    ) {
      throw createError(
        'You are not authorized to update announcements.',
        403
      )
    }

    const announcement =
      await Announcement.findOne({
        _id: announcementId,
        organization:
          user.organization,
      })

    if (!announcement) {
      throw createError(
        'Announcement not found.',
        404
      )
    }

    if (
      ['EXPIRED', 'CANCELLED'].includes(
        announcement.status
      )
    ) {
      throw createError(
        'Expired or cancelled announcements cannot be edited.',
        400
      )
    }

    await verifyPropertyAccess({
      user,
      propertyId:
        announcement.property,
      requireManage: true,
    })

    if (
      data.audience ===
        'SPECIFIC_TENANT'
    ) {
      await validateTargetTenant({
        user,
        propertyId:
          announcement.property,
        tenantId:
          data.targetTenantId ||
          announcement.targetTenant,
      })
    }

    if (
      data.audience &&
      data.audience !==
        'SPECIFIC_TENANT'
    ) {
      data.targetTenantId = null
    }

    if (
      data.title !== undefined
    ) {
      announcement.title =
        data.title
    }

    if (
      data.message !== undefined
    ) {
      announcement.message =
        data.message
    }

    if (
      data.type !== undefined
    ) {
      announcement.type =
        data.type
    }

    if (
      data.priority !== undefined
    ) {
      announcement.priority =
        data.priority
    }

    if (
      data.audience !== undefined
    ) {
      announcement.audience =
        data.audience
    }

    if (
      data.targetTenantId !==
      undefined
    ) {
      announcement.targetTenant =
        data.targetTenantId
    }

    if (
      data.expiresAt !== undefined
    ) {
      announcement.expiresAt =
        data.expiresAt
    }

    announcement.updatedBy =
      user._id

    await announcement.save()

    return announcement
  }

// --------------------------------------------------
// DELETE
// --------------------------------------------------

export const deleteAnnouncement =
  async ({
    user,
    announcementId,
  }) => {
    if (
      ![
        'BUSINESS_OWNER',
        'PROPERTY_MANAGER',
      ].includes(user.role)
    ) {
      throw createError(
        'You are not authorized to delete announcements.',
        403
      )
    }

    const announcement =
      await Announcement.findOne({
        _id: announcementId,
        organization:
          user.organization,
      })

    if (!announcement) {
      throw createError(
        'Announcement not found.',
        404
      )
    }

    await verifyPropertyAccess({
      user,
      propertyId:
        announcement.property,
      requireManage: true,
    })

    if (
      ![
        'DRAFT',
        'CANCELLED',
      ].includes(
        announcement.status
      )
    ) {
      throw createError(
        'Only draft or cancelled announcements can be deleted.',
        400
      )
    }

    await Announcement.deleteOne({
      _id: announcement._id,
    })

    return true
  }

// --------------------------------------------------
// PUBLISH
// --------------------------------------------------

export const publishAnnouncement =
  async ({
    user,
    announcementId,
    expiresAt,
  }) => {
    if (
      ![
        'BUSINESS_OWNER',
        'PROPERTY_MANAGER',
      ].includes(user.role)
    ) {
      throw createError(
        'You are not authorized to publish announcements.',
        403
      )
    }

    const announcement =
      await Announcement.findOne({
        _id: announcementId,
        organization:
          user.organization,
      })

    if (!announcement) {
      throw createError(
        'Announcement not found.',
        404
      )
    }

    await verifyPropertyAccess({
      user,
      propertyId:
        announcement.property,
      requireManage: true,
    })

    if (
      announcement.status !==
      'DRAFT'
    ) {
      throw createError(
        `Cannot publish an announcement from ${announcement.status} status.`,
        400
      )
    }

    const finalExpiry =
      expiresAt !== undefined
        ? expiresAt
        : announcement.expiresAt

    if (finalExpiry) {
      if (
        new Date(finalExpiry) <=
        new Date()
      ) {
        throw createError(
          'Expiration date must be in the future.',
          400
        )
      }

      announcement.expiresAt =
        finalExpiry
    }

    announcement.status =
      'PUBLISHED'

    announcement.publishedAt =
      new Date()

    announcement.updatedBy =
      user._id

    await announcement.save()

    return announcement
  }

// --------------------------------------------------
// CANCEL
// --------------------------------------------------

export const cancelAnnouncement =
  async ({
    user,
    announcementId,
  }) => {
    if (
      ![
        'BUSINESS_OWNER',
        'PROPERTY_MANAGER',
      ].includes(user.role)
    ) {
      throw createError(
        'You are not authorized to cancel announcements.',
        403
      )
    }

    const announcement =
      await Announcement.findOne({
        _id: announcementId,
        organization:
          user.organization,
      })

    if (!announcement) {
      throw createError(
        'Announcement not found.',
        404
      )
    }

    await verifyPropertyAccess({
      user,
      propertyId:
        announcement.property,
      requireManage: true,
    })

    if (
      ![
        'DRAFT',
        'PUBLISHED',
      ].includes(
        announcement.status
      )
    ) {
      throw createError(
        `Cannot cancel an announcement from ${announcement.status} status.`,
        400
      )
    }

    announcement.status =
      'CANCELLED'

    announcement.updatedBy =
      user._id

    await announcement.save()

    return announcement
  }