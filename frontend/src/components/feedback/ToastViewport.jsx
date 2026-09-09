import { useToastStore } from '../../store/toastStore'
import { cx } from '../../utils/format'
import { asArray } from '../../utils/collections'

export function ToastViewport() {
  const { toasts, dismiss } = useToastStore()

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(100%-2rem,400px)] flex-col gap-2.5 sm:right-5 sm:top-5">
      {asArray(toasts).map((t) => (
        <div
          key={t.id}
          className={cx(
            'pointer-events-auto overflow-hidden rounded-[13px] border bg-card px-4 py-3.5',
            'shadow-[0_8px_30px_rgba(18,26,47,0.11)]',
            'transition-all duration-200',
            t.type === 'success' && 'border-success/20',
            t.type === 'error' && 'border-danger/20',
            t.type === 'warning' && 'border-warning/20',
            t.type === 'info' && 'border-info/20'
          )}
          role="status"
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={cx(
                'mt-1 h-2 w-2 shrink-0 rounded-full',
                t.type === 'success' && 'bg-success',
                t.type === 'error' && 'bg-danger',
                t.type === 'warning' && 'bg-warning',
                t.type === 'info' && 'bg-info'
              )}
            />

            <p
              className={cx(
                'min-w-0 flex-1 text-sm font-medium leading-5 text-ink-800',
                t.type === 'success' && 'text-success',
                t.type === 'error' && 'text-danger',
                t.type === 'warning' && 'text-warning',
                t.type === 'info' && 'text-info'
              )}
            >
              {t.message}
            </p>

            <button
              type="button"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-lg leading-none text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/10"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
