import { cx } from '../../utils/format'

const focusRing =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/10'

const transition =
  'transition-[background-color,border-color,box-shadow,color,transform,opacity] duration-200 ease-out'

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  type = 'button',
  ...props
}) {
  const variants = {
    primary: [
      'bg-brand text-white',
      'shadow-[0_1px_2px_rgba(18,26,47,.08),0_5px_14px_rgba(225,29,46,.12)]',
      'hover:bg-brand-dark',
      'hover:shadow-[0_4px_12px_rgba(18,26,47,.10),0_8px_22px_rgba(225,29,46,.16)]',
      'active:translate-y-px',
    ].join(' '),

    secondary: [
      'border border-line bg-card text-ink-950',
      'shadow-[0_1px_2px_rgba(18,26,47,.035)]',
      'hover:border-ink-200 hover:bg-card',
      'hover:shadow-[0_4px_12px_rgba(18,26,47,.06)]',
      'active:translate-y-px',
    ].join(' '),

    ghost: [
      'bg-transparent text-ink-700',
      'hover:bg-ink-50 hover:text-ink-950',
      'active:bg-ink-100',
    ].join(' '),

    danger: [
      'bg-danger text-white',
      'shadow-[0_1px_2px_rgba(18,26,47,.08)]',
      'hover:brightness-[.96]',
      'hover:shadow-[0_4px_12px_rgba(180,35,24,.16)]',
      'active:translate-y-px',
    ].join(' '),

    gold: [
      'bg-gold-soft text-navy-950',
      'shadow-[0_1px_2px_rgba(18,26,47,.06)]',
      'hover:brightness-[.97]',
      'hover:shadow-[0_4px_12px_rgba(18,26,47,.08)]',
      'active:translate-y-px',
    ].join(' '),
  }

  const sizes = {
    sm: 'h-9 rounded-[9px] px-3 text-[13px]',
    md: 'h-10 rounded-[10px] px-4 text-sm',
    lg: 'h-11 rounded-[11px] px-5 text-[15px]',
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2',
        'whitespace-nowrap font-medium tracking-[-0.01em]',
        transition,
        focusRing,
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}

      {children}
    </button>
  )
}

const controlBase = [
  'border border-line bg-card text-ink-950',
  'shadow-[0_1px_2px_rgba(18,26,47,.025)]',
  transition,
  'hover:border-ink-200',
  'focus:border-brand focus:bg-card',
  'focus:outline-none focus:ring-4 focus:ring-brand/10',
  'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400',
].join(' ')

export function Input({ className, ...props }) {
  return (
    <input
      className={cx(
        'h-11 w-full rounded-[10px] px-3.5 text-[15px]',
        'placeholder:text-ink-400',
        controlBase,
        className
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cx(
        'min-h-28 w-full resize-y rounded-[10px] px-3.5 py-3',
        'text-[15px] leading-6 placeholder:text-ink-400',
        controlBase,
        className
      )}
      {...props}
    />
  )
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cx(
        'h-11 w-full appearance-none rounded-[10px] px-3.5 text-[15px]',
        controlBase,
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}) {
  return (
    <div className="grid gap-1.5">
      {label ? (
        <label
          htmlFor={htmlFor}
          className="text-[13px] font-semibold tracking-[-0.01em] text-ink-800"
        >
          {label}

          {required ? (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}

      {children}

      {error ? (
        <p
          className="text-[13px] font-medium leading-5 text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs leading-5 text-ink-400">{hint}</p>
      ) : null}
    </div>
  )
}

export function Card({ children, className }) {
  return (
    <div
      className={cx(
        'rounded-[var(--thy-radius)] border border-line bg-card',
        'shadow-[var(--thy-shadow)]',
        'relative overflow-hidden',
        className
      )}
    >
      {children}
    </div>
  )
}

export function Badge({ tone = 'neutral', children }) {
  const tones = {
    neutral: [
      'border-ink-200 bg-ink-50 text-ink-700',
    ].join(' '),

    success: [
      'border-green-200 bg-success-bg text-success',
    ].join(' '),

    warning: [
      'border-amber-200 bg-warning-bg text-warning',
    ].join(' '),

    danger: [
      'border-red-200 bg-danger-bg text-danger',
    ].join(' '),

    info: [
      'border-blue-200 bg-info-bg text-info',
    ].join(' '),

    navy: [
      'border-navy-700 bg-navy-900 text-white',
    ].join(' '),
  }

  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border',
        'px-2.5 py-1',
        'text-[11px] font-semibold uppercase leading-none',
        'tracking-[0.06em]',
        tones[tone] || tones.neutral
      )}
    >
      {children}
    </span>
  )
}

export function statusTone(status) {
  const map = {
    ACTIVE: 'success',
    AVAILABLE: 'success',
    PAID: 'success',
    VERIFIED: 'success',
    RESOLVED: 'success',
    COMPLETED: 'success',
    PUBLISHED: 'success',
    CONFIRMED: 'success',

    PENDING: 'warning',
    PARTIAL: 'warning',
    NOTICE_PERIOD: 'warning',
    MAINTENANCE: 'warning',

    ASSIGNED: 'info',
    IN_PROGRESS: 'info',
    OPEN: 'info',

    CLOSED: 'neutral',
    DRAFT: 'neutral',
    LEFT: 'neutral',
    ENDED: 'neutral',
    INACTIVE: 'neutral',

    OCCUPIED: 'navy',

    OVERDUE: 'danger',
    REJECTED: 'danger',
    CANCELLED: 'danger',
    VOIDED: 'danger',
    EXPIRED: 'danger',
    URGENT: 'danger',
    SUSPENDED: 'danger',
    REMOVED: 'danger',
    UNPAID: 'danger',
  }

  return map[status] || 'neutral'
}

export function StatusBadge({ status }) {
  if (!status) {
    return <span className="text-ink-400">—</span>
  }

  return (
    <Badge tone={statusTone(status)}>
      {String(status).replaceAll('_', ' ')}
    </Badge>
  )
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}) {
  return (
    <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumb ? (
          <div className="mb-2.5 text-xs font-medium text-ink-400">
            {breadcrumb}
          </div>
        ) : null}

        <h1 className="font-display text-3xl font-semibold tracking-[-0.035em] text-ink-950 sm:text-[34px]">
          {title}
        </h1>

        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-600">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  )
}

export function StatCard({ label, value, hint }) {
  return (
    <Card
      className={cx(
        'group p-5',
        transition,
        'hover:-translate-y-px',
        'hover:shadow-[0_8px_24px_rgba(18,26,47,.075)]'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-400">
          {label}
        </p>

        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full bg-brand/70"
        />
      </div>

      <p className="mt-3 font-display text-[30px] font-semibold leading-none tracking-[-0.035em] text-ink-950 tabular">
        {value}
      </p>

      {hint ? (
        <p className="mt-2 text-[13px] leading-5 text-ink-600">
          {hint}
        </p>
      ) : null}
    </Card>
  )
}

export function EmptyState({
  title,
  description,
  action,
}) {
  return (
    <Card className="flex flex-col items-center px-6 py-16 text-center">
      <div className="relative mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-line bg-ink-50 text-ink-400 shadow-[0_1px_2px_rgba(18,26,47,.03)]">
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full bg-ink-300"
        />

        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-brand/70"
        />
      </div>

      <p className="font-display text-2xl font-semibold tracking-[-0.025em] text-ink-950">
        {title}
      </p>

      {description ? (
        <p className="mt-2 max-w-md text-sm leading-6 text-ink-600">
          {description}
        </p>
      ) : null}

      {action ? (
        <div className="mt-6">
          {action}
        </div>
      ) : null}
    </Card>
  )
}

export function ErrorState({
  title = 'Unable to load this page.',
  message,
  onRetry,
}) {
  return (
    <Card className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-red-200 bg-danger-bg text-danger shadow-[0_1px_2px_rgba(180,35,24,.05)]">
        <span className="text-lg font-bold leading-none">
          !
        </span>
      </div>

      <p className="font-display text-2xl font-semibold tracking-[-0.025em] text-ink-950">
        {title}
      </p>

      {message ? (
        <p className="mt-2 max-w-md text-sm leading-6 text-ink-600">
          {message}
        </p>
      ) : null}

      {onRetry ? (
        <Button
          className="mt-6"
          onClick={onRetry}
          variant="secondary"
        >
          Try again
        </Button>
      ) : null}
    </Card>
  )
}

export function Skeleton({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cx(
        'animate-pulse rounded-[9px]',
        'bg-gradient-to-r from-ink-100 via-white to-ink-100',
        'bg-[length:200%_100%]',
        className
      )}
    />
  )
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line bg-ink-50/60 px-4 py-3">
        <Skeleton className="h-3 w-28" />
      </div>

      <div className="grid gap-3 p-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4"
          >
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />

            <div className="min-w-0 flex-1">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="mt-2 h-3 w-1/4" />
            </div>

            <Skeleton className="h-7 w-20" />
          </div>
        ))}
      </div>
    </Card>
  )
}

export function Tabs({
  tabs,
  value,
  onChange,
}) {
  return (
    <div
      className="flex gap-1 overflow-x-auto border-b border-line"
      role="tablist"
      aria-label="Sections"
    >
      {tabs.map((tab) => {
        const active = value === tab.id

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={cx(
              'relative whitespace-nowrap px-4 py-3 text-sm font-medium',
              transition,
              focusRing,
              active
                ? 'text-ink-950'
                : 'text-ink-600 hover:text-ink-950'
            )}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}

            {active ? (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}