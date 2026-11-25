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
      { to: '/public-page', label: 'Public page', roles: [ROLES.BUSINESS_OWNER] },
    ],
  },
  {
    id: 'people',
    label: 'People',
    items: [
      { to: '/tenants', label: 'Tenants', permission: PERMISSIONS.VIEW_TENANTS },
      { to: '/documents', label: 'Documents', permission: PERMISSIONS.VIEW_TENANTS },
      { to: '/managers', label: 'Managers', roles: [ROLES.BUSINESS_OWNER] },
      { to: '/staff', label: 'Staff', permission: PERMISSIONS.VIEW_STAFF },
      { to: '/employees', label: 'Employees', permission: PERMISSIONS.VIEW_STAFF },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { to: '/allocations', label: 'Allocations', permission: PERMISSIONS.VIEW_ALLOCATIONS },
      { to: '/visitors', label: 'Guest passes', permission: PERMISSIONS.VIEW_TENANTS },
      { to: '/attendance', label: 'Attendance', permission: PERMISSIONS.VIEW_STAFF },
      { to: '/bookings', label: 'Bookings', permission: PERMISSIONS.VIEW_BOOKINGS },
      { to: '/enquiries', label: 'Enquiries', permission: PERMISSIONS.VIEW_BOOKINGS },
      { to: '/food-menu', label: 'Food menu', permission: PERMISSIONS.MANAGE_FOOD_MENU },
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
      { to: '/reconcile', label: 'Bank matching', permission: PERMISSIONS.VERIFY_PAYMENTS },
      { to: '/expenses', label: 'Expenses', permission: PERMISSIONS.VIEW_EXPENSES },
      { to: '/deposits', label: 'Deposits', roles: [ROLES.BUSINESS_OWNER] },
      { to: '/payroll', label: 'Payroll', roles: [ROLES.BUSINESS_OWNER] },
      { to: '/rent-rules', label: 'Rent rules', roles: [ROLES.BUSINESS_OWNER] },
      { to: '/payment-settings', label: 'Payment settings', permission: PERMISSIONS.VIEW_PAYMENT_SETTINGS, alsoRoles: [ROLES.BUSINESS_OWNER, ROLES.LANDLORD] },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    items: [
      { to: '/notifications', label: 'Notifications' },
      { to: '/notification-settings', label: 'Reminders & alerts', roles: [ROLES.BUSINESS_OWNER] },
    ],
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
  { to: '/tenant/guests', label: 'Guests' },
  { to: '/tenant/food', label: 'Food menu' },
  { to: '/tenant/documents', label: 'Documents' },
  { to: '/tenant/payments', label: 'Payments' },
  { to: '/tenant/complaints', label: 'Complaints' },
  { to: '/tenant/announcements', label: 'Announcements' },
  { to: '/tenant/notifications', label: 'Notifications' },
  { to: '/tenant/profile', label: 'Profile' },
]
