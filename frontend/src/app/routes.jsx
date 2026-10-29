import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthLayout, DashboardLayout, TenantLayout } from '../layouts/AppLayouts'
import { ProtectedRoute, PublicOnly, RoleRoute, StaffAppGate, TenantAppGate } from './guards'
import {
  AcceptTenantPage,
  ActivateManagerPage,
  ActivateStaffPage,
  ForgotPasswordPage,
  LoginPage,
  ResetPasswordPage,
  SetupOwnerPage,
  VerifyOwnerPage,
} from '../pages/auth/AuthPages'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { OrganizationPage, ProfilePage, PropertyDetailPage, PropertyFormPage, PropertyListPage } from '../pages/properties/PropertyPages'
import {
  BedDetailPage,
  BedFormPage,
  BedListPage,
  RoomDetailPage,
  RoomFormPage,
  RoomListPage,
} from '../pages/inventory/InventoryPages'
import {
  AllocationCreatePage,
  AllocationDetailPage,
  AllocationListPage,
  TenantDetailPage,
  TenantFormPage,
  TenantListPage,
} from '../pages/people/TenantPages'
import {
  BookingDetailPage,
  BookingFormPage,
  BookingListPage,
  ExpenseDetailPage,
  ExpenseFormPage,
  ExpenseListPage,
  PaymentDetailPage,
  PaymentListPage,
  PaymentSettingsPage,
  RentDueDetailPage,
  RentPage,
  RentPlanCreatePage,
} from '../pages/finance/FinancePages'
import {
  AnnouncementDetailPage,
  AnnouncementFormPage,
  AnnouncementListPage,
  ComplaintDetailPage,
  ComplaintFormPage,
  ComplaintListPage,
  NotificationDetailPage,
  NotificationPage,
} from '../pages/ops/OpsPages'
import { ManagerPage, StaffDetailPage, StaffFormPage, StaffListPage } from '../pages/team/TeamPages'
import { ReportsPage } from '../pages/reports/ReportsPage'
import {
  TenantAnnouncementsPage,
  TenantComplaintsPage,
  TenantDashboardPage,
  TenantNotificationsPage,
  TenantPaymentsPage,
  TenantProfilePage,
  TenantRentPage,
  TenantStayPage,
} from '../pages/tenant/TenantPages'
import { PERMISSIONS, ROLES } from '../config/permissions'
import { Button, Card } from '../components/ui'
import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <div className="min-h-screen bg-transparent px-4 py-8 sm:px-6">
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-lg border border-line bg-card p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft">
            <span
              className="text-2xl font-bold text-brand"
              aria-hidden="true"
            >
              404
            </span>
          </div>

          <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
            We couldn’t find that resource.
          </h1>

          <p className="mt-3 text-sm leading-6 text-ink-600">
            The page you’re looking for may have been moved or may no longer
            be available.
          </p>

          <Link to="/dashboard">
            <Button className="mt-7 bg-brand text-white hover:bg-brand-dark">
              Go home
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route element={<PublicOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup-owner" element={<SetupOwnerPage />} />
          <Route path="/verify-owner" element={<VerifyOwnerPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
        <Route path="/tenant/accept-invitation" element={<AcceptTenantPage />} />
        <Route path="/manager/activate/:token" element={<ActivateManagerPage />} />
        <Route path="/staff/activate/:token" element={<ActivateStaffPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<StaffAppGate />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/organization" element={<OrganizationPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationPage />} />
            <Route path="/notifications/:notificationId" element={<NotificationDetailPage />} />

            <Route element={<RoleRoute roles={[ROLES.BUSINESS_OWNER, ROLES.LANDLORD, ROLES.PROPERTY_MANAGER]} />}>
              <Route path="/properties" element={<PropertyListPage />} />
              <Route path="/properties/new" element={<PropertyFormPage mode="create" />} />
              <Route path="/properties/:propertyId" element={<PropertyDetailPage />} />
              <Route path="/properties/:propertyId/edit" element={<PropertyFormPage mode="edit" />} />
            </Route>

            <Route element={<RoleRoute permission={PERMISSIONS.VIEW_ROOMS} />}>
              <Route path="/rooms" element={<RoomListPage />} />
              <Route path="/rooms/new" element={<RoomFormPage mode="create" />} />
              <Route path="/rooms/:roomId" element={<RoomDetailPage />} />
              <Route path="/rooms/:roomId/edit" element={<RoomFormPage mode="edit" />} />
              <Route path="/beds" element={<BedListPage />} />
              <Route path="/beds/new" element={<BedFormPage />} />
              <Route path="/beds/:bedId" element={<BedDetailPage />} />
            </Route>

            <Route element={<RoleRoute permission={PERMISSIONS.VIEW_TENANTS} />}>
              <Route path="/tenants" element={<TenantListPage />} />
              <Route path="/tenants/new" element={<TenantFormPage mode="create" />} />
              <Route path="/tenants/:tenantId" element={<TenantDetailPage />} />
              <Route path="/tenants/:tenantId/edit" element={<TenantFormPage mode="edit" />} />
            </Route>

            <Route element={<RoleRoute permission={PERMISSIONS.VIEW_ALLOCATIONS} />}>
              <Route path="/allocations" element={<AllocationListPage />} />
              <Route path="/allocations/new" element={<AllocationCreatePage />} />
              <Route path="/allocations/:allocationId" element={<AllocationDetailPage />} />
            </Route>

            <Route element={<RoleRoute permission={PERMISSIONS.VIEW_BOOKINGS} />}>
              <Route path="/bookings" element={<BookingListPage />} />
              <Route path="/bookings/new" element={<BookingFormPage />} />
              <Route path="/bookings/:bookingId" element={<BookingDetailPage />} />
            </Route>

            <Route element={<RoleRoute permission={PERMISSIONS.VIEW_DUES} />}>
              <Route path="/rent" element={<RentPage />} />
              <Route path="/rent/plans/new" element={<RentPlanCreatePage />} />
              <Route path="/rent/:rentDueId" element={<RentDueDetailPage />} />
            </Route>

            <Route element={<RoleRoute permission={PERMISSIONS.VIEW_PAYMENTS} />}>
              <Route path="/payments" element={<PaymentListPage />} />
              <Route path="/payments/:paymentId" element={<PaymentDetailPage />} />
            </Route>

            <Route path="/payment-settings" element={<PaymentSettingsPage />} />

            <Route element={<RoleRoute permission={PERMISSIONS.VIEW_EXPENSES} />}>
              <Route path="/expenses" element={<ExpenseListPage />} />
              <Route path="/expenses/new" element={<ExpenseFormPage />} />
              <Route path="/expenses/:expenseId" element={<ExpenseDetailPage />} />
            </Route>

            <Route element={<RoleRoute permission={PERMISSIONS.VIEW_COMPLAINTS} />}>
              <Route path="/complaints" element={<ComplaintListPage />} />
              <Route path="/complaints/new" element={<ComplaintFormPage />} />
              <Route path="/complaints/:complaintId" element={<ComplaintDetailPage />} />
            </Route>

            <Route path="/announcements" element={<AnnouncementListPage />} />
            <Route path="/announcements/new" element={<AnnouncementFormPage />} />
            <Route path="/announcements/:announcementId" element={<AnnouncementDetailPage />} />

            <Route element={<RoleRoute roles={[ROLES.BUSINESS_OWNER]} />}>
              <Route path="/managers" element={<ManagerPage />} />
            </Route>

            <Route element={<RoleRoute permission={PERMISSIONS.VIEW_STAFF} />}>
              <Route path="/staff" element={<StaffListPage />} />
              <Route path="/staff/new" element={<StaffFormPage />} />
              <Route path="/staff/:staffId" element={<StaffDetailPage />} />
            </Route>

            <Route path="/reports" element={<ReportsPage />} />
          </Route>
        </Route>

        <Route element={<TenantAppGate />}>
          <Route element={<TenantLayout />}>
            <Route path="/tenant" element={<TenantDashboardPage />} />
            <Route path="/tenant/stay" element={<TenantStayPage />} />
            <Route path="/tenant/rent" element={<TenantRentPage />} />
            <Route path="/tenant/payments" element={<TenantPaymentsPage />} />
            <Route path="/tenant/complaints" element={<TenantComplaintsPage />} />
            <Route path="/tenant/announcements" element={<TenantAnnouncementsPage />} />
            <Route path="/tenant/notifications" element={<TenantNotificationsPage />} />
            <Route path="/tenant/profile" element={<TenantProfilePage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
