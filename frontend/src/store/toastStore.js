import { create } from 'zustand'

export const useToastStore = create((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = crypto.randomUUID()
    set((state) => ({
      toasts: [...state.toasts, { id, ...toast }],
    }))
    const timeout = toast.timeout ?? 4200
    if (timeout > 0) {
      window.setTimeout(() => get().dismiss(id), timeout)
    }
    return id
  },
  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))

export const toast = {
  success: (message) => useToastStore.getState().push({ type: 'success', message }),
  error: (message) => useToastStore.getState().push({ type: 'error', message }),
  warning: (message) => useToastStore.getState().push({ type: 'warning', message }),
  info: (message) => useToastStore.getState().push({ type: 'info', message }),
}
