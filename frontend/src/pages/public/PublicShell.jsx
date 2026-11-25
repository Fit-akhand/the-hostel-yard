import { ThemeToggle } from '../../components/ui/ThemeToggle'
import { Card } from '../../components/ui'
import { useThemeStore } from '../../store/themeStore'
import { cx } from '../../utils/format'

// Frame for pages anyone can open from a link or QR code, without signing in.
export function PublicShell({ children, wide = false, subtitle }) {
  const theme = useThemeStore((s) => s.theme)
  return (
    <div className="min-h-screen px-4 py-5 sm:px-6">
      <div className={cx('mx-auto', wide ? 'max-w-4xl' : 'max-w-md')}>
        <header className="mb-5 flex items-center justify-between gap-3">
          <img src={theme === 'dark' ? '/logo-full-light.png' : '/logo-full.png'} alt="The Hostel Yard" className="h-11 w-auto" />
          <ThemeToggle />
        </header>
        {subtitle ? <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">{subtitle}</p> : null}
        <main className="grid gap-4">{children}</main>
        <footer className="py-8 text-center text-xs text-ink-400">The Hostel Yard</footer>
      </div>
    </div>
  )
}

export function PublicMessage({ title, children }) {
  return (
    <Card className="p-6 text-center">
      <h1 className="font-display text-2xl text-ink-950">{title}</h1>
      {children ? <div className="mt-2 text-sm text-ink-600">{children}</div> : null}
    </Card>
  )
}
