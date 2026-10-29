import { useChartColors } from '../../utils/chartColors'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

import {
  dashboardApi,
  propertyApi,
  reportApi,
  paymentApi,
  complaintApi,
  tenantApi,
  announcementApi,
  allocationApi,
} from '../../services/apis'

import { usePropertyStore } from '../../store/propertyStore'

import {
  Button,
  Card,
  ErrorState,
  PageHeader,
  Skeleton,
  StatCard,
  StatusBadge,
} from '../../components/ui'

import {
  formatINR,
  formatDate,
  occupancyLabel,
  nameOf,
} from '../../utils/format'

import { asArray } from '../../utils/collections'
import { can } from '../../config/authz'
import { PERMISSIONS } from '../../config/permissions'
import { useAuthStore } from '../../store/authStore'

/* -------------------------------------------------------------------------- */
/*                                   COLORS                                   */
/* -------------------------------------------------------------------------- */

const CHART_COLORS = {
  red: '#E11D2E',
  green: '#1F9D62',
  blue: '#2563EB',
  purple: '#7C3AED',
  orange: '#EA8A16',
  navy: '#18243D',
  muted: '#D9DEE7',
}

/* -------------------------------------------------------------------------- */
/*                                ICON SYSTEM                                 */
/* -------------------------------------------------------------------------- */

function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
  className = '',
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': true,
  }

  const icons = {
    building: (
      <>
        <path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5V21" />
        <path d="M8 8h1M8 12h1M8 16h1M15 8h1M15 12h1M15 16h1" />
        <path d="M3 21h18M10 21v-4h4v4" />
      </>
    ),

    room: (
      <>
        <path d="M4 18v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7" />
        <path d="M4 15h16M7 9V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
        <path d="M4 18v2M20 18v2" />
      </>
    ),

    bed: (
      <>
        <path d="M4 18v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7" />
        <path d="M4 14h16M7 9V7h4v2M4 18v2M20 18v2" />
      </>
    ),

    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
        <path d="M16 5.5a3 3 0 0 1 0 5.8M16 14a5 5 0 0 1 4.5 4" />
      </>
    ),

    wallet: (
      <>
        <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 16.5z" />
        <path d="M4 8h14a2 2 0 0 1 2 2v2h-5a2 2 0 0 0 0 4h5" />
        <path d="M15 14h.01" />
      </>
    ),

    money: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v10M15 9.5c-.7-.7-1.7-1-3-1-1.4 0-2.5.7-2.5 1.8 0 1.2 1.1 1.7 2.5 2.1 1.5.4 2.5.9 2.5 2.1s-1.1 1.9-2.6 1.9c-1.3 0-2.4-.4-3.1-1.1" />
      </>
    ),

    receipt: (
      <>
        <path d="M6 3h12v18l-2.5-1.7L13 21l-2.5-1.7L8 21l-2-1.7z" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </>
    ),

    alert: (
      <>
        <path d="M12 4l8 15H4z" />
        <path d="M12 9v4M12 16h.01" />
      </>
    ),

    chart: (
      <>
        <path d="M4 19V5M4 19h16" />
        <path d="M7 15v-4M11 15V8M15 15v-7M19 15v-10" />
      </>
    ),

    arrowUp: (
      <>
        <path d="M5 15l7-7 7 7" />
      </>
    ),

    arrowRight: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),

    calendar: (
      <>
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M7 3v4M17 3v4M3.5 9h17" />
      </>
    ),

    megaphone: (
      <>
        <path d="M4 14h3l9 4V6l-9 4H4z" />
        <path d="M7 14l1.5 5" />
        <path d="M19 9.5a4 4 0 0 1 0 5" />
      </>
    ),

    complaint: (
      <>
        <path d="M5 5h14v11H9l-4 4z" />
        <path d="M9 9h6M9 12h4" />
      </>
    ),

    home: (
      <>
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),

    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L6 17l.1-.1A1.7 1.7 0 0 0 6.4 15a1.7 1.7 0 0 0-1.5-1H4.7v-2.4h.2a1.7 1.7 0 0 0 1.5-1A1.7 1.7 0 0 0 6.1 9L6 8.9l1.7-1.7.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h2.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 9l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v2.4h-.2a1.7 1.7 0 0 0-1.5.6z" />
      </>
    ),
  }

  return <svg {...common}>{icons[name] || icons.chart}</svg>
}

/* -------------------------------------------------------------------------- */
/*                              HELPER COMPONENTS                             */
/* -------------------------------------------------------------------------- */

function IconBox({ icon, tone = 'red' }) {
  const tones = {
    red: 'bg-brand-soft text-brand',
    green: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-violet-50 text-violet-600',
    orange: 'bg-orange-50 text-orange-600',
    navy: 'bg-slate-100 text-ink-950',
  }

  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tones[tone]}`}
    >
      <Icon name={icon} size={23} />
    </div>
  )
}

function PremiumStat({
  label,
  value,
  hint,
  icon,
  tone = 'red',
  trend,
}) {
  const trendPositive = trend?.positive !== false

  return (
    <Card className="group relative overflow-hidden border-line/70 bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-line hover:shadow-[0_12px_32px_rgba(18,26,47,.07)]">
      <div className="flex items-start justify-between gap-3">
        <IconBox icon={icon} tone={tone} />

        {trend ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
              trendPositive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-brand-soft text-red-600'
            }`}
          >
            <Icon name="arrowUp" size={12} />
            {trend.value}
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-xs font-medium text-ink-500">{label}</p>

      <p className="mt-1 font-display text-[28px] font-semibold tracking-tight text-ink-950 tabular">
        {value}
      </p>

      {hint ? (
        <p className="mt-1 text-xs text-ink-400">{hint}</p>
      ) : null}

      <div
        className={`absolute -bottom-10 -right-10 h-24 w-24 rounded-full opacity-[0.07] ${
          tone === 'green'
            ? 'bg-emerald-500'
            : tone === 'blue'
              ? 'bg-blue-500'
              : tone === 'purple'
                ? 'bg-violet-500'
                : tone === 'orange'
                  ? 'bg-orange-500'
                  : 'bg-red-500'
        }`}
      />
    </Card>
  )
}

function SectionHeader({ title, description, to }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="font-display text-[19px] font-semibold text-ink-950">
          {title}
        </h2>

        {description ? (
          <p className="mt-0.5 text-xs text-ink-400">{description}</p>
        ) : null}
      </div>

      {to ? (
        <Link
          to={to}
          className="group inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand-soft"
        >
          View all
          <Icon
            name="arrowRight"
            size={13}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                              MAIN DASHBOARD                                */
/* -------------------------------------------------------------------------- */

export function DashboardPage() {
  const chart = useChartColors()
  const user = useAuthStore((s) => s.user)

  const propertyId =
    usePropertyStore((s) => s.currentPropertyId) || undefined

  const overview = useQuery({
    queryKey: ['dashboard', 'overview', propertyId || ''],
    queryFn: () =>
      dashboardApi.overview(propertyId ? { propertyId } : {}),
  })

  const propertyList = useQuery({
    queryKey: ['properties'],
    queryFn: propertyApi.list,
    staleTime: 60_000,
  })

  const occupancyReport = useQuery({
    queryKey: ['reports', 'occupancy', propertyId || ''],
    queryFn: () =>
      reportApi.occupancy(propertyId ? { propertyId } : {}),
    enabled: can(user, PERMISSIONS.VIEW_ROOMS),
  })

  const payments = useQuery({
    queryKey: ['payments', { status: 'PENDING' }],
    queryFn: () => paymentApi.list({ status: 'PENDING' }),
    enabled: can(user, PERMISSIONS.VIEW_PAYMENTS),
  })

  const complaints = useQuery({
    queryKey: ['complaints', { status: 'OPEN' }],
    queryFn: () =>
      complaintApi.list({
        status: 'OPEN',
        ...(propertyId ? { propertyId } : {}),
      }),
    enabled: can(user, PERMISSIONS.VIEW_COMPLAINTS),
  })

  const noticeTenants = useQuery({
    queryKey: ['tenants', { status: 'NOTICE_PERIOD', propertyId }],
    queryFn: () =>
      tenantApi.list({
        status: 'NOTICE_PERIOD',
        ...(propertyId ? { propertyId } : {}),
      }),
    enabled: can(user, PERMISSIONS.VIEW_TENANTS),
  })

  const announcements = useQuery({
    queryKey: ['announcements', { propertyId }],
    queryFn: () =>
      announcementApi.list(propertyId ? { propertyId } : {}),
  })

  const allocations = useQuery({
    queryKey: ['allocations', propertyId],
    queryFn: () =>
      allocationApi.list(propertyId ? { propertyId } : {}),
    enabled: can(user, PERMISSIONS.VIEW_ALLOCATIONS),
  })

  /* ---------------------------------------------------------------------- */
  /*                                LOADING                                 */
  /* ---------------------------------------------------------------------- */

  if (overview.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="hidden h-10 w-36 sm:block" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-80 rounded-2xl xl:col-span-2" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (overview.isError) {
    return (
      <ErrorState
        message={overview.error.message}
        onRetry={() => overview.refetch()}
      />
    )
  }

  const d = overview.data || {}
  const occ = d.occupancy
  const rent = d.rent

  const pie = occ
    ? [
        {
          name: 'Occupied',
          value: occ.occupiedBeds || 0,
        },
        {
          name: 'Available',
          value: occ.availableBeds || 0,
        },
      ]
    : []

  const rentBars = rent
    ? [
        {
          name: 'Pending',
          amount: rent.pending || 0,
        },
        {
          name: 'Partial',
          amount: rent.partial || 0,
        },
        {
          name: 'Paid',
          amount: rent.paid || 0,
        },
      ]
    : []

  const verified = d.payments?.verified?.amount || 0
  const expenses = d.expenses?.total || 0

  const financeBars = [
    {
      name: 'Collected',
      amount: verified,
    },
    {
      name: 'Expenses',
      amount: expenses,
    },
    {
      name: 'Net',
      amount: verified - expenses,
    },
  ]

  const propertyNames = new Map(
    asArray(propertyList.data).map((p) => [p._id, p.name])
  )

  const propertyPerf = asArray(occupancyReport.data)
    .map((row) => ({
      name: propertyNames.get(row.property) || 'Property',
      occupancy: row.occupancyPercentage || 0,
      occupied: row.occupiedBeds || 0,
      total: row.totalBeds || 0,
    }))
    .sort((a, b) => b.occupancy - a.occupancy)

  /* ---------------------------------------------------------------------- */
  /*                              GREETING                                  */
  /* ---------------------------------------------------------------------- */

  const firstName =
    user?.name?.split?.(' ')?.[0] ||
    user?.firstName ||
    'there'

  const roleLabel = user?.role
    ? String(user.role)
        .replaceAll('_', ' ')
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : 'Admin'

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* HEADER                                                              */}
      {/* ------------------------------------------------------------------ */}

      <PageHeader
        title={`Good morning, ${firstName}! 👋`}
        description={`Here's what's happening across your properties today.`}
        actions={
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-card px-3.5 text-sm font-medium text-ink-800 shadow-sm transition-colors hover:bg-ink-50"
          >
            <Icon name="calendar" size={17} />
            <span>Today</span>
          </button>
        }
      />

      {/* ------------------------------------------------------------------ */}
      {/* CONTEXT BAR                                                        */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-navy-900 px-3 py-1.5 font-medium text-white">
          {roleLabel}
        </span>

        {propertyId ? (
          <span className="rounded-full bg-brand-soft px-3 py-1.5 font-medium text-brand">
            Property selected
          </span>
        ) : (
          <span className="rounded-full bg-ink-100 px-3 py-1.5 font-medium text-ink-600">
            All properties
          </span>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* PRIMARY KPI CARDS                                                  */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PremiumStat
          label="Total properties"
          value={d.properties?.total ?? 0}
          hint="Across your portfolio"
          icon="building"
          tone="blue"
        />

        <PremiumStat
          label="Total rooms"
          value={d.rooms?.total ?? '—'}
          hint={`${d.rooms?.beds ?? occ?.totalBeds ?? '—'} total beds`}
          icon="room"
          tone="green"
        />

        <PremiumStat
          label="Occupancy"
          value={occupancyLabel(occ?.occupancyPercentage)}
          hint={`${occ?.occupiedBeds ?? 0} occupied · ${occ?.availableBeds ?? 0} available`}
          icon="bed"
          tone="purple"
        />

        <PremiumStat
          label="Active tenants"
          value={d.tenants?.active ?? '—'}
          hint="Currently staying"
          icon="users"
          tone="orange"
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FINANCIAL KPI CARDS                                                */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PremiumStat
          label="Outstanding rent"
          value={rent ? formatINR(rent.outstanding) : '—'}
          hint="Pending collection"
          icon="receipt"
          tone="red"
        />

        <PremiumStat
          label="Collected"
          value={d.payments ? formatINR(verified) : '—'}
          hint="Verified payments"
          icon="wallet"
          tone="green"
        />

        <PremiumStat
          label="This month expenses"
          value={d.expenses ? formatINR(expenses) : '—'}
          hint="Active expenses"
          icon="money"
          tone="orange"
        />

        <PremiumStat
          label="Net position"
          value={formatINR(verified - expenses)}
          hint="Collected minus expenses"
          icon="chart"
          tone="blue"
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CHARTS                                                             */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Occupancy */}
        <Card className="p-5 xl:col-span-1">
          <SectionHeader
            title="Occupancy overview"
            description="Current bed utilisation"
            to="/rooms"
          />

          {pie.some((item) => item.value) ? (
            <div className="relative h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={68}
                    outerRadius={94}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {pie.map((_, index) => (
                      <Cell
                        key={index}
                        fill={
                          index === 0
                            ? CHART_COLORS.red
                            : CHART_COLORS.muted
                        }
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid var(--color-line)',
                      background: 'var(--color-paper)',
                      color: 'var(--color-ink-950)',
                      boxShadow:
                        '0 8px 24px rgba(18,26,47,.08)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="font-display text-3xl font-semibold text-ink-950">
                    {occupancyLabel(occ?.occupancyPercentage)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    occupied
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-ink-400">
              No occupancy data for this view.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
            <div className="rounded-xl bg-brand-soft p-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                <span className="text-xs text-ink-600">Occupied</span>
              </div>
              <p className="mt-1 text-lg font-semibold text-ink-950">
                {occ?.occupiedBeds ?? 0}
              </p>
            </div>

            <div className="rounded-xl bg-ink-50 p-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-ink-300" />
                <span className="text-xs text-ink-600">Available</span>
              </div>
              <p className="mt-1 text-lg font-semibold text-ink-950">
                {occ?.availableBeds ?? 0}
              </p>
            </div>
          </div>
        </Card>

        {/* Rent collection */}
        <Card className="p-5 xl:col-span-2">
          <SectionHeader
            title="Rent collection"
            description="Current collection status"
            to="/rent"
          />

          {rent ? (
            <div className="h-[315px]">
              <ResponsiveContainer>
                <BarChart
                  data={rentBars}
                  margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 0,
                  }}
                  barCategoryGap="28%"
                >
                  <CartesianGrid
                    vertical={false}
                    stroke={chart.line}
                    strokeDasharray="4 4"
                  />

                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: chart.text,
                      fontSize: 11,
                    }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: chart.text,
                      fontSize: 11,
                    }}
                    tickFormatter={(value) =>
                      value >= 1000
                        ? `₹${Math.round(value / 1000)}k`
                        : `₹${value}`
                    }
                  />

                  <Tooltip
                    cursor={{ fill: '#F8F7F4' }}
                    formatter={(value) => formatINR(value)}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid var(--color-line)',
                      background: 'var(--color-paper)',
                      color: 'var(--color-ink-950)',
                      boxShadow:
                        '0 8px 24px rgba(18,26,47,.08)',
                    }}
                  />

                  <Bar
                    dataKey="amount"
                    radius={[8, 8, 3, 3]}
                  >
                    {rentBars.map((_, index) => (
                      <Cell
                        key={index}
                        fill={[
                          CHART_COLORS.red,
                          CHART_COLORS.orange,
                          CHART_COLORS.green,
                        ][index]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-20 text-center text-sm text-ink-400">
              Rent figures are unavailable for your permissions.
            </p>
          )}
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FINANCE + PROPERTY PERFORMANCE                                     */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <SectionHeader
            title="Collection vs expenses"
            description="Verified revenue compared with expenses"
          />

          <div className="h-72">
            <ResponsiveContainer>
              <BarChart
                data={financeBars}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 0,
                }}
                barCategoryGap="30%"
              >
                <CartesianGrid
                  vertical={false}
                  stroke={chart.line}
                  strokeDasharray="4 4"
                />

                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: chart.text,
                    fontSize: 11,
                  }}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: chart.text,
                    fontSize: 11,
                  }}
                  tickFormatter={(value) =>
                    value >= 1000
                      ? `₹${Math.round(value / 1000)}k`
                      : `₹${value}`
                  }
                />

                <Tooltip
                  formatter={(value) => formatINR(value)}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid var(--color-line)',
                      background: 'var(--color-paper)',
                      color: 'var(--color-ink-950)',
                    boxShadow:
                      '0 8px 24px rgba(18,26,47,.08)',
                  }}
                />

                <Bar dataKey="amount" radius={[8, 8, 3, 3]}>
                  {financeBars.map((_, index) => (
                    <Cell
                      key={index}
                      fill={[
                        CHART_COLORS.green,
                        CHART_COLORS.red,
                        CHART_COLORS.blue,
                      ][index]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader
            title="Property performance"
            description="Occupancy by property"
            to="/properties"
          />

          {propertyPerf.length ? (
            <div style={{ height: Math.max(288, propertyPerf.length * 34) }}>
              <ResponsiveContainer>
                <BarChart
                  data={propertyPerf}
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 20,
                    left: 5,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    horizontal={false}
                    stroke={chart.line}
                    strokeDasharray="4 4"
                  />

                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: chart.text,
                      fontSize: 11,
                    }}
                    tickFormatter={(value) => `${value}%`}
                  />

                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (String(v).length > 22 ? `${String(v).slice(0, 21)}…` : v)}
                    tick={{
                      fill: chart.text,
                      fontSize: 11,
                    }}
                  />

                  <Tooltip
                    formatter={(value, _name, item) => [`${value}% (${item.payload.occupied}/${item.payload.total} beds)`, 'Occupancy']}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid var(--color-line)',
                      background: 'var(--color-paper)',
                      color: 'var(--color-ink-950)',
                      boxShadow:
                        '0 8px 24px rgba(18,26,47,.08)',
                    }}
                  />

                  <Bar
                    dataKey="occupancy"
                    fill={CHART_COLORS.blue}
                    radius={[0, 8, 8, 0]}
                    barSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-20 text-center text-sm text-ink-400">
              Occupancy report is empty.
            </p>
          )}
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* ACTIVITY GRID                                                      */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Widget
          title="Pending payments"
          description="Payments awaiting verification"
          to="/payments"
          icon="wallet"
          tone="green"
        >
          {asArray(payments.data)
            .slice(0, 5)
            .map((payment) => (
              <Row
                key={payment._id}
                left={nameOf(payment.tenant, 'Tenant')}
                right={formatINR(payment.amount)}
                meta={formatDate(payment.paymentDate)}
                tone="green"
              />
            ))}

          {!payments.data?.length ? (
            <EmptyLine text="No pending payments." />
          ) : null}
        </Widget>

        <Widget
          title="Open complaints"
          description="Issues that need attention"
          to="/complaints"
          icon="complaint"
          tone="red"
        >
          {asArray(complaints.data)
            .slice(0, 5)
            .map((complaint) => (
              <Row
                key={complaint._id}
                left={complaint.title}
                right={
                  <StatusBadge status={complaint.priority} />
                }
                meta={formatDate(complaint.createdAt)}
                tone="red"
              />
            ))}

          {!complaints.data?.length ? (
            <EmptyLine text="No open complaints." />
          ) : null}
        </Widget>

        <Widget
          title="Upcoming move-outs"
          description="Tenants currently in notice period"
          to="/tenants"
          icon="users"
          tone="orange"
        >
          {asArray(noticeTenants.data)
            .slice(0, 5)
            .map((tenant) => (
              <Row
                key={tenant._id}
                left={tenant.name}
                right={formatDate(
                  tenant.expectedMoveOutDate
                )}
                meta={nameOf(tenant.property)}
                tone="orange"
              />
            ))}

          {!noticeTenants.data?.length ? (
            <EmptyLine text="No tenants in notice period." />
          ) : null}
        </Widget>

        <Widget
          title="Recent announcements"
          description="Latest property communication"
          to="/announcements"
          icon="megaphone"
          tone="purple"
        >
          {asArray(announcements.data)
            .slice(0, 5)
            .map((announcement) => (
              <Row
                key={announcement._id}
                left={announcement.title}
                right={
                  <StatusBadge
                    status={announcement.status}
                  />
                }
                meta={formatDate(announcement.createdAt)}
                tone="purple"
              />
            ))}

          {!announcements.data?.length ? (
            <EmptyLine text="No announcements yet." />
          ) : null}
        </Widget>

        <Widget
          title="Active allocations"
          description="Current room and bed assignments"
          to="/allocations"
          icon="bed"
          tone="blue"
        >
          {asArray(allocations.data)
            .filter((allocation) => allocation.status === 'ACTIVE')
            .slice(0, 5)
            .map((allocation) => (
              <Row
                key={allocation._id}
                left={nameOf(
                  allocation.tenant,
                  'Tenant'
                )}
                right={
                  allocation.bed?.bedNumber ||
                  nameOf(allocation.bed, 'Bed')
                }
                meta={nameOf(allocation.property)}
                tone="blue"
              />
            ))}

          {!allocations.data?.length ? (
            <EmptyLine text="No active allocations." />
          ) : null}
        </Widget>

        <Widget
          title="Recent tenant activity"
          description="Latest tenant records"
          to="/tenants"
          icon="users"
          tone="navy"
        >
          {asArray(noticeTenants.data)
            .slice(0, 3)
            .map((tenant) => (
              <Row
                key={tenant._id}
                left={tenant.name}
                right={<StatusBadge status={tenant.status} />}
                tone="navy"
              />
            ))}

          <Link
            to="/tenants"
            className="group mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand"
          >
            Open tenant register
            <Icon
              name="arrowRight"
              size={14}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </Widget>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* QUICK SUMMARY                                                      */}
      {/* ------------------------------------------------------------------ */}

      <Card className="overflow-hidden border-brand/15 bg-gradient-to-r from-brand-soft/70 via-card to-card">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-card text-brand shadow-sm">
              <Icon name="alert" size={21} />
            </div>

            <div>
              <p className="font-semibold text-ink-950">
                Dashboard summary
              </p>

              <p className="mt-0.5 text-sm text-ink-600">
                {occ?.occupancyPercentage != null
                  ? `${occupancyLabel(
                      occ.occupancyPercentage
                    )} occupancy across your current view.`
                  : 'Your property overview is ready.'}
              </p>
            </div>
          </div>

          <Link to="/reports">
            <Button variant="secondary" size="sm">
              <Icon name="chart" size={16} />
              View reports
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  WIDGET                                    */
/* -------------------------------------------------------------------------- */

function Widget({
  title,
  description,
  to,
  icon,
  tone = 'red',
  children,
}) {
  return (
    <Card className="p-5 transition-shadow duration-200 hover:shadow-[0_10px_30px_rgba(18,26,47,.05)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <IconBox icon={icon} tone={tone} />

          <div className="min-w-0">
            <h2 className="truncate font-display text-[18px] font-semibold text-ink-950">
              {title}
            </h2>

            {description ? (
              <p className="mt-0.5 truncate text-xs text-ink-400">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {to ? (
          <Link
            to={to}
            className="shrink-0 text-xs font-semibold text-brand hover:underline"
          >
            View all
          </Link>
        ) : null}
      </div>

      <div className="grid gap-0">{children}</div>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/*                                    ROW                                     */
/* -------------------------------------------------------------------------- */

function Row({ left, right, meta, tone = 'red' }) {
  const dotTones = {
    red: 'bg-brand',
    green: 'emerald-500',
    blue: 'blue-500',
    purple: 'violet-500',
    orange: 'orange-500',
    navy: 'navy-900',
  }

  const dotClass =
    tone === 'green'
      ? 'bg-emerald-500'
      : tone === 'blue'
        ? 'bg-blue-500'
        : tone === 'purple'
          ? 'bg-violet-500'
          : tone === 'orange'
            ? 'bg-orange-500'
            : tone === 'navy'
              ? 'bg-navy-900'
              : 'bg-brand'

  return (
    <div className="group flex items-center gap-3 border-b border-line/70 py-3 last:border-0">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink-950">
          {left}
        </p>

        {meta ? (
          <p className="mt-0.5 truncate text-xs text-ink-400">
            {meta}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 text-right text-sm font-semibold text-ink-800 tabular">
        {right}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                EMPTY LINE                                 */
/* -------------------------------------------------------------------------- */

function EmptyLine({ text }) {
  return (
    <div className="rounded-xl bg-ink-50 px-4 py-5 text-center text-sm text-ink-400">
      {text}
    </div>
  )
}