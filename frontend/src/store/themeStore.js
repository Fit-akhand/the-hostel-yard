import { create } from 'zustand'

const KEY = 'thy-theme'

const readStored = () => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

const systemTheme = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

const apply = (theme, animate) => {
  const root = document.documentElement
  if (animate) {
    root.classList.add('theme-transition')
    window.setTimeout(() => root.classList.remove('theme-transition'), 400)
  }
  root.setAttribute('data-theme', theme)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#070a12' : '#eef1f8')
}

export const useThemeStore = create((set, get) => ({
  theme: readStored() || systemTheme(),
  setTheme: (theme) => {
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* storage unavailable */
    }
    apply(theme, true)
    set({ theme })
  },
  toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}))

apply(useThemeStore.getState().theme, false)
