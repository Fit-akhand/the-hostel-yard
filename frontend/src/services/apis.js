import { apiClient, asArray, pickData, pickList, unwrap } from './apiClient'

function flattenKeys(keys) {
  if (!keys.length) return []
  if (keys.length === 1 && Array.isArray(keys[0])) return keys[0]
  return keys
}

const get = async (url, params, ...keys) =>
  pickData(unwrap(await apiClient.get(url, { params })), ...flattenKeys(keys))

const getList = async (url, params, ...keys) =>
  pickList(unwrap(await apiClient.get(url, { params })), ...flattenKeys(keys))

const mutate = async (method, url, body, ...keys) =>
  pickData(unwrap(await apiClient[method](url, body)), ...flattenKeys(keys))

export const propertyApi = {
  list: () => getList('/properties', undefined, 'properties'),
  get: (id) => get(`/properties/${id}`, undefined, 'property'),
  create: (body) => mutate('post', '/properties', body, 'property'),
  update: (id, body) => mutate('put', `/properties/${id}`, body, 'property'),
  deactivate: (id) => mutate('patch', `/properties/${id}/deactivate`, {}, 'property'),
}

export const roomApi = {
  list: (params) => getList('/rooms', params, 'rooms'),
  get: (id) => get(`/rooms/${id}`, undefined, 'room'),
  create: (body) => mutate('post', '/rooms', body, 'room'),
  update: (id, body) => mutate('put', `/rooms/${id}`, body, 'room'),
  deactivate: (id) => apiClient.delete(`/rooms/${id}`).then(unwrap),
}

export const bedApi = {
  listByProperty: (params) => getList('/beds', params, 'beds'),
  listByRoom: (roomId, params) => getList(`/beds/room/${roomId}`, params, 'beds'),
  get: (id) => get(`/beds/${id}`, undefined, 'bed'),
  create: (roomId, body) => mutate('post', `/beds/room/${roomId}`, body, 'bed'),
  update: (id, body) => mutate('put', `/beds/${id}`, body, 'bed'),
  deactivate: (id) => apiClient.delete(`/beds/${id}`).then(unwrap),
}

export const tenantApi = {
  list: (params) => getList('/tenants', params, 'tenants'),
  get: (id) => get(`/tenants/${id}`, undefined, 'tenant'),
  create: (body) => mutate('post', '/tenants', body, 'tenant'),
  update: (id, body) => mutate('put', `/tenants/${id}`, body, 'tenant'),
  notice: (id, body) => mutate('post', `/tenants/${id}/notice`, body, 'tenant'),
  moveOut: (id, body) => mutate('post', `/tenants/${id}/move-out`, body, 'tenant'),
  invite: (id) => mutate('post', `/tenants/${id}/invite`, {}, 'invitationLink'),
  cancelNotice: (id) => mutate('post', `/tenants/${id}/notice/cancel`, {}, 'tenant'),
  acceptInvite: (body) => apiClient.post('/tenants/accept-invitation', body).then(unwrap),
}

export const allocationApi = {
  list: (params) => getList('/allocations', params, 'allocations'),
  get: (id) => get(`/allocations/${id}`, undefined, 'allocation'),
  create: (body) => mutate('post', '/allocations', body, 'allocation'),
  end: (id, body) => mutate('post', `/allocations/${id}/end`, body, 'allocation'),
}

export const bookingApi = {
  list: async (params) => {
    const payload = unwrap(await apiClient.get('/bookings', { params }))
    const data = payload.data || payload
    return {
      ...data,
      bookings: asArray(data, 'bookings'),
    }
  },
  get: async (id) => {
    const payload = unwrap(await apiClient.get(`/bookings/${id}`))
    return payload.data || payload
  },
  create: async (body) => {
    const payload = unwrap(await apiClient.post('/bookings', body))
    return payload.data || payload
  },
  update: (id, body) => apiClient.patch(`/bookings/${id}`, body).then((r) => r.data.data || r.data),
  confirm: (id) => apiClient.patch(`/bookings/${id}/confirm`).then((r) => r.data.data || r.data),
  cancel: (id, body) => apiClient.patch(`/bookings/${id}/cancel`, body).then((r) => r.data.data || r.data),
  complete: (id) => apiClient.patch(`/bookings/${id}/complete`).then((r) => r.data.data || r.data),
  expire: () => apiClient.post('/bookings/expire').then((r) => r.data.data || r.data),
  remove: (id) => apiClient.delete(`/bookings/${id}`).then((r) => r.data),
}

export const rentApi = {
  plans: (params) => getList('/rent/plans', params, 'rentPlans'),
  createPlan: (body) => mutate('post', '/rent/plans', body, 'rentPlan'),
  generateDue: (planId, body) => mutate('post', `/rent/plans/${planId}/due`, body, 'rentDue'),
  generateMonthly: (body) => mutate('post', '/rent/dues/generate', body),
  dues: (params) => getList('/rent/dues', params, 'dues'),
  paymentInfo: (dueId) => get(`/rent/dues/${dueId}/payment-info`, undefined, 'paymentInfo'),
}

export const paymentApi = {
  list: (params) => getList('/payments', params, 'payments'),
  get: (id) => get(`/payments/${id}`, undefined, 'payment'),
  create: (body) => mutate('post', '/payments', body, 'payment'),
  verify: (id) => mutate('post', `/payments/${id}/verify`, {}, 'payment'),
  reject: (id, body) => mutate('post', `/payments/${id}/reject`, body, 'payment'),
  tenantSummary: () => get('/payments/tenant/summary', undefined, 'information'),
  tenantCreate: (body) => mutate('post', '/payments/tenant', body, 'payment'),
  tenantHistory: async (params) => {
    const payload = unwrap(await apiClient.get('/payments/tenant/history', { params }))
    const data = payload.data || payload
    return {
      ...data,
      payments: asArray(data, 'payments'),
    }
  },
}

export const paymentSettingsApi = {
  get: (propertyId) => get(`/payment-settings/property/${propertyId}`, undefined, 'paymentSettings'),
  create: (propertyId, body) =>
    mutate('post', `/payment-settings/property/${propertyId}`, body, 'paymentSettings'),
  update: (propertyId, body) =>
    mutate('put', `/payment-settings/property/${propertyId}`, body, 'paymentSettings'),
  enable: (propertyId) =>
    mutate('patch', `/payment-settings/property/${propertyId}/enable`, {}, 'paymentSettings'),
  disable: (propertyId) =>
    mutate('patch', `/payment-settings/property/${propertyId}/disable`, {}, 'paymentSettings'),
}

export const expenseApi = {
  list: (params) => getList('/expenses', params, 'expenses'),
  get: (id) => get(`/expenses/${id}`, undefined, 'expense'),
  create: (body) => mutate('post', '/expenses', body, 'expense'),
  update: (id, body) => mutate('put', `/expenses/${id}`, body, 'expense'),
  void: (id, body) => mutate('post', `/expenses/${id}/void`, body, 'expense'),
}

export const complaintApi = {
  list: async (params) => {
    const payload = unwrap(await apiClient.get('/complaints', { params }))
    return asArray(payload, 'complaints')
  },
  get: async (id) => {
    const payload = unwrap(await apiClient.get(`/complaints/${id}`))
    return payload.complaint || payload.data?.complaint || payload.data
  },
  create: async (body) => {
    const payload = unwrap(await apiClient.post('/complaints', body))
    return payload.complaint || payload.data?.complaint
  },
  update: async (id, body) => {
    const payload = unwrap(await apiClient.patch(`/complaints/${id}`, body))
    return payload.complaint || payload.data?.complaint
  },
  assign: async (id, body) => {
    const payload = unwrap(await apiClient.post(`/complaints/${id}/assign`, body))
    return payload.complaint || payload.data?.complaint
  },
  changeStatus: async (id, body) => {
    const payload = unwrap(await apiClient.post(`/complaints/${id}/status`, body))
    return payload.complaint || payload.data?.complaint
  },
  remove: (id) => apiClient.delete(`/complaints/${id}`).then(unwrap),
}

export const announcementApi = {
  list: async (params) => {
    const payload = unwrap(await apiClient.get('/announcements', { params }))
    return asArray(payload, 'announcements')
  },
  get: async (id) => {
    const payload = unwrap(await apiClient.get(`/announcements/${id}`))
    return payload.announcement || payload.data?.announcement
  },
  create: async (body) => {
    const payload = unwrap(await apiClient.post('/announcements', body))
    return payload.announcement || payload.data?.announcement
  },
  update: async (id, body) => {
    const payload = unwrap(await apiClient.patch(`/announcements/${id}`, body))
    return payload.announcement || payload.data?.announcement
  },
  publish: async (id, body) => {
    const payload = unwrap(await apiClient.post(`/announcements/${id}/publish`, body || {}))
    return payload.announcement || payload.data?.announcement
  },
  cancel: async (id, body) => {
    const payload = unwrap(await apiClient.post(`/announcements/${id}/cancel`, body || {}))
    return payload.announcement || payload.data?.announcement
  },
  remove: (id) => apiClient.delete(`/announcements/${id}`).then(unwrap),
}

export const managerApi = {
  invite: (body) => apiClient.post('/managers/invitations', body).then((r) => r.data.data || r.data),
  getInvitation: (token) =>
    apiClient.get(`/managers/invitations/${token}`).then((r) => r.data.data || r.data),
  activate: (token, body) =>
    apiClient.post(`/managers/invitations/${token}/activate`, body).then((r) => r.data.data || r.data),
  updatePermissions: (managerId, propertyId, body) =>
    apiClient
      .patch(`/managers/${managerId}/properties/${propertyId}/permissions`, body)
      .then((r) => r.data.data || r.data),
  list: () => get('/managers'),
  get: (id) => get(`/managers/${id}`, undefined, 'manager'),
  update: (id, body) => mutate('put', `/managers/${id}`, body, 'manager'),
  setStatus: (id, status) => mutate('patch', `/managers/${id}/status`, { status }, 'manager'),
  assign: (id, body) => mutate('post', `/managers/${id}/properties`, body, 'manager'),
  unassign: (id, propertyId) => apiClient.delete(`/managers/${id}/properties/${propertyId}`).then(unwrap),
  resendInvitation: (invitationId) => mutate('post', `/managers/invitations/${invitationId}/resend`, {}),
  cancelInvitation: (invitationId) => apiClient.delete(`/managers/invitations/${invitationId}`).then(unwrap),
}

export const staffApi = {
  list: async (params) => {
    const payload = unwrap(await apiClient.get('/staff', { params }))
    const data = payload.data || payload
    return {
      ...data,
      staff: asArray(data, 'staff'),
    }
  },
  get: async (id) => {
    const payload = unwrap(await apiClient.get(`/staff/${id}`))
    return payload.data || payload
  },
  create: (body) => apiClient.post('/staff', body).then((r) => r.data.data || r.data),
  update: (id, body) => apiClient.patch(`/staff/${id}`, body).then((r) => r.data.data || r.data),
  updateStatus: (id, body) =>
    apiClient.patch(`/staff/${id}/status`, body).then((r) => r.data.data || r.data),
  getInvitation: (token) =>
    apiClient.get(`/staff/invitations/${token}`).then((r) => r.data.data || r.data),
  activate: (body) => apiClient.post('/staff/invitations/activate', body).then((r) => r.data),
}

export const notificationApi = {
  list: async (params) => {
    const payload = unwrap(await apiClient.get('/notifications', { params }))
    return {
      ...payload,
      notifications: asArray(payload, 'notifications'),
      unreadCount: Number(payload.unreadCount ?? payload.data?.unreadCount ?? 0) || 0,
    }
  },
  unreadCount: async () => {
    const payload = unwrap(await apiClient.get('/notifications/unread-count'))
    return Number(payload.unreadCount ?? payload.data?.unreadCount ?? 0) || 0
  },
  get: async (id) => {
    const payload = unwrap(await apiClient.get(`/notifications/${id}`))
    return payload.notification || payload.data?.notification
  },
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`).then(unwrap),
  markAll: () => apiClient.patch('/notifications/read-all').then(unwrap),
  remove: (id) => apiClient.delete(`/notifications/${id}`).then(unwrap),
}

export const dashboardApi = {
  overview: async (params) => {
    const payload = unwrap(await apiClient.get('/dashboard/overview', { params }))
    return payload.data || payload
  },
}

export const reportApi = {
  occupancy: async (params) => asArray(unwrap(await apiClient.get('/reports/occupancy', { params })).data),
  rent: async (params) => asArray(unwrap(await apiClient.get('/reports/rent', { params })).data),
  payments: async (params) => asArray(unwrap(await apiClient.get('/reports/payments', { params })).data),
  expenses: async (params) => asArray(unwrap(await apiClient.get('/reports/expenses', { params })).data),
  complaints: async (params) => asArray(unwrap(await apiClient.get('/reports/complaints', { params })).data),
  tenants: async (params) => asArray(unwrap(await apiClient.get('/reports/tenants', { params })).data),
  bookings: async (params) => asArray(unwrap(await apiClient.get('/reports/bookings', { params })).data),
}

export const notificationSettingsApi = {
  get: () => get('/notification-settings'),
  update: (body) => mutate('put', '/notification-settings', body),
  test: (body) => mutate('post', '/notification-settings/test', body),
  runNow: () => mutate('post', '/notification-settings/run-now', {}),
  logs: (limit = 50) => getList('/notification-settings/logs', { limit }, 'logs'),
}

export const employeeApi = {
  list: (params) => getList('/employees', params, 'employees'),
  get: (id) => get(`/employees/${id}`, undefined, 'employee'),
  create: (body) => mutate('post', '/employees', body, 'employee'),
  update: (id, body) => mutate('put', `/employees/${id}`, body, 'employee'),
  setStatus: (id, body) => mutate('patch', `/employees/${id}/status`, body, 'employee'),
}

export const attendanceApi = {
  sheet: (params) => getList('/attendance', params, 'sheet'),
  save: (body) => mutate('put', '/attendance', body),
  month: (params) => getList('/attendance/month', params, 'records'),
}

export const payrollApi = {
  list: (params) => get('/payroll', params),
  generate: (body) => mutate('post', '/payroll/generate', body),
  get: (id) => get(`/payroll/${id}`, undefined, 'payroll'),
  pay: (id, body) => mutate('post', `/payroll/${id}/pay`, body, 'payroll'),
  adjustments: (params) => getList('/payroll/adjustments', params, 'adjustments'),
  addAdjustment: (body) => mutate('post', '/payroll/adjustments', body, 'adjustment'),
  removeAdjustment: (id) => apiClient.delete(`/payroll/adjustments/${id}`).then(unwrap),
}

export const receiptApi = {
  get: (paymentId) => get(`/receipts/${paymentId}`, undefined, 'receipt'),
}

export const gatewayApi = {
  config: () => get('/gateway/config'),
  createOrder: (rentDueId) => mutate('post', '/gateway/orders', { rentDueId }),
  confirm: (body) => mutate('post', '/gateway/confirm', body),
}

export const financeSettingsApi = {
  get: () => get('/finance-settings', undefined, 'settings'),
  update: (body) => mutate('put', '/finance-settings', body, 'settings'),
}

export const depositApi = {
  list: (params) => getList('/deposits', params, 'deposits'),
  forTenant: (tenantId) => get(`/deposits/tenant/${tenantId}`, undefined, 'deposit'),
  save: (tenantId, body) => mutate('put', `/deposits/tenant/${tenantId}`, body, 'deposit'),
  preview: (tenantId, deductions) => get(`/deposits/tenant/${tenantId}/preview`, { deductions: JSON.stringify(deductions) }),
  settle: (tenantId, body) => mutate('post', `/deposits/tenant/${tenantId}/settle`, body, 'deposit'),
}

// Uploads one file with its kind. The browser sets the multipart boundary itself.
const upload = async (url, kind, file) => {
  const form = new FormData()
  form.append('kind', kind)
  form.append('file', file)
  return pickData(unwrap(await apiClient.post(url, form, { headers: { 'Content-Type': undefined }, timeout: 60000 })))
}

export const kycApi = {
  get: (tenantId) => get(`/tenants/${tenantId}/kyc`),
  save: (tenantId, body) => mutate('put', `/tenants/${tenantId}/kyc`, body),
  upload: (tenantId, kind, file) => upload(`/tenants/${tenantId}/kyc/documents`, kind, file),
  remove: (tenantId, docId) => apiClient.delete(`/tenants/${tenantId}/kyc/documents/${docId}`).then((r) => pickData(unwrap(r))),
  fileUrl: (tenantId, docId) => `${apiClient.defaults.baseURL}/tenants/${tenantId}/kyc/documents/${docId}/file`,
  review: (tenantId, body) => mutate('post', `/tenants/${tenantId}/kyc/review`, body),
  police: (tenantId, body) => mutate('put', `/tenants/${tenantId}/kyc/police`, body),
  link: (tenantId, body = {}) => mutate('post', `/tenants/${tenantId}/link`, body),
  previewAgreement: (tenantId, terms) => mutate('post', `/tenants/${tenantId}/agreement/preview`, terms ? { terms } : {}),
  createAgreement: (tenantId, terms) => mutate('post', `/tenants/${tenantId}/agreement`, { terms }),
}

export const documentApi = {
  list: (params) => getList('/documents', params),
  summary: () => get('/documents/summary'),
  get: (id) => get(`/documents/${id}`),
  countersign: (id, body) => mutate('post', `/documents/${id}/countersign`, body),
  cancel: (id, reason) => mutate('post', `/documents/${id}/cancel`, { reason }),
}

export const templateApi = {
  get: (kind) => get(`/document-templates/${kind}`),
  save: (kind, body) => mutate('put', `/document-templates/${kind}`, body),
  reset: (kind) => apiClient.delete(`/document-templates/${kind}`).then((r) => pickData(unwrap(r))),
}

export const foodMenuApi = {
  get: (propertyId) => get(`/food-menu/${propertyId}`),
  save: (propertyId, body) => mutate('put', `/food-menu/${propertyId}`, body),
}

export const enquiryApi = {
  list: (params) => get('/enquiries', params),
  get: (id) => get(`/enquiries/${id}`),
  create: (body) => mutate('post', '/enquiries', body),
  update: (id, body) => mutate('patch', `/enquiries/${id}`, body),
}

export const listingApi = {
  list: () => get('/listings'),
  save: (propertyId, body) => mutate('put', `/listings/${propertyId}`, body),
}

// Signed-in resident (tenant portal).
export const residentApi = {
  tenancy: () => get('/me/tenancy'),
  giveNotice: (body) => mutate('post', '/me/notice', body),
  withdrawNotice: () => mutate('post', '/me/notice/withdraw', {}),
  foodMenu: () => get('/me/food-menu'),
}

// Resident form and documents: the same calls for the tenant portal (/me) and for a private link
// (/public/resident/:token).
export const residentDocsApi = (base) => ({
  base,
  profile: () => get(`${base}/profile`),
  save: (body) => mutate('put', `${base}/kyc`, body),
  upload: (kind, file) => upload(`${base}/kyc/documents`, kind, file),
  remove: (docId) => apiClient.delete(`${base}/kyc/documents/${docId}`).then((r) => pickData(unwrap(r))),
  fileUrl: (docId) => `${apiClient.defaults.baseURL}${base}/kyc/documents/${docId}/file`,
  submit: (body) => mutate('post', `${base}/kyc/submit`, body),
  document: (docId) => get(`${base}/documents/${docId}`),
  sign: (docId, body) => mutate('post', `${base}/documents/${docId}/sign`, body),
})

export const publicApi = {
  organization: (orgSlug) => get(`/public/stays/${orgSlug}`),
  property: (orgSlug, slug) => get(`/public/stays/${orgSlug}/${slug}`),
  enquire: (orgSlug, slug, body) => mutate('post', `/public/stays/${orgSlug}/${slug}/enquiries`, body),
}

// Guest passes at the gate (owner, manager, staff).
export const guestPassApi = {
  list: (params) => get('/guest-passes', params),
  createAtGate: (body) => mutate('post', '/guest-passes', body),
  verify: (code) => mutate('post', '/guest-passes/verify', { code }),
  gate: (propertyId) => get(`/guest-passes/gate/${propertyId}`),
  resetGate: (propertyId) => mutate('post', `/guest-passes/gate/${propertyId}/reset`, {}),
  checkIn: (id) => mutate('post', `/guest-passes/${id}/check-in`, {}),
  checkOut: (id) => mutate('post', `/guest-passes/${id}/check-out`, {}),
  cancel: (id) => mutate('post', `/guest-passes/${id}/cancel`, {}),
}

// A signed-in resident's own guests.
export const myGuestApi = {
  list: () => get('/me/guests'),
  invite: (body) => mutate('post', '/me/guests', body),
  decide: (id, body) => mutate('post', `/me/guests/${id}/decision`, body),
  cancel: (id) => mutate('post', `/me/guests/${id}/cancel`, {}),
}

// No sign-in: the gate QR form, the visitor's pass and the resident's approval link.
export const publicGuestApi = {
  gate: (code) => get(`/public/visit/${code}`),
  request: (code, body) => mutate('post', `/public/visit/${code}`, body),
  pass: (token) => get(`/public/pass/${token}`),
  approval: (token) => get(`/public/approve/${token}`),
  decide: (token, body) => mutate('post', `/public/approve/${token}`, body),
}
