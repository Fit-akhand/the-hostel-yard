import { create } from 'zustand'

import { authApi } from '../services/authApi'
import { homePath } from '../config/authz'
import { toast } from './toastStore'
import { queryClient } from '../app/queryClient'

export const useAuthStore = create((set, get) => ({
  user: null,

  status: 'idle',

  bootstrapped: false,

  setUser: (user) =>
    set({
      user,
      status: user ? 'authenticated' : 'anonymous',
    }),

  bootstrap: async () => {
    if (get().bootstrapped) return get().user

    set({ status: 'loading' })

    try {
      const user = await authApi.me()

      if (!user || typeof user !== 'object') {
        set({
          user: null,
          status: 'anonymous',
          bootstrapped: true,
        })

        return null
      }

      set({
        user,
        status: 'authenticated',
        bootstrapped: true,
      })

      return user
    } catch {
      set({
        user: null,
        status: 'anonymous',
        bootstrapped: true,
      })

      return null
    }
  },

  login: async (payload) => {
    const user = await authApi.login(payload)

    set({
      user,
      status: 'authenticated',
      bootstrapped: true,
    })

    return user
  },

  loginDemo: async (role) => {
    const user = await authApi.demo(role)

    set({
      user,
      status: 'authenticated',
      bootstrapped: true,
    })

    return user
  },

  logout: async () => {
    try {
      await authApi.logout()
    } catch {
      // Cookie may already be gone.
    }

    queryClient.clear()

    set({
      user: null,
      status: 'anonymous',
      bootstrapped: true,
    })

    toast.info('You have been signed out.')
  },

  home: () => homePath(get().user?.role),
}))