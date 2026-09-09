# Backend notes (frontend-only)

The frontend does **not** change the backend. These are limitations observed while wiring the UI.

## Authentication

- Access tokens expire in **15 minutes** (`generateAccessToken` / cookie `maxAge`). There is no refresh-token endpoint. Users will be asked to sign in again after expiry.
- `GET /api/auth/me` does not return property assignments or permission arrays for managers/staff.
- Owner OTP is not returned in the API body. In development it is printed to the backend console.
- `POST /api/auth/forgot-password` currently returns `resetUrl` in `data` (useful in development, unsafe if left in production responses). The UI does not display that URL.

## Organization

- There is no organization GET/UPDATE API. The organization screen shows the signed-in user and organization ObjectId from `/me`.
- Organization is created only during owner setup.

## Properties / LANDLORD

- Property routes authorize `LANDLORD`, but `getProperties` / `getPropertyById` only implement `BUSINESS_OWNER` and `PROPERTY_MANAGER`. A `LANDLORD` user will receive 403 from those services.
- Staff cannot call `GET /api/properties`. The sidebar property list for staff uses `GET /api/dashboard/overview` → `properties.items`.

## Managers

- There is no manager list/detail API. The UI can only create invitations and update permissions when the operator already knows the manager user ID and property ID.
- Invitation links are returned in the create-invitation payload (`invitationLink`).

## Documents / food

- `VIEW_DOCUMENTS`, `MANAGE_DOCUMENTS`, and `MANAGE_FOOD_MENU` exist as permission strings but have no routes.

## Dashboard / reports

- Dashboard overview is a **snapshot**, not time-series occupancy or collection trends. Charts use that snapshot plus `/api/reports/*`.
- Reports return aggregations keyed by property ObjectId (and nested `_id` for payments). There is no CSV/PDF export endpoint.
- Occupancy report rows do not include property names.

## Payments

- Supported methods are **CASH** and **UPI** only. Tenant submissions must be UPI with a transaction reference.
- No receipt download endpoint.
- QR upload exists in a payment-settings service helper but is not exposed as a route; the UI accepts a QR image URL string.

## Misc

- Several list endpoints are not paginated (tenants, rooms, expenses, payments, allocations).
- Response envelopes are inconsistent (`data.x` vs top-level `complaints` / `announcements` / `notifications`). The client unwraps both.
- Complaint assign expects a user ObjectId; there is no “directory of assignable staff” endpoint, so the UI asks for the ID.
- Cookie `secure`/`sameSite` change in production (`none` + `secure`). Local HTTP must keep `NODE_ENV` off production for login cookies to work on localhost.
