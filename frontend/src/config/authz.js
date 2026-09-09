import {
  MANAGER_ALLOWED_PERMISSIONS,
  ROLES,
  STAFF_ALLOWED_PERMISSIONS,
} from './permissions'

export function isOwnerRole(role) {
  return role === ROLES.BUSINESS_OWNER || role === ROLES.LANDLORD
}

export function capabilityPermissions(role) {
  if (isOwnerRole(role)) return null

  if (role === ROLES.PROPERTY_MANAGER) {
    return MANAGER_ALLOWED_PERMISSIONS
  }

  if (role === ROLES.STAFF) {
    return STAFF_ALLOWED_PERMISSIONS
  }

  return []
}

export function hasRole(user, ...roles) {
  if (!user) return false
  return roles.includes(user.role)
}

export function hasPermission(user, permission) {
  if (!user) return false

  if (isOwnerRole(user.role)) return true

  if (user.role === ROLES.TENANT) return false

  const granted = user.permissions

  if (Array.isArray(granted) && granted.length) {
    return granted.includes(permission)
  }

  const ceiling = capabilityPermissions(user.role)

  return ceiling ? ceiling.includes(permission) : false
}

export function can(user, permission) {
  return hasPermission(user, permission)
}

export function canAccessNavItem(user, item) {
  if (!user) return false

  if (item.roles && !item.roles.includes(user.role)) {
    if (!item.alsoRoles?.includes(user.role)) return false
  }

  if (item.permission) {
    return (
      hasPermission(user, item.permission) ||
      item.alsoRoles?.includes(user.role)
    )
  }

  return true
}

export function canAccessRoute(user, permission, roles) {
  if (!user) return false

  if (roles?.length && !roles.includes(user.role)) return false

  if (permission) return hasPermission(user, permission)

  return true
}

export function homePath(role) {
  if (role === ROLES.TENANT) return '/tenant'

  return '/dashboard'
}