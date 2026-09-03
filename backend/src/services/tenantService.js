import Tenant from "../models/Tenant.js";
import Property from "../models/Property.js";
import PropertyManagerAssignment from "../models/PropertyManagerAssignment.js";
import StaffAssignment from "../models/StaffAssignment.js";
import { PERMISSIONS } from "../constants/permissions.js";

const UPDATABLE_TENANT_FIELDS = [
  "name",
  "phone",
  "email",
  "gender",
  "emergencyContact",
  "address",
  "moveInDate",
];

const TENANT_UPDATE_PERMISSIONS = [
  PERMISSIONS.EDIT_TENANTS,
  PERMISSIONS.UPDATE_TENANTS,
];

const checkPropertyAccess = async ({ user, propertyId, permission = null }) => {
  if (!user.organization) {
    const error = new Error("User is not associated with an organization.");

    error.statusCode = 400;
    throw error;
  }

  const property = await Property.findOne({
    _id: propertyId,
    organization: user.organization,
    status: "ACTIVE",
  });

  if (!property) {
    const error = new Error("Property not found.");

    error.statusCode = 404;
    throw error;
  }

  // Business Owner has access to all properties
  // in their organization.
  if (user.role === "BUSINESS_OWNER") {
    return property;
  }

  // Property Manager must have an active
  // assignment to this property.
  if (user.role === "PROPERTY_MANAGER") {
    const assignment = await PropertyManagerAssignment.findOne({
      manager: user._id,
      property: propertyId,
      status: "ACTIVE",
    });

    if (!assignment) {
      const error = new Error("You are not assigned to this property.");

      error.statusCode = 403;
      throw error;
    }

    if (permission) {
      const requiredPermissions = Array.isArray(permission)
        ? permission
        : [permission];

      const hasPermission = requiredPermissions.some((required) =>
        assignment.permissions.includes(required),
      );

      if (!hasPermission) {
        const error = new Error(
          "You do not have permission to perform this action.",
        );

        error.statusCode = 403;
        throw error;
      }
    }

    return property;
  }

  // Staff must have an active assignment
  // to this property.
  if (user.role === "STAFF") {
    const assignment = await StaffAssignment.findOne({
      staff: user._id,
      property: propertyId,
      status: "ACTIVE",
    });

    if (!assignment) {
      const error = new Error("You are not assigned to this property.");

      error.statusCode = 403;
      throw error;
    }

    if (permission) {
      const requiredPermissions = Array.isArray(permission)
        ? permission
        : [permission];

      const hasPermission = requiredPermissions.some((required) =>
        assignment.permissions.includes(required),
      );

      if (!hasPermission) {
        const error = new Error(
          "You do not have permission to perform this action.",
        );

        error.statusCode = 403;
        throw error;
      }
    }

    return property;
  }

  const error = new Error("You are not authorized to access this property.");

  error.statusCode = 403;
  throw error;
};

export const createTenant = async ({ user, tenantData }) => {
  const { propertyId, ...data } = tenantData;

  await checkPropertyAccess({
    user,
    propertyId,
    permission: "ADD_TENANTS",
  });

  const tenant = await Tenant.create({
    ...data,
    property: propertyId,
    organization: user.organization,
  });

  return tenant;
};

export const getTenants = async ({ user, propertyId, status = "ACTIVE" }) => {
  if (!user.organization) {
    const error = new Error("User is not associated with an organization.");

    error.statusCode = 400;
    throw error;
  }

  let filter = {
    organization: user.organization,
  };

  if (status !== "ALL") {
    filter.status = status;
  }

  // Business Owner
  if (user.role === "BUSINESS_OWNER") {
    if (propertyId) {
      await checkPropertyAccess({
        user,
        propertyId,
      });

      filter.property = propertyId;
    }
  }

  // Property Manager
  else if (user.role === "PROPERTY_MANAGER") {
    const assignments = await PropertyManagerAssignment.find({
      manager: user._id,
      status: "ACTIVE",
    }).select("property");

    const propertyIds = assignments.map((assignment) => assignment.property);

    if (!propertyIds.length) {
      const error = new Error("You are not authorized to view tenants.");

      error.statusCode = 403;
      throw error;
    }

    if (propertyId) {
      await checkPropertyAccess({
        user,
        propertyId,
        permission: PERMISSIONS.VIEW_TENANTS,
      });

      filter.property = propertyId;
    } else {
      filter.property = {
        $in: propertyIds,
      };
    }
  }

  // Staff
  else if (user.role === "STAFF") {
    const assignments = await StaffAssignment.find({
      staff: user._id,
      status: "ACTIVE",
    }).select("property permissions");

    const viewableProperties = assignments
      .filter(
        (assignment) =>
          assignment.permissions.includes(PERMISSIONS.VIEW_TENANTS) ||
          assignment.permissions.includes(PERMISSIONS.ADD_TENANTS) ||
          assignment.permissions.includes(PERMISSIONS.EDIT_TENANTS) ||
          assignment.permissions.includes(PERMISSIONS.UPDATE_TENANTS),
      )
      .map((assignment) => assignment.property);

    if (!viewableProperties.length) {
      const error = new Error("You are not authorized to view tenants.");

      error.statusCode = 403;
      throw error;
    }

    if (propertyId) {
      await checkPropertyAccess({
        user,
        propertyId,
        permission: PERMISSIONS.VIEW_TENANTS,
      });

      filter.property = propertyId;
    } else {
      filter.property = {
        $in: viewableProperties,
      };
    }
  } else {
    const error = new Error("You are not authorized to view tenants.");

    error.statusCode = 403;
    throw error;
  }

  const tenants = await Tenant.find(filter)
    .populate("property", "name type city state")
    .sort({
      createdAt: -1,
    });

  return tenants;
};

export const getTenantById = async ({ user, tenantId }) => {
  if (!user.organization) {
    const error = new Error("User is not associated with an organization.");

    error.statusCode = 400;
    throw error;
  }

  const tenant = await Tenant.findOne({
    _id: tenantId,
    organization: user.organization,
  }).populate("property", "name type city state");

  if (!tenant) {
    const error = new Error("Tenant not found.");

    error.statusCode = 404;
    throw error;
  }

  // Business Owner can access any tenant
  // belonging to their organization.
  if (user.role === "BUSINESS_OWNER") {
    return tenant;
  }

  // Property Manager can only access
  // tenants belonging to assigned properties.
  if (user.role === 'PROPERTY_MANAGER') {
  const assignment =
    await PropertyManagerAssignment.findOne({
      manager: user._id,
      property: tenant.property._id,
      status: 'ACTIVE',
    })

  if (!assignment) {
    throw createError(
      'You are not authorized to view this tenant.',
      403
    )
  }

  return tenant
}

if (user.role === 'STAFF') {
  await checkPropertyAccess({
    user,
    propertyId: tenant.property._id,
    permission: PERMISSIONS.VIEW_TENANTS,
  })

  return tenant
}

throw createError(
  'You are not authorized to view this tenant.',
  403
)

  const error = new Error("You are not authorized to view this tenant.");

  error.statusCode = 403;
  throw error;
};

export const updateTenant = async ({ user, tenantId, tenantData }) => {
  if (!user.organization) {
    const error = new Error("User is not associated with an organization.");

    error.statusCode = 400;
    throw error;
  }

  const tenant = await Tenant.findOne({
    _id: tenantId,
    organization: user.organization,
  }).populate("property", "name type city state");

  if (!tenant) {
    const error = new Error("Tenant not found.");

    error.statusCode = 404;
    throw error;
  }

  const propertyId = tenant.property?._id || tenant.property;

  await checkPropertyAccess({
    user,
    propertyId,
    permission: TENANT_UPDATE_PERMISSIONS,
  });

  for (const field of UPDATABLE_TENANT_FIELDS) {
    if (tenantData[field] === undefined) {
      continue;
    }

    if (field === "emergencyContact") {
      const existingContact =
        tenant.emergencyContact &&
        typeof tenant.emergencyContact.toObject === "function"
          ? tenant.emergencyContact.toObject()
          : tenant.emergencyContact || {};

      tenant.emergencyContact = {
        ...existingContact,
        ...tenantData.emergencyContact,
      };

      continue;
    }

    tenant[field] = tenantData[field];
  }

  await tenant.save();

  return tenant;
};

export const startTenantNotice = async ({
  user,
  tenantId,
  expectedMoveOutDate,
}) => {
  if (!user.organization) {
    const error = new Error("User is not associated with an organization.");

    error.statusCode = 400;
    throw error;
  }

  const tenant = await Tenant.findOne({
    _id: tenantId,
    organization: user.organization,
  });

  if (!tenant) {
    const error = new Error("Tenant not found.");

    error.statusCode = 404;
    throw error;
  }

  await checkPropertyAccess({
    user,
    propertyId: tenant.property,
    permission: TENANT_UPDATE_PERMISSIONS,
  });

  if (tenant.status === "LEFT") {
    const error = new Error(
      "A tenant who has moved out cannot be placed on notice.",
    );

    error.statusCode = 400;
    throw error;
  }

  if (tenant.status === "NOTICE_PERIOD") {
    const error = new Error("Tenant is already in notice period.");

    error.statusCode = 400;
    throw error;
  }

  const moveOutDate = new Date(expectedMoveOutDate);

  if (Number.isNaN(moveOutDate.getTime())) {
    const error = new Error("Invalid expected move-out date.");

    error.statusCode = 400;
    throw error;
  }

  if (moveOutDate <= tenant.moveInDate) {
    const error = new Error(
      "Expected move-out date must be after move-in date.",
    );

    error.statusCode = 400;
    throw error;
  }

  tenant.status = "NOTICE_PERIOD";
  tenant.noticeDate = new Date();
  tenant.expectedMoveOutDate = moveOutDate;

  await tenant.save();

  return tenant;
};

export const moveOutTenant = async ({ user, tenantId, actualMoveOutDate }) => {
  if (!user.organization) {
    const error = new Error("User is not associated with an organization.");

    error.statusCode = 400;
    throw error;
  }

  const tenant = await Tenant.findOne({
    _id: tenantId,
    organization: user.organization,
  });

  if (!tenant) {
    const error = new Error("Tenant not found.");

    error.statusCode = 404;
    throw error;
  }

  await checkPropertyAccess({
    user,
    propertyId: tenant.property,
    permission: TENANT_UPDATE_PERMISSIONS,
  });

  if (tenant.status === "LEFT") {
    const error = new Error("Tenant has already moved out.");

    error.statusCode = 400;
    throw error;
  }

  if (tenant.status !== "NOTICE_PERIOD") {
    const error = new Error(
      "Tenant must be in notice period before moving out.",
    );

    error.statusCode = 400;
    throw error;
  }

  const moveOutDate = new Date(actualMoveOutDate);

  if (Number.isNaN(moveOutDate.getTime())) {
    const error = new Error("Invalid move-out date.");

    error.statusCode = 400;
    throw error;
  }

  if (moveOutDate < tenant.moveInDate) {
    const error = new Error("Move-out date cannot be before move-in date.");

    error.statusCode = 400;
    throw error;
  }

  tenant.status = "LEFT";
  tenant.actualMoveOutDate = moveOutDate;

  await tenant.save();

  return tenant;
};
