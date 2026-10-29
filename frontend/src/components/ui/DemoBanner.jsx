import { Info } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

export function DemoBanner() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  if (!user?.isDemo) return null

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-line bg-brand-soft px-4 py-2 text-center text-xs text-ink-800">
      <span className="inline-flex items-center gap-1.5 font-semibold text-brand">
        <Info size={14} /> Live demo
      </span>
      <span>
        You are viewing sample data as a guest <strong className="capitalize">{String(user.role).replace('_', ' ').toLowerCase()}</strong>. Changes are disabled.
      </span>
      <button type="button" onClick={logout} className="font-semibold text-brand underline-offset-4 hover:underline">
        Exit demo
      </button>
    </div>
  )
}
