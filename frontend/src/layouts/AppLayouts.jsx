import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import {
  BarChart3,
  Bell,
  BedDouble,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareWarning,
  Receipt,
  Search,
  Settings2,
  UserCog,
  UserRound,
  Users,
  UtensilsCrossed,
  WalletCards,
  X,
} from 'lucide-react'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { useAuthStore } from '../store/authStore'
import { usePropertyStore } from '../store/propertyStore'
import { NAV_GROUPS, TENANT_NAV } from '../config/navigation'
import { canAccessNavItem } from '../config/authz'
import { ROLES } from '../config/permissions'
import {
  notificationApi,
  propertyApi,
  dashboardApi,
} from '../services/apis'
import { initials, nameOf } from '../utils/format'
import { asArray, asNumber } from '../utils/collections'
import { Button } from '../components/ui'
import { ErrorBoundary } from '../app/ErrorBoundary'

/* =========================================================
   BRAND
========================================================= */

function Brand({ compact = false, dark = false }) {
  return (
    <Link
      to="/"
      className={[
        'group flex items-center',
        compact ? 'justify-center' : 'gap-3',
      ].join(' ')}
      aria-label="The Hostel Yard"
    >
      <div
        className={[
          'flex h-10 w-10 shrink-0 items-center justify-center',
          'overflow-hidden rounded-xl',
          'bg-white ring-1 ring-black/[0.06]',
          'shadow-[0_2px_10px_rgba(0,0,0,.06)]',
          'transition-transform duration-200',
          'group-hover:scale-[1.03]',
        ].join(' ')}
      >
        <img
          src="/logo.png"
          alt="The Hostel Yard"
          className="h-full w-full object-contain p-1.5"
        />
      </div>

      {!compact ? (
        <div className="min-w-0">
          <span
            className={[
              'block truncate text-[15px] font-extrabold',
              'uppercase tracking-[0.025em]',
              dark ? 'text-white' : 'text-gray-950',
            ].join(' ')}
          >
            The Hostel Yard
          </span>

          <span
            className={[
              'mt-0.5 block text-[10px] font-medium',
              'uppercase tracking-[0.18em]',
              dark ? 'text-white/40' : 'text-gray-400',
            ].join(' ')}
          >
            Property operations
          </span>
        </div>
      ) : null}
    </Link>
  )
}

/* =========================================================
   NAVIGATION
========================================================= */

function navClass(active) {
  return [
    'group relative flex items-center gap-3',
    'rounded-xl px-3 py-2.5',
    'text-[13px] font-semibold',
    'transition-all duration-150 ease-out',
    active
      ? [
          'bg-[#E92323] text-white',
          'shadow-[0_6px_18px_rgba(233,35,35,.16)]',
        ].join(' ')
      : [
          'text-gray-500',
          'hover:bg-gray-100/80',
          'hover:text-gray-950',
        ].join(' '),
  ].join(' ')
}

function NavIcon({ item }) {
  const label = String(item.label || '').toLowerCase()

  const props = {
    size: 17,
    strokeWidth: 1.9,
    'aria-hidden': true,
  }

  if (label.includes('dashboard')) return <LayoutDashboard {...props} />

  if (
    label === 'properties' ||
    label.includes('property')
  ) {
    return <Building2 {...props} />
  }

  if (label.includes('rooms')) return <BedDouble {...props} />
  if (label.includes('beds')) return <BedDouble {...props} />
  if (label.includes('tenant')) return <Users {...props} />
  if (label.includes('manager')) return <UserCog {...props} />
  if (label.includes('staff')) return <Users {...props} />
  if (label.includes('allocation')) return <ClipboardList {...props} />
  if (label.includes('booking')) return <CalendarDays {...props} />
  if (label.includes('rent')) return <CircleDollarSign {...props} />
  if (label.includes('payment')) return <CreditCard {...props} />
  if (label.includes('expense')) return <Receipt {...props} />
  if (label.includes('complaint')) {
    return <MessageSquareWarning {...props} />
  }
  if (label.includes('announcement')) return <Megaphone {...props} />
  if (label.includes('notification')) return <Bell {...props} />
  if (label.includes('document')) return <FileText {...props} />
  if (label.includes('agreement')) return <FileText {...props} />
  if (label.includes('report')) return <BarChart3 {...props} />
  if (label.includes('food')) return <UtensilsCrossed {...props} />
  if (label.includes('setting')) return <Settings2 {...props} />
  if (label.includes('profile')) return <UserRound {...props} />
  if (label.includes('finance')) return <WalletCards {...props} />

  return <ClipboardList {...props} />
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

function NotificationButton({ to, count }) {
  const numericCount = asNumber(count)

  return (
    <Link
      to={to}
      className={[
        'relative flex h-10 w-10 items-center justify-center',
        'rounded-xl border border-gray-200 bg-white',
        'text-gray-500',
        'shadow-[0_1px_2px_rgba(0,0,0,.02)]',
        'transition-all duration-150',
        'hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950',
      ].join(' ')}
      aria-label="Notifications"
    >
      <Bell size={18} strokeWidth={1.8} />

      {numericCount > 0 ? (
        <span
          className={[
            'absolute -right-1 -top-1',
            'flex min-h-5 min-w-5 items-center justify-center',
            'rounded-full border-2 border-white',
            'bg-[#E92323] px-1',
            'text-[10px] font-bold leading-none text-white',
          ].join(' ')}
        >
          {numericCount > 9 ? '9+' : numericCount}
        </span>
      ) : null}
    </Link>
  )
}

/* =========================================================
   USER AVATAR
========================================================= */

function UserAvatar({ user, dark = false }) {
  return (
    <div
      className={[
        'flex h-10 w-10 shrink-0 items-center justify-center',
        'rounded-full text-xs font-bold',
        dark
          ? 'bg-gray-950 text-white'
          : 'bg-red-50 text-[#E92323]',
      ].join(' ')}
    >
      {initials(user?.name)}
    </div>
  )
}

/* =========================================================
   PROPERTY SELECTOR
========================================================= */

function PropertySelector({
  properties,
  currentPropertyId,
  setCurrentPropertyId,
  loading,
  error,
  onRetry,
}) {
  return (
    <div className="px-4 pb-4">
      <div className="mb-2 flex items-center justify-between">
        <label
          htmlFor="current-property"
          className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400"
        >
          Workspace
        </label>

        {properties.length > 1 ? (
          <span className="text-[10px] font-medium text-gray-400">
            {properties.length} properties
          </span>
        ) : null}
      </div>

      <div className="relative">
        <Building2
          size={15}
          strokeWidth={1.8}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <select
          id="current-property"
          value={currentPropertyId}
          onChange={(e) => setCurrentPropertyId(e.target.value)}
          disabled={loading}
          aria-label="Current property"
          className={[
            'h-11 w-full appearance-none',
            'rounded-xl border border-gray-200',
            'bg-gray-50/80',
            'pl-10 pr-9',
            'text-sm font-semibold text-gray-900',
            'outline-none',
            'transition-all duration-150',
            'hover:border-gray-300 hover:bg-white',
            'focus:border-[#E92323]',
            'focus:bg-white',
            'focus:ring-4 focus:ring-[#E92323]/10',
            'disabled:cursor-not-allowed disabled:opacity-50',
          ].join(' ')}
        >
          <option value="">All properties</option>

          {properties.map((property) => (
            <option
              key={property._id || property.id}
              value={property._id || property.id}
            >
              {property.name}
            </option>
          ))}
        </select>

        <ChevronDown
          size={15}
          strokeWidth={1.8}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </div>

      {error ? (
        <p className="mt-2 text-xs leading-5 text-red-600">
          Unable to load properties.{' '}
          <button
            type="button"
            className="font-semibold underline underline-offset-2"
            onClick={onRetry}
          >
            Retry
          </button>
        </p>
      ) : null}
    </div>
  )
}

/* =========================================================
   SIDEBAR
========================================================= */

function Sidebar({
  user,
  groups,
  properties,
  currentPropertyId,
  setCurrentPropertyId,
  propertiesLoading,
  propertiesError,
  onRetryProperties,
  logout,
  navigate,
  onNavigate,
  tenant = false,
}) {
  return (
    <div className="flex h-full flex-col bg-white">
      {/* Brand */}
      <div className="border-b border-gray-100 px-5 py-5">
        <Brand />
      </div>

      {!tenant ? (
        <div className="border-b border-gray-100 pt-4">
          <PropertySelector
            properties={properties}
            currentPropertyId={currentPropertyId}
            setCurrentPropertyId={setCurrentPropertyId}
            loading={propertiesLoading}
            error={propertiesError}
            onRetry={onRetryProperties}
          />
        </div>
      ) : (
        <div className="px-4 py-5">
          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
            <div className="flex items-center gap-3">
              <UserAvatar user={user} dark />

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-950">
                  {user?.name}
                </p>

                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                  Resident
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4"
        aria-label={tenant ? 'Resident navigation' : 'Main navigation'}
      >
        {!tenant ? (
          groups.map((group) => (
            <div key={group.id} className="mb-5 last:mb-0">
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                {group.label}
              </p>

              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      navClass(isActive)
                    }
                    onClick={onNavigate}
                  >
                    {({ isActive }) => (
                      <>
                        <NavIcon item={item} />

                        <span className="min-w-0 flex-1 truncate">
                          {item.label}
                        </span>

                        {isActive ? (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                        ) : null}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))
        ) : (
          <>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Resident portal
            </p>

            <div className="space-y-0.5">
              {TENANT_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/tenant'}
                  className={({ isActive }) =>
                    navClass(isActive)
                  }
                  onClick={onNavigate}
                >
                  {({ isActive }) => (
                    <>
                      <NavIcon item={item} />

                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>

                      {isActive ? (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                      ) : null}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* User / Sign out */}
      <div className="border-t border-gray-100 p-4">
        {!tenant ? (
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-gray-50 p-2.5">
            <UserAvatar user={user} dark />

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-950">
                {user?.name}
              </p>

              <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                {user?.role?.replaceAll('_', ' ')}
              </p>
            </div>
          </div>
        ) : null}

        <Button
          variant="ghost"
          className={[
            'w-full justify-start gap-3 rounded-xl',
            'text-gray-500',
            'hover:bg-gray-100 hover:text-gray-950',
          ].join(' ')}
          onClick={async () => {
            await logout()
            navigate('/login')
          }}
        >
          <LogOut size={16} strokeWidth={1.8} />
          Sign out
        </Button>
      </div>
    </div>
  )
}

/* =========================================================
   DASHBOARD LAYOUT
========================================================= */

export function DashboardLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const navigate = useNavigate()
  const location = useLocation()

  const [open, setOpen] = useState(false)

  const currentPropertyId = usePropertyStore(
    (s) => s.currentPropertyId
  )

  const setCurrentPropertyId = usePropertyStore(
    (s) => s.setCurrentPropertyId
  )

  const canListProperties = [
    ROLES.BUSINESS_OWNER,
    ROLES.LANDLORD,
    ROLES.PROPERTY_MANAGER,
  ].includes(user?.role)

  const propertiesQuery = useQuery({
    queryKey: ['properties'],
    queryFn: propertyApi.list,
    enabled: canListProperties,
  })

  const dashboardPropsQuery = useQuery({
    queryKey: ['dashboard', 'overview', ''],
    queryFn: () => dashboardApi.overview({}),
    enabled: user?.role === ROLES.STAFF,
  })

  const properties = useMemo(() => {
    if (canListProperties) {
      return asArray(propertiesQuery.data, 'properties')
    }

    return asArray(
      dashboardPropsQuery.data?.properties?.items
    )
  }, [
    canListProperties,
    propertiesQuery.data,
    dashboardPropsQuery.data,
  ])

  useEffect(() => {
    if (!properties.length) return

    const exists = properties.some(
      (property) =>
        (property._id || property.id) === currentPropertyId
    )

    if (!exists) {
      setCurrentPropertyId('')
    }
  }, [
    properties,
    currentPropertyId,
    setCurrentPropertyId,
  ])

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: notificationApi.unreadCount,
    refetchInterval: 60000,
  })

  const groups = NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        canAccessNavItem(user, item)
      ),
    }))
    .filter((group) => group.items.length)

  const crumbs = location.pathname
    .split('/')
    .filter(Boolean)
    .map((part, index, array) => ({
      label: part.replaceAll('-', ' '),
      to: '/' + array.slice(0, index + 1).join('/'),
    }))

  const selectedProperty = properties.find(
    (property) =>
      (property._id || property.id) === currentPropertyId
  )

  return (
    <div className="min-h-screen bg-[#F7F7F8]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-gray-200 bg-white lg:block">
        <Sidebar
          user={user}
          groups={groups}
          properties={properties}
          currentPropertyId={currentPropertyId}
          setCurrentPropertyId={setCurrentPropertyId}
          propertiesLoading={
            canListProperties
              ? propertiesQuery.isLoading
              : dashboardPropsQuery.isLoading
          }
          propertiesError={
            canListProperties
              ? propertiesQuery.isError
              : false
          }
          onRetryProperties={() =>
            propertiesQuery.refetch()
          }
          logout={logout}
          navigate={navigate}
        />
      </aside>

      {/* Mobile sidebar */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-gray-950/45 backdrop-blur-[3px]"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />

          <div className="relative h-full w-[285px] border-r border-gray-200 bg-white shadow-2xl">
            <Sidebar
              user={user}
              groups={groups}
              properties={properties}
              currentPropertyId={currentPropertyId}
              setCurrentPropertyId={setCurrentPropertyId}
              propertiesLoading={
                canListProperties
                  ? propertiesQuery.isLoading
                  : dashboardPropsQuery.isLoading
              }
              propertiesError={
                canListProperties
                  ? propertiesQuery.isError
                  : false
              }
              onRetryProperties={() =>
                propertiesQuery.refetch()
              }
              logout={logout}
              navigate={navigate}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-[264px]">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-gray-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className={[
                'flex h-10 w-10 shrink-0 items-center justify-center',
                'rounded-xl border border-gray-200',
                'bg-white text-gray-600',
                'transition hover:bg-gray-50 hover:text-gray-950',
                'lg:hidden',
              ].join(' ')}
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} strokeWidth={1.8} />
            </button>

            {/* Search */}
            <div className="relative hidden min-w-0 flex-1 md:block">
              <Search
                size={17}
                strokeWidth={1.8}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                className={[
                  'h-10 w-full max-w-xl',
                  'rounded-xl border border-gray-200',
                  'bg-gray-50/70',
                  'pl-10 pr-4',
                  'text-sm text-gray-900',
                  'outline-none',
                  'transition-all duration-150',
                  'placeholder:text-gray-400',
                  'focus:border-gray-300',
                  'focus:bg-white',
                  'focus:ring-4 focus:ring-gray-100',
                ].join(' ')}
                placeholder="Search tenants, rooms, payments..."
                readOnly
                onFocus={() => navigate('/tenants')}
                aria-label="Search operations"
              />
            </div>

            <div className="ml-auto flex items-center gap-3">
              <NotificationButton
                to="/notifications"
                count={unreadQuery.data}
              />

              <div className="hidden h-8 w-px bg-gray-200 sm:block" />

              <Link
                to="/profile"
                className="hidden items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-gray-50 sm:flex"
              >
                <UserAvatar user={user} />

                <div className="max-w-[190px] text-left">
                  <p className="truncate text-sm font-semibold text-gray-950">
                    {user?.name}
                  </p>

                  <p className="truncate text-xs text-gray-400">
                    {nameOf(
                      selectedProperty,
                      'All properties'
                    )}
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <nav
            className="mb-6 flex items-center gap-2 overflow-x-auto whitespace-nowrap text-xs"
            aria-label="Breadcrumb"
          >
            <Link
              to="/dashboard"
              className="font-medium text-gray-400 transition hover:text-gray-700"
            >
              Home
            </Link>

            {crumbs.map((crumb, index) => (
              <span
                key={crumb.to}
                className="flex items-center gap-2"
              >
                <span className="text-gray-300">/</span>

                <Link
                  to={crumb.to}
                  className={[
                    'capitalize transition',
                    index === crumbs.length - 1
                      ? 'font-semibold text-gray-700'
                      : 'text-gray-400 hover:text-gray-700',
                  ].join(' ')}
                >
                  {crumb.label}
                </Link>
              </span>
            ))}
          </nav>

          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

/* =========================================================
   TENANT LAYOUT
========================================================= */

export function TenantLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: notificationApi.unreadCount,
    refetchInterval: 60000,
  })

  return (
    <div className="min-h-screen bg-[#F7F7F8]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-gray-200 bg-white lg:block">
        <Sidebar
          user={user}
          groups={[]}
          properties={[]}
          currentPropertyId=""
          setCurrentPropertyId={() => {}}
          propertiesLoading={false}
          propertiesError={false}
          onRetryProperties={() => {}}
          logout={logout}
          navigate={navigate}
          tenant
        />
      </aside>

      {/* Mobile sidebar */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-gray-950/45 backdrop-blur-[3px]"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />

          <div className="relative h-full w-[285px] border-r border-gray-200 bg-white shadow-2xl">
            <Sidebar
              user={user}
              groups={[]}
              properties={[]}
              currentPropertyId=""
              setCurrentPropertyId={() => {}}
              propertiesLoading={false}
              propertiesError={false}
              onRetryProperties={() => {}}
              logout={logout}
              navigate={navigate}
              tenant
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-[264px]">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-gray-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex h-[72px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={[
                  'flex h-10 w-10 items-center justify-center',
                  'rounded-xl border border-gray-200',
                  'bg-white text-gray-600',
                  'transition hover:bg-gray-50 hover:text-gray-950',
                  'lg:hidden',
                ].join(' ')}
                onClick={() => setOpen(!open)}
                aria-label={
                  open ? 'Close menu' : 'Open menu'
                }
              >
                {open ? (
                  <X size={20} strokeWidth={1.8} />
                ) : (
                  <Menu size={20} strokeWidth={1.8} />
                )}
              </button>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                  Resident portal
                </p>

                <p className="mt-0.5 hidden text-sm font-bold text-gray-950 sm:block">
                  Welcome back, {user?.name}
                </p>
              </div>
            </div>

            <NotificationButton
              to="/tenant/notifications"
              count={unreadQuery.data}
            />
          </div>
        </header>

        {/* Content */}
        <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

/* =========================================================
   AUTH LAYOUT
========================================================= */

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#F7F7F8] lg:grid lg:grid-cols-2">
      {/* Premium brand panel */}
      <section className="relative hidden overflow-hidden bg-[#101010] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        {/* Decorative grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          aria-hidden="true"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div
          className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full border border-white/[0.035]"
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute -bottom-48 -left-40 h-[600px] w-[600px] rounded-full border border-[#E92323]/10"
          aria-hidden="true"
        />

        <div className="relative z-10">
          <Brand dark />
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="mb-7 flex items-center gap-3">
            <span className="h-1 w-10 rounded-full bg-[#E92323]" />

            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
              Property management platform
            </span>
          </div>

          <h1 className="text-5xl font-extrabold leading-[1.02] tracking-[-0.045em] text-white xl:text-6xl">
            Run your hostel.
            <br />
            <span className="text-[#E92323]">
              Smarter.
            </span>
          </h1>

          <p className="mt-7 max-w-lg text-base leading-7 text-white/45">
            Occupancy, rent, tenants, payments and daily
            property operations — connected in one modern
            workspace.
          </p>

          <div className="mt-10 flex items-center gap-8">
            <div>
              <p className="text-2xl font-bold tracking-tight text-white">
                One
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
                Workspace
              </p>
            </div>

            <div className="h-8 w-px bg-white/10" />

            <div>
              <p className="text-2xl font-bold tracking-tight text-white">
                Clear
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
                Operations
              </p>
            </div>

            <div className="h-8 w-px bg-white/10" />

            <div>
              <p className="text-2xl font-bold tracking-tight text-white">
                Simple
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
                Management
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
            THE HOSTEL YARD
          </p>

          <p className="mt-1 text-xs text-white/20">
            Professional hostel & property management
          </p>
        </div>
      </section>

      {/* Auth content */}
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-[430px]">
          {/* Mobile brand */}
          <div className="mb-10 lg:hidden">
            <Brand compact />

            <div className="mt-6 text-center">
              <p className="text-2xl font-extrabold tracking-[-0.03em] text-gray-950">
                THE HOSTEL YARD
              </p>

              <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[#E92323]" />

              <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-gray-400">
                Property operations
              </p>
            </div>
          </div>

          <Outlet />
        </div>
      </section>
    </div>
  )
}