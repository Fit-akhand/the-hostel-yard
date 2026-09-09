import { Link } from 'react-router-dom'
import {
  EmptyState,
  ErrorState,
  StatusBadge,
  TableSkeleton,
} from '../ui'
import { cx } from '../../utils/format'
import { asArray } from '../../utils/collections'

export function DataTable({
  columns,
  rows,
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  emptyAction,
  rowTo,
  onRowClick,
}) {
  const safeRows = asArray(rows)
  const safeColumns = asArray(columns)

  if (loading) return <TableSkeleton />

  if (error) {
    return (
      <ErrorState
        message={error.message || String(error)}
        onRetry={onRetry}
      />
    )
  }

  if (!safeRows.length) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    )
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-hidden rounded-xl border border-line/80 bg-card shadow-[0_1px_2px_rgba(18,26,47,.03)] md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-ink-50/70">
              <tr>
                {safeColumns.map((col) => (
                  <th
                    key={col.key}
                    className="whitespace-nowrap border-b border-line px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400"
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {safeRows.map((row) => {
                const id = row._id || row.id

                const cells = safeColumns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-3.5 align-middle text-ink-800"
                  >
                    {col.render
                      ? col.render(row)
                      : row[col.key]}
                  </td>
                ))

                const className = cx(
                  'border-b border-line/70 last:border-b-0',
                  'transition-colors duration-150',
                  'hover:bg-ink-50/60',
                  onRowClick && 'cursor-pointer'
                )

                if (rowTo) {
                  return (
                    <tr key={id} className={className}>
                      <td
                        colSpan={safeColumns.length}
                        className="p-0"
                      >
                        <Link
                          to={rowTo(row)}
                          className="grid focus-visible:bg-ink-50"
                          style={{
                            gridTemplateColumns: `repeat(${safeColumns.length}, minmax(0, 1fr))`,
                          }}
                        >
                          {safeColumns.map((col) => (
                            <span
                              key={col.key}
                              className="px-4 py-3.5"
                            >
                              {col.render
                                ? col.render(row)
                                : row[col.key]}
                            </span>
                          ))}
                        </Link>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr
                    key={id}
                    className={className}
                    onClick={() => onRowClick?.(row)}
                  >
                    {cells}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile */}
      <div className="grid gap-3 md:hidden">
        {safeRows.map((row) => {
          const id = row._id || row.id

          const content = (
            <div
              className={cx(
                'rounded-xl border border-line/80 bg-card p-4',
                'shadow-[0_1px_2px_rgba(18,26,47,.03)]',
                'transition-all duration-200',
                'hover:border-ink-200 hover:shadow-md'
              )}
            >
              <div className="grid gap-3">
                {safeColumns.slice(0, 6).map((col) => (
                  <div
                    key={col.key}
                    className="flex items-start justify-between gap-4"
                  >
                    <span className="shrink-0 text-xs font-medium text-ink-400">
                      {col.header}
                    </span>

                    <span className="min-w-0 text-right text-sm font-medium text-ink-900">
                      {col.render
                        ? col.render(row)
                        : row[col.key]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )

          if (rowTo) {
            return (
              <Link key={id} to={rowTo(row)}>
                {content}
              </Link>
            )
          }

          return (
            <button
              key={id}
              type="button"
              className="w-full text-left"
              onClick={() => onRowClick?.(row)}
            >
              {content}
            </button>
          )
        })}
      </div>
    </>
  )
}

export { StatusBadge }