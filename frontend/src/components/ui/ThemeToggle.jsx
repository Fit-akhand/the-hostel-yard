import { Moon, Sun } from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'
import { cx } from '../../utils/format'

export function ThemeToggle({ className }) {
  const theme = useThemeStore((s) => s.theme)
  const toggle = useThemeStore((s) => s.toggle)
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light theme' : 'Dark theme'}
      className={cx(
        'bg-card grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-ink-700',
        'transition hover:text-brand hover:shadow-md',
        className
      )}
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  )
}
