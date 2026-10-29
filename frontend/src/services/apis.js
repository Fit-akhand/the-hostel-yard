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
