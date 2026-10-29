import { apiClient, pickData, unwrap } from './apiClient'

export const authApi = {
  setupOwner: async (body) => {
    const payload = unwrap(await apiClient.post('/auth/setup-owner', body))
    return payload.data || payload
  },

  verifySetup: async (body) =>
    pickData(unwrap(await apiClient.post('/auth/verify-setup', body))),

  login: async (body) => {
    const payload = unwrap(await apiClient.post('/auth/login', body))
    return pickData(payload, 'user')
  },

  demo: async (role) => {
    const payload = unwrap(await apiClient.post('/auth/demo', { role }))
    return pickData(payload, 'user')
  },

  me: async () => {
    const payload = unwrap(await apiClient.get('/auth/me'))
    return pickData(payload, 'user')
  },

  logout: async () => unwrap(await apiClient.post('/auth/logout')),

  forgotPassword: async (body) =>
    unwrap(await apiClient.post('/auth/forgot-password', body)),

  resetPassword: async (body) =>
    unwrap(await apiClient.post('/auth/reset-password', body)),
}