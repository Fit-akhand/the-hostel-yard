import mongoose from 'mongoose'

import Complaint from '../models/Complaint.js'
import Tenant from '../models/Tenant.js'
import Allocation from '../models/Allocation.js'
import Room from '../models/Room.js'
import Bed from '../models/Bed.js'
import PropertyManagerAssignment from '../models/PropertyManagerAssignment.js'
import StaffAssignment from '../models/StaffAssignment.js'
import User from '../models/User.js'

import { PERMISSIONS } from '../constants/permissions.js'

const createError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id)
}

const getActiveAllocation = async (tenantId, organizationId) => {
  return Allocation.findOne({
    organization: organizationId,
    tenant: tenantId,
    status: 'ACTIVE',
  })
}

const getManagerAssignment = async ({
  user,
  propertyId,
}) => {
  const assignment = await PropertyManagerAssignment.findOne({
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

  return assignment
}

const getStaffAssignment = async ({
  user,
  propertyId,
}) => {
  const assignment =
    await StaffAssignment.findOne({
      staff: user._id,
      property: propertyId,
      status: 'ACTIVE',
    })

  if (!assignment) {
    throw createError(
      'You are not assigned to this property.',
      403
    )
  }

  return assignment
}

const hasPermission = (assignment, permission) => {
  return assignment.permissions.includes(permission)
}

/*
|--------------------------------------------------------------------------
| Tenant access
|--------------------------------------------------------------------------
*/

const getTenantForUser = async (user) => {
  const tenant = await Tenant.findOne({
    user: user._id,
    organization: user.organization,
  })

  if (!tenant) {
    throw createError(
      'Tenant account is not linked to a tenant.',
      404
    )
  }

  return tenant
}

/*
|--------------------------------------------------------------------------
| Create complaint
|--------------------------------------------------------------------------
*/

export const createComplaint = async ({
  user,
  data,
}) => {
  if (!user.organization) {
    throw createError(
      'User is not associated with an organization.',
      400
    )
  }

  let tenant
  let propertyId
  let roomId
  let bedId

  /*
  |--------------------------------------------------------------------------
  | TENANT
  |--------------------------------------------------------------------------
  */

  if (user.role === 'TENANT') {
    tenant = await getTenantForUser(user)

    const allocation = await getActiveAllocation(
      tenant._id,
      user.organization
    )

    if (!allocation) {
      throw createError(
        'You do not have an active allocation.',
        400
      )
    }

    propertyId = allocation.property
    roomId = allocation.room
    bedId = allocation.bed
    tenant = tenant
  }

  /*
  |--------------------------------------------------------------------------
  | BUSINESS OWNER / PROPERTY MANAGER
  |--------------------------------------------------------------------------
  */

  else if (
    user.role === 'BUSINESS_OWNER' ||
    user.role === 'PROPERTY_MANAGER' ||
    user.role === 'STAFF'
  ) {
    if (!data.propertyId) {
      throw createError(
        'Property is required.',
        400
      )
    }

    if (!data.tenantId) {
      throw createError(
        'Tenant is required.',
        400
      )
    }

    if (!data.roomId) {
      throw createError(
        'Room is required.',
        400
      )
    }

    if (!data.bedId) {
      throw createError(
        'Bed is required.',
        400
      )
    }

    propertyId = data.propertyId
    roomId = data.roomId
    bedId = data.bedId

    tenant = await Tenant.findOne({
      _id: data.tenantId,
      organization: user.organization,
    })

    if (!tenant) {
      throw createError(
        'Tenant not found.',
        404
      )
    }

    if (user.role === 'PROPERTY_MANAGER') {
      const assignment = await getManagerAssignment({
        user,
        propertyId,
      })

      if (
        !hasPermission(
          assignment,
          PERMISSIONS.MANAGE_COMPLAINTS
        )
      ) {
        throw createError(
          'You do not have permission to create complaints.',
          403
        )
      }
    }
    if (user.role === 'STAFF') {
    const assignment =
      await getStaffAssignment({
        user,
        propertyId,
      })

    if (
      !hasPermission(
        assignment,
        PERMISSIONS.MANAGE_COMPLAINTS
      )
    ) {
      throw createError(
        'You do not have permission to create complaints.',
        403
      )
    }
  }
  }

  else {
    throw createError(
      'You are not authorized to create complaints.',
      403
    )
  }

  /*
  |--------------------------------------------------------------------------
  | Validate room
  |--------------------------------------------------------------------------
  */

  const room = await Room.findOne({
    _id: roomId,
    organization: user.organization,
    property: propertyId,
  })

  if (!room) {
    throw createError(
      'Room not found in this property.',
      404
    )
  }

  /*
  |--------------------------------------------------------------------------
  | Validate bed
  |--------------------------------------------------------------------------
  */

  const bed = await Bed.findOne({
    _id: bedId,
    organization: user.organization,
    property: propertyId,
    room: roomId,
  })

  if (!bed) {
    throw createError(
      'Bed not found in this room.',
      404
    )
  }

  /*
  |--------------------------------------------------------------------------
  | Create
  |--------------------------------------------------------------------------
  */

  const complaint = await Complaint.create({
    organization: user.organization,
    property: propertyId,
    tenant: tenant._id,
    room: roomId,
    bed: bedId,

    title: data.title,
    description: data.description,
    category: data.category,
    priority: data.priority || 'MEDIUM',

    status: 'OPEN',

    createdBy: user._id,
  })

  return complaint
}

/*
|--------------------------------------------------------------------------
| Get complaints
|--------------------------------------------------------------------------
*/

export const getComplaints = async ({
  user,
  filters = {},
}) => {
  if (!user.organization) {
    throw createError(
      'User is not associated with an organization.',
      400
    )
  }

  const filter = {
    organization: user.organization,
  }

  /*
  |--------------------------------------------------------------------------
  | Tenant
  |--------------------------------------------------------------------------
  */

  if (user.role === 'TENANT') {
    const tenant = await getTenantForUser(user)

    filter.tenant = tenant._id
  }

  /*
  |--------------------------------------------------------------------------
  | Property Manager
  |--------------------------------------------------------------------------
  */

  else if (user.role === 'PROPERTY_MANAGER') {
    const propertyIds =
        await PropertyManagerAssignment.find({
            manager: user._id,
            status: 'ACTIVE',
            permissions: PERMISSIONS.VIEW_COMPLAINTS,
        }).distinct('property')

    if (!propertyIds.length) {
      return []
    }

    filter.property = {
      $in: propertyIds,
    }
  }
  else if (user.role === 'STAFF') {
  const propertyIds =
    await StaffAssignment.find({
      staff: user._id,
      status: 'ACTIVE',
      permissions:
        PERMISSIONS.VIEW_COMPLAINTS,
    }).distinct('property')

  if (!propertyIds.length) {
    throw createError(
      'You are not authorized to view complaints.',
      403
    )
  }

  filter.property = {
    $in: propertyIds,
  }
}

  /*
  |--------------------------------------------------------------------------
  | Business Owner
  |--------------------------------------------------------------------------
  */

  else if (
  ![
    'BUSINESS_OWNER',
    'PROPERTY_MANAGER',
    'STAFF',
  ].includes(user.role)
) {
    throw createError(
      'You are not authorized to view complaints.',
      403
    )
  }

  /*
  |--------------------------------------------------------------------------
  | Filters
  |--------------------------------------------------------------------------
  */

  if (filters.propertyId) {
    if (filter.property?.$in) {
      const allowed = filter.property.$in.some(
        (propertyId) =>
          propertyId.toString() ===
          filters.propertyId.toString()
      )

      if (!allowed) {
        return []
      }
    }

    filter.property = filters.propertyId
  }

  if (filters.tenantId) {
    filter.tenant = filters.tenantId
  }

  if (filters.roomId) {
    filter.room = filters.roomId
  }

  if (filters.bedId) {
    filter.bed = filters.bedId
  }

  if (filters.status) {
    filter.status = filters.status
  }

  if (filters.priority) {
    filter.priority = filters.priority
  }

  if (filters.category) {
    filter.category = filters.category
  }

  if (filters.assignedTo) {
    filter.assignedTo = filters.assignedTo
  }

  const complaints = await Complaint.find(filter)
    .populate('property', 'name city state')
    .populate('tenant', 'name phone email status')
    .populate('room', 'roomNumber floor roomType')
    .populate('bed', 'bedNumber status')
    .populate('createdBy', 'name email role')
    .populate('assignedTo', 'name email role')
    .populate('resolvedBy', 'name email role')
    .sort({
      createdAt: -1,
    })

  return complaints
}

/*
|--------------------------------------------------------------------------
| Get complaint by ID
|--------------------------------------------------------------------------
*/

export const getComplaintById = async ({
  user,
  complaintId,
}) => {
  if (!isValidObjectId(complaintId)) {
    throw createError(
      'Invalid complaint ID.',
      400
    )
  }

  const complaint = await Complaint.findOne({
    _id: complaintId,
    organization: user.organization,
  })
    .populate('property', 'name city state')
    .populate('tenant', 'name phone email status')
    .populate('room', 'roomNumber floor roomType')
    .populate('bed', 'bedNumber status')
    .populate('createdBy', 'name email role')
    .populate('assignedTo', 'name email role')
    .populate('resolvedBy', 'name email role')

  if (!complaint) {
    throw createError(
      'Complaint not found.',
      404
    )
  }

  /*
  |--------------------------------------------------------------------------
  | Tenant can only see own complaint
  |--------------------------------------------------------------------------
  */

  if (user.role === 'TENANT') {
    const tenant = await getTenantForUser(user)

    if (
      complaint.tenant._id.toString() !==
      tenant._id.toString()
    ) {
      throw createError(
        'You are not authorized to view this complaint.',
        403
      )
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Manager property access
  |--------------------------------------------------------------------------
  */

  if (user.role === 'PROPERTY_MANAGER') {
    const assignment = await getManagerAssignment({
      user,
      propertyId: complaint.property._id,
    })

    if (
      !hasPermission(
        assignment,
        PERMISSIONS.VIEW_COMPLAINTS
      )
    ) {
      throw createError(
        'You do not have permission to view complaints.',
        403
      )
    }
  }

  if (
    ![
      'TENANT',
      'PROPERTY_MANAGER',
      'STAFF',
      'BUSINESS_OWNER',
    ].includes(user.role)
  ) {
    throw createError(
      'You are not authorized to view complaints.',
      403
    )
  }
  if (user.role === 'STAFF') {
  const assignment =
    await getStaffAssignment({
      user,
      propertyId:
        complaint.property._id,
    })

  if (
    !hasPermission(
      assignment,
      PERMISSIONS.VIEW_COMPLAINTS
    )
  ) {
    throw createError(
      'You do not have permission to view complaints.',
      403
    )
  }
}

  return complaint
}


/*
|--------------------------------------------------------------------------
| Update complaint
|--------------------------------------------------------------------------
*/

export const updateComplaint = async ({
  user,
  complaintId,
  data,
}) => {
  const complaint = await Complaint.findOne({
    _id: complaintId,
    organization: user.organization,
  })

  if (!complaint) {
    throw createError(
      'Complaint not found.',
      404
    )
  }

  /*
  |--------------------------------------------------------------------------
  | Tenant
  |--------------------------------------------------------------------------
  */

  if (user.role === 'TENANT') {
    const tenant = await getTenantForUser(user)

    if (
      complaint.tenant.toString() !==
      tenant._id.toString()
    ) {
      throw createError(
        'You are not authorized to update this complaint.',
        403
      )
    }

    /*
     * Tenant can edit complaint only while OPEN.
     */

    if (complaint.status !== 'OPEN') {
      throw createError(
        'Only open complaints can be edited.',
        400
      )
    }

    const allowedFields = [
      'title',
      'description',
      'category',
      'priority',
    ]

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        complaint[field] = data[field]
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Manager / Owner
  |--------------------------------------------------------------------------
  */

  else if (
      user.role === 'PROPERTY_MANAGER' ||
      user.role === 'BUSINESS_OWNER' ||
      user.role === 'STAFF'
    ){
    if (user.role === 'PROPERTY_MANAGER') {
      const assignment = await getManagerAssignment({
        user,
        propertyId: complaint.property,
      })

      if (
        !hasPermission(
          assignment,
          PERMISSIONS.MANAGE_COMPLAINTS
        )
      ) {
        throw createError(
          'You do not have permission to manage complaints.',
          403
        )
      }
    }

    if (user.role === 'STAFF') {
    const assignment =
      await getStaffAssignment({
        user,
        propertyId:
          complaint.property,
      })

    if (
      !hasPermission(
        assignment,
        PERMISSIONS.MANAGE_COMPLAINTS
      )
    ) {
      throw createError(
        'You do not have permission to manage complaints.',
        403
      )
    }
  }

    const allowedFields = [
      'title',
      'description',
      'category',
      'priority',
      'status',
      'assignedTo',
      'resolutionNotes',
    ]

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        complaint[field] = data[field]
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Status audit
    |--------------------------------------------------------------------------
    */

    if (data.status === 'RESOLVED') {
      complaint.resolvedBy = user._id
      complaint.resolvedAt = new Date()
    }

    if (
      data.status &&
      data.status !== 'RESOLVED'
    ) {
      complaint.resolvedBy = null
      complaint.resolvedAt = null
    }

    if (
      data.assignedTo &&
      complaint.status === 'OPEN'
    ) {
      complaint.status = 'ASSIGNED'
    }
  }

  else {
    throw createError(
      'You are not authorized to update complaints.',
      403
    )
  }

  await complaint.save()

  return complaint
}

/*
|--------------------------------------------------------------------------
| Delete complaint
|--------------------------------------------------------------------------
*/

export const deleteComplaint = async ({
  user,
  complaintId,
}) => {
  const complaint = await Complaint.findOne({
    _id: complaintId,
    organization: user.organization,
  })

  if (!complaint) {
    throw createError(
      'Complaint not found.',
      404
    )
  }

  /*
  |--------------------------------------------------------------------------
  | Tenant
  |--------------------------------------------------------------------------
  */

  if (user.role === 'TENANT') {
    const tenant = await getTenantForUser(user)

    if (
      complaint.tenant.toString() !==
      tenant._id.toString()
    ) {
      throw createError(
        'You are not authorized to delete this complaint.',
        403
      )
    }

    if (complaint.status !== 'OPEN') {
      throw createError(
        'Only open complaints can be deleted.',
        400
      )
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Manager / Owner
  |--------------------------------------------------------------------------
  */

  else if (
    user.role === 'PROPERTY_MANAGER'
  ) {
    const assignment = await getManagerAssignment({
      user,
      propertyId: complaint.property,
    })

    if (
      !hasPermission(
        assignment,
        PERMISSIONS.MANAGE_COMPLAINTS
      )
    ) {
      throw createError(
        'You do not have permission to delete complaints.',
        403
      )
    }
  }

  else if (
    user.role !== 'BUSINESS_OWNER'
  ) {
    throw createError(
      'You are not authorized to delete complaints.',
      403
    )
  }

  await complaint.deleteOne()

  return {
    message: 'Complaint deleted successfully.',
  }
}

/*
|--------------------------------------------------------------------------
| Assign complaint
|--------------------------------------------------------------------------
*/

export const assignComplaint = async ({
  user,
  complaintId,
  assignedTo,
}) => {
  const complaint = await Complaint.findOne({
    _id: complaintId,
    organization: user.organization,
  })

  if (!complaint) {
    throw createError(
      'Complaint not found.',
      404
    )
  }

    if (
      ![
        'BUSINESS_OWNER',
        'PROPERTY_MANAGER',
        'STAFF',
      ].includes(user.role)
    ){
    throw createError(
      'You are not authorized to assign complaints.',
      403
    )
  }

  if (user.role === 'PROPERTY_MANAGER') {
    const assignment = await getManagerAssignment({
      user,
      propertyId: complaint.property,
    })

    if (
      !hasPermission(
        assignment,
        PERMISSIONS.MANAGE_COMPLAINTS
      )
    ) {
      throw createError(
        'You do not have permission to manage complaints.',
        403
      )
    }
  }

  if (user.role === 'STAFF') {
    const assignment =
      await getStaffAssignment({
        user,
        propertyId:
          complaint.property,
      })

    if (
      !hasPermission(
        assignment,
        PERMISSIONS.MANAGE_COMPLAINTS
      )
    ) {
      throw createError(
        'You do not have permission to manage complaints.',
        403
      )
    }
    }

const assignee = await User.findById(assignedTo)

if (!assignee) {
  throw createError(
    'Assigned user does not exist.',
    404
  )
}

if (
  assignee.organization?.toString() !==
  user.organization?.toString()
) {
  throw createError(
    'Assigned user belongs to a different organization.',
    403
  )
}



if (assignee.status !== 'ACTIVE') {
  throw createError(
    'Assigned user is not active.',
    403
  )
}

if (
  !['PROPERTY_MANAGER', 'STAFF'].includes(
    assignee.role
  )
) {
  throw createError(
    'This user is not eligible to handle complaints.',
    403
  )
}

// CHECK ASSIGNEE PROPERTY
if (assignee.role === 'PROPERTY_MANAGER') {
  const assignment =
    await PropertyManagerAssignment.findOne({
      manager: assignee._id,
      property: complaint.property,
      status: 'ACTIVE',
    })

  if (!assignment) {
    throw createError(
      'Assigned manager is not assigned to this property.',
      403
    )
  }
}

if (assignee.role === 'STAFF') {
  const assignment =
    await StaffAssignment.findOne({
      staff: assignee._id,
      property: complaint.property,
      status: 'ACTIVE',
    })

  if (!assignment) {
    throw createError(
      'Assigned staff is not assigned to this property.',
      403
    )
  }
}

complaint.assignedTo = assignee._id
complaint.status = 'ASSIGNED'   


  await complaint.save()

  return complaint
}

/*
|--------------------------------------------------------------------------
| Change status
|--------------------------------------------------------------------------
*/

export const changeComplaintStatus = async ({
  user,
  complaintId,
  status,
  resolutionNotes,
}) => {
  const complaint = await Complaint.findOne({
    _id: complaintId,
    organization: user.organization,
  })

  if (!complaint) {
    throw createError(
      'Complaint not found.',
      404
    )
  }

  if (
    ![
      'BUSINESS_OWNER',
      'PROPERTY_MANAGER',
      'STAFF',
    ].includes(user.role)
  ){
    throw createError(
      'You are not authorized to change complaint status.',
      403
    )
  }

  if (user.role === 'PROPERTY_MANAGER') {
    const assignment = await getManagerAssignment({
      user,
      propertyId: complaint.property,
    })

    if (
      !hasPermission(
        assignment,
        PERMISSIONS.MANAGE_COMPLAINTS
      )
    ) {
      throw createError(
        'You do not have permission to manage complaints.',
        403
      )
    }
  }

  if (user.role === 'STAFF') {
    const assignment =
      await getStaffAssignment({
        user,
        propertyId:
          complaint.property,
      })

    if (
      !hasPermission(
        assignment,
        PERMISSIONS.MANAGE_COMPLAINTS
      )
    ) {
      throw createError(
        'You do not have permission to manage complaints.',
        403
      )
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Valid state transitions
  |--------------------------------------------------------------------------
  */

  const transitions = {
    OPEN: ['ASSIGNED', 'CANCELLED'],
    ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['RESOLVED', 'CANCELLED'],
    RESOLVED: ['CLOSED', 'IN_PROGRESS'],
    CLOSED: [],
    CANCELLED: [],
  }

  if (
    !transitions[complaint.status]?.includes(status)
  ) {
    throw createError(
      `Cannot change complaint status from ${complaint.status} to ${status}.`,
      400
    )
  }

 const previousStatus = complaint.status

complaint.status = status

if (status === 'RESOLVED') {
  complaint.resolvedBy = user._id
  complaint.resolvedAt = new Date()

  if (resolutionNotes !== undefined) {
    complaint.resolutionNotes = resolutionNotes
  }
}

if (
  status === 'IN_PROGRESS' &&
  previousStatus === 'RESOLVED'
) {
  complaint.resolvedBy = null
  complaint.resolvedAt = null
}

  await complaint.save()

  return complaint
}