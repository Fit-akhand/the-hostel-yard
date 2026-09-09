import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const usePropertyStore = create(
  persist(
    (set) => ({
      currentPropertyId: '',
      setCurrentPropertyId: (id) => set({ currentPropertyId: id || '' }),
    }),
    { name: 'thy-property' }
  )
)
