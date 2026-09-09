import { Navigate, Outlet, useLocation, Link } from 'react-router-dom'

import { useAuthStore } from '../store/authStore'
import { can, hasRole, homePath } from '../config/authz'
import { ROLES } from '../config/permissions'
import { Button, Card } from '../components/ui'

export function PublicOnly() {
  const user = useAuthStore((s) => s.user)

  if (user) {
    return <Navigate to={homePath(user.role)} replace />
  }

  return <Outlet />
}

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  const status = useAuthStore((s) => s.status)
  const location = useLocation()

  if (status === 'loading' || status === 'idle') {
    return <Boot />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export function StaffAppGate() {
  const user = useAuthStore((s) => s.user)

  if (user?.role === ROLES.TENANT) {
    return <Navigate to="/tenant" replace />
  }

  return <Outlet />
}

export function TenantAppGate() {
  const user = useAuthStore((s) => s.user)

  if (user?.role !== ROLES.TENANT) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export function RoleRoute({ roles, permission }) {
  const user = useAuthStore((s) => s.user)

  const allowed = roles ? hasRole(user, ...roles) : true
  const permitted = permission ? can(user, permission) : true

  if (!allowed || !permitted) {
    return (
      <div className="min-h-[calc(100vh-2rem)] bg-[#F7F8FA] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
          <Card className="w-full overflow-hidden border border-[#E8E9EC] bg-white p-0 shadow-[0_20px_60px_rgba(17,24,39,0.07)]">
            {/* Top accent */}
            <div className="h-1 w-full bg-[#E92323]" />

            <div className="p-8 text-center sm:p-10">
              {/* Icon */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF1F1] ring-1 ring-[#FDE0E0]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-7 w-7 text-[#E92323]"
                  aria-hidden="true"
                >
                  <path
                    d="M12 8.5v4.25"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 16.25h.01"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M10.45 4.95 2.95 17.5a2 2 0 0 0 1.72 3h14.66a2 2 0 0 0 1.72-3L13.55 4.95a1.8 1.8 0 0 0-3.1 0Z"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Heading */}
              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E92323]">
                Access control
              </p>

              <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.025em] text-[#171A21] sm:text-[34px]">
                Access restricted
              </h1>

              <p className="mx-auto mt-3 max-w-md text-[14px] leading-6 text-[#68707D]">
                You don’t have permission to access this module for your
                current role or assignment.
              </p>

              {/* Divider */}
              <div className="mx-auto mt-7 h-px w-full max-w-sm bg-[#ECEDEF]" />

              {/* Action */}
              <Link to={homePath(user?.role)} className="inline-block">
                <Button className="mt-7 min-w-[132px] bg-[#E92323] px-5 text-white shadow-[0_8px_20px_rgba(233,35,35,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#C91C1C] hover:shadow-[0_10px_24px_rgba(233,35,35,0.24)]">
                  Go back
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return <Outlet />
}

function Boot() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#F7F8FA] px-6">
      <div className="w-full max-w-sm text-center">
        {/* Brand mark */}
        <div className="mx-auto flex h-[76px] w-[76px] items-center justify-center rounded-[22px] border border-[#E8E9EC] bg-white shadow-[0_12px_35px_rgba(17,24,39,0.07)]">
          <img
            src="/logo.png"
            alt="The Hostel Yard"
            className="h-12 w-12 object-contain"
          />
        </div>

        {/* Brand */}
        <p className="mt-6 text-[12px] font-bold uppercase tracking-[0.2em] text-[#171A21]">
          The Hostel Yard
        </p>

        <p className="mt-2 text-sm text-[#8A919D]">
          Preparing your workspace
        </p>

        {/* Loading indicator */}
        <div
          className="mx-auto mt-6 h-1 w-28 overflow-hidden rounded-full bg-[#FDE2E2]"
          aria-hidden="true"
        >
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[#E92323]" />
        </div>

        <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-[#A0A6B0]">
          Please wait
        </p>
      </div>
    </div>
  )
}