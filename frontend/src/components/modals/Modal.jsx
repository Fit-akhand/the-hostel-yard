import { useEffect } from 'react'
import { cx } from '../../utils/format'
import { Button } from '../ui'

export function Modal({ open, title, children, onClose, footer, wide }) {
  useEffect(() => {
    if (!open) return undefined

    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }

    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        className="absolute inset-0 bg-navy-950/45 backdrop-blur-[2px] transition-opacity"
        aria-label="Close dialog"
        onClick={onClose}
      />

      <div
        className={cx(
          'relative z-10 max-h-[90vh] w-full overflow-y-auto',
          'border border-line bg-card',
          'rounded-t-[20px] shadow-[0_20px_60px_rgba(11,16,32,0.18)]',
          'sm:rounded-[18px]',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        )}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-card/95 px-6 py-5 backdrop-blur">
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.025em] text-navy-900">
              {title}
            </h2>
          </div>

          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-ink-50 text-lg leading-none text-ink-400 transition-all hover:border-ink-200 hover:bg-white hover:text-ink-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/10"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-6">
          {children}

          {footer ? (
            <div className="mt-7 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  danger,
  loading,
  onConfirm,
  onClose,
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-6 text-ink-600">{description}</div>
    </Modal>
  )
}
