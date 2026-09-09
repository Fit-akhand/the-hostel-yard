import { PERMISSIONS, ROLES } from './permissions'

export const NAV_GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', permission: PERMISSIONS.VIEW_DASHBOARD },
    ],
  },
  {
    id: 'property',
    label: 'Property',
    items: [
      { to: '/properties', label: 'Properties', roles: [ROLES.BUSINESS_OWNER, ROLES.LANDLORD, ROLES.PROPERTY_MANAGER] },
      { to: '/rooms', label: 'Rooms', permission: PERMISSIONS.VIEW_ROOMS },
      { to: '/beds', label: 'Beds', permission: PERMISSIONS.VIEW_ROOMS },
    ],
  },
  {
    id: 'people',
    label: 'People',
    items: [
      { to: '/tenants', label: 'Tenants', permission: PERMISSIONS.VIEW_TENANTS },
      { to: '/managers', label: 'Managers', roles: [ROLES.BUSINESS_OWNER] },
      { to: '/staff', label: 'Staff', permission: PERMISSIONS.VIEW_STAFF },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { to: '/allocations', label: 'Allocations', permission: PERMISSIONS.VIEW_ALLOCATIONS },
      { to: '/bookings', label: 'Bookings', permission: PERMISSIONS.VIEW_BOOKINGS },
      { to: '/complaints', label: 'Complaints', permission: PERMISSIONS.VIEW_COMPLAINTS },
      { to: '/announcements', label: 'Announcements', permission: PERMISSIONS.SEND_ANNOUNCEMENT, alsoRoles: [ROLES.BUSINESS_OWNER, ROLES.LANDLORD] },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { to: '/rent', label: 'Rent', permission: PERMISSIONS.VIEW_DUES },
      { to: '/payments', label: 'Payments', permission: PERMISSIONS.VIEW_PAYMENTS },
      { to: '/expenses', label: 'Expenses', permission: PERMISSIONS.VIEW_EXPENSES },
      { to: '/payment-settings', label: 'Payment settings', permission: PERMISSIONS.VIEW_PAYMENT_SETTINGS, alsoRoles: [ROLES.BUSINESS_OWNER, ROLES.LANDLORD] },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    items: [{ to: '/notifications', label: 'Notifications' }],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    items: [
      { to: '/reports', label: 'Reports', roles: [ROLES.BUSINESS_OWNER, ROLES.LANDLORD, ROLES.PROPERTY_MANAGER, ROLES.STAFF] },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      { to: '/organization', label: 'Organization', roles: [ROLES.BUSINESS_OWNER, ROLES.LANDLORD] },
      { to: '/profile', label: 'Profile' },
    ],
  },
]

export const TENANT_NAV = [
  { to: '/tenant', label: 'Dashboard' },
  { to: '/tenant/stay', label: 'My stay' },
  { to: '/tenant/rent', label: 'Rent' },
  { to: '/tenant/payments', label: 'Payments' },
  { to: '/tenant/complaints', label: 'Complaints' },
  { to: '/tenant/announcements', label: 'Announcements' },
  { to: '/tenant/notifications', label: 'Notifications' },
  { to: '/tenant/profile', label: 'Profile' },
]
