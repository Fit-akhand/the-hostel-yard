# THE HOSTEL YARD
## Hostel / PG / Property Management System

---

# 1. PROJECT OBJECTIVE

The Hostel Yard is a production-ready property management platform for
hostels, PGs, rooms, hotels and flats.

The system will allow property owners, business owners, property managers
and tenants to manage:

- Properties
- Floors
- Rooms
- Beds
- Tenants
- Bookings
- Rent
- Payments
- Dues
- Expenses
- Documents
- Agreements
- Complaints
- Announcements
- Staff
- Food Menu
- Notifications
- Reports

---

# 2. USER ROLES

## Business Owner

Can manage multiple properties.

Permissions:

- View all properties
- Add property
- Manage properties
- Add/manage managers
- View tenants
- View collections
- View expenses
- View dues
- View reports
- View occupancy
- View property performance

---

## Landlord / Owner

Can manage/view their property.

Permissions:

- Property overview
- Financial dashboard
- Collections
- Expenses
- Dues
- Tenants
- Occupancy
- Reports
- Complaints
- Announcements
- Documents

---

## Property Manager

Responsible for daily operations.

Permissions:

- Manage tenants
- Add tenant
- Manage rooms
- Manage beds
- Manage bookings
- Collect rent
- Add dues
- Add expenses
- Manage complaints
- Send announcements
- Manage staff
- Manage food menu
- Manage documents
- Manage agreements

---

## Tenant

Can access their own information.

Permissions:

- View profile
- View room/bed
- View rent
- Pay rent
- View payment history
- View dues
- View documents
- View agreement
- Download receipts
- Raise complaints
- View announcements
- View food menu
- View booking information

---

# 3. PROPERTY HIERARCHY

The core structure is:

Business Owner
    ↓
Property
    ↓
Floor
    ↓
Room
    ↓
Bed
    ↓
Tenant

Example:

The Hostel Yard
│
├── Ground Floor
│   ├── Room 001
│   │   ├── Bed A → Tenant
│   │   ├── Bed B → Tenant
│   │   └── Bed C → Vacant
│
├── First Floor
│   ├── Room 101
│   └── Room 102
│
└── Second Floor
    ├── Room 201
    └── Room 202

---

# 4. PROPERTY TYPES

When creating a property:

- PG
- Hostel
- Rooms
- Hotel
- Flats
- Other

Property fields:

- Property Name
- Property Type
- Address
- City
- State
- PIN Code
- Contact Number
- Email
- Description
- Total Floors
- Property Images
- Facilities

---

# 5. MANAGER DASHBOARD

Dashboard cards:

- Today's Collection
- Current Month Collection
- Current Month Dues
- Total Dues
- Current Month Expenses
- Active Tenants
- Under Eviction
- Current Bookings
- Total Rooms
- Vacant Beds
- Active Complaints
- Total Staff

Example:

Today's Collection
₹25,000

August Collection
₹4,85,000

August Dues
₹72,000

Total Dues
₹1,15,000

August Expenses
₹1,82,000

Active Tenants
86

Under Eviction
2

Current Bookings
7

Total Rooms
35

Vacant Beds
14

Active Complaints
4

Total Staff
8

---

# 6. MANAGER QUICK ACTIONS

Dashboard quick actions:

- Add Tenant
- Collect Payment
- Add Dues
- Add Expense
- Send Announcement
- Add Team Member
- Add Room / Bed
- Food Menu

---

# 7. ADD TENANT

Fields:

- Full Name
- Phone Number
- Email
- Profile Photo
- Room Number
- Bed
- Stay Type
- Check-in Date
- Lock-in Period
- Notice Period
- Agreement Period
- Rent Frequency
- Fixed Rent
- Security Deposit
- Documents
- Agreement

---

# 8. RENT FREQUENCY

The system must support:

- Monthly - 1st
- Monthly - 15th
- Custom frequency (future)

Example:

Tenant A:
Rent = ₹8,000
Rent Date = 1st

Tenant B:
Rent = ₹8,000
Rent Date = 15th

The system automatically calculates upcoming rent dates
and generates dues.

---

# 9. RENT PAYMENT

Manager can collect payment.

Payment methods:

- Online
- UPI
- QR
- Cash
- Bank Transfer

Online payment:

Tenant
    ↓
Pay Rent
    ↓
Payment Gateway
    ↓
Payment Verification
    ↓
Payment Success
    ↓
Payment Record Created
    ↓
Tenant Account Updated

Cash payment:

Manager
    ↓
Select Tenant
    ↓
Enter Amount
    ↓
Select Cash
    ↓
Mark Paid
    ↓
Payment Record Created

Every payment must appear in:

- Manager dashboard
- Owner dashboard
- Tenant account
- Payment history
- Reports

---

# 10. DUES

Manager can manually create dues.

Fields:

- Tenant
- Amount
- Due Type
- Due Date
- Description

Due types:

- Rent
- Electricity
- Food
- Maintenance
- Late Fee
- Other

Tenant can see:

Total Due
₹12,500

Rent
₹8,000

Electricity
₹2,500

Food
₹2,000

---

# 11. EXPENSES

Add Expense fields:

- Amount
- Date
- Category
- Paid By
- Payment Method
- Paid To
- Description
- Attachment

Expense categories:

- Electricity
- Water
- Food
- Gas
- Maintenance
- Salary
- Cleaning
- Internet
- Repairs
- Supplies
- Other

Paid By:

- Owner
- Manager
- Business

Payment methods:

- Cash
- Online
- UPI
- Bank Transfer

Attachments:

- Receipt
- Invoice
- Bill
- Image
- PDF

---

# 12. TENANT PROFILE

Tenant profile contains:

- Name
- Phone
- Email
- Photo
- Room
- Bed
- Floor
- Rent
- Rent Cycle
- Security Deposit
- Check-in Date
- Lock-in Period
- Notice Period
- Agreement Period
- Status

Tabs:

- Overview
- Payments
- Dues
- Documents
- Agreement
- Complaints

---

# 13. DOCUMENT MANAGEMENT

Tenant documents:

- ID Proof
- Address Proof
- Photo
- Other Documents

Each document should contain:

- Document type
- File
- Upload date
- Verification status
- Verified by
- Verification date

---

# 14. AGREEMENT MANAGEMENT

Agreement fields:

- Tenant
- Start Date
- End Date
- Rent
- Security Deposit
- Lock-in Period
- Notice Period
- Agreement File
- Status

Statuses:

- Draft
- Active
- Expiring Soon
- Expired
- Terminated

Automatic reminders should be generated before expiry.

---

# 15. TENANT STATUS

Tenant lifecycle:

New
 ↓
Active
 ↓
Notice Given
 ↓
Under Eviction
 ↓
Move Out
 ↓
Archived

Never permanently delete tenant financial history.

---

# 16. BOOKINGS

Booking lifecycle:

Available
 ↓
Booked
 ↓
Checked In
 ↓
Occupied

Cancellation:

Booked
 ↓
Cancelled
 ↓
Available

Booking information:

- Tenant/Guest Name
- Phone
- Property
- Floor
- Room
- Bed
- Booking Date
- Check-in Date
- Expected Check-out
- Amount
- Status

---

# 17. COMPLAINTS

Tenant can create complaint.

Fields:

- Category
- Title
- Description
- Priority
- Attachment

Statuses:

- Open
- Assigned
- In Progress
- Resolved
- Closed

Example:

AC not working
Room 203
Priority: High

---

# 18. ANNOUNCEMENTS

Manager can send announcements.

Example:

"Water supply will be unavailable from 10 AM
to 12 PM tomorrow."

Announcement can be:

- Property-wide
- Floor-specific
- Room-specific
- Tenant-specific

---

# 19. NOTIFICATIONS

Automatic notifications:

- Rent due reminder
- Rent overdue
- Payment successful
- Payment failed
- New due
- Agreement expiring
- Complaint update
- Booking confirmation
- Announcement
- Move-out reminder

Notification channels:

- In-app
- Email
- SMS
- WhatsApp (future)

---

# 20. STAFF / TEAM

Add Team Member:

- Name
- Phone
- Email
- Role
- Joining Date
- Salary
- Documents
- Property
- Permissions

Roles:

- Manager
- Accountant
- Reception
- Maintenance
- Security
- Cook
- Cleaner
- Custom Role

Permission-based access must be implemented.

---

# 21. FOOD MENU

Manager can create/edit weekly food menu.

Example:

Monday

Breakfast:
Poha + Tea

Lunch:
Dal + Rice + Roti + Sabzi

Evening:
Tea + Biscuits

Dinner:
Paneer + Roti + Rice

Manager can:

- Add
- Edit
- Delete
- Publish
- Unpublish

Tenant can view published menu.

---

# 22. OWNER DASHBOARD

Owner dashboard should show:

- Total Collection
- Total Dues
- Total Expenses
- Net Income
- Total Properties
- Total Rooms
- Occupied Rooms
- Vacant Rooms
- Total Tenants
- Total Staff

Financial overview:

Total Revenue
    -
Total Expenses
    =
Net Income

---

# 23. MULTI-PROPERTY MANAGEMENT

Business owners can have:

Business
│
├── Property A
│
├── Property B
│
└── Property C

Business dashboard should show:

- Total revenue
- Total expenses
- Total dues
- Total tenants
- Total rooms
- Occupancy
- Property comparison

---

# 24. REPORTS

Reports:

## Financial

- Daily collection
- Monthly collection
- Rent collection
- Dues
- Expenses
- Net income

## Occupancy

- Total rooms
- Occupied rooms
- Vacant rooms
- Occupied beds
- Vacant beds
- Occupancy percentage

## Tenant

- Active tenants
- New tenants
- Move-outs
- Evictions
- Expiring agreements

## Property

- Property-wise revenue
- Property-wise expenses
- Property-wise occupancy

---

# 25. AUTHENTICATION

Authentication system:

- Login
- Logout
- OTP verification
- Password
- Forgot password
- Session management
- Role-based authorization

Tenant:

Phone
 ↓
OTP
 ↓
Verify
 ↓
Tenant Dashboard

Admin/Manager:

Login
 ↓
OTP / verification
 ↓
Dashboard

---

# 26. SECURITY

Must implement:

- JWT/session authentication
- Password hashing
- OTP expiration
- Rate limiting
- Role-based authorization
- Property-level authorization
- Input validation
- File validation
- Secure file access
- Audit logs
- Secure environment variables
- API security
- CORS configuration
- Error handling
- Database indexes
- Backups

---

# 27. CORE DATABASE ENTITIES

Initial models:

User
Property
Floor
Room
Bed
Tenant
Booking
Rent
Payment
Due
Expense
Document
Agreement
Complaint
Announcement
Notification
Staff
FoodMenu
AuditLog

Relationships:

User
 ↓
Property

Property
 ↓
Floor
 ↓
Room
 ↓
Bed
 ↓
Tenant

Tenant
 ├── Rent
 ├── Payment
 ├── Due
 ├── Document
 ├── Agreement
 ├── Complaint
 ├── Notification
 └── Booking

Property
 ├── Expense
 ├── Announcement
 ├── Staff
 └── FoodMenu

---

# 28. DEVELOPMENT ARCHITECTURE

Frontend:

React / Next.js
Tailwind CSS
Reusable components
Feature-based architecture

Backend:

Node.js
Express.js
MongoDB
Mongoose

Security:

JWT / secure sessions
OTP
RBAC
Zod validation

Storage:

Cloudinary / object storage

Email:

Nodemailer / email provider

Payments:

Payment gateway
Webhook verification

Deployment:

Frontend → Vercel
Backend → Production server
Database → MongoDB Atlas

---

# 29. DEVELOPMENT ORDER

Phase 1:
Project Setup

Phase 2:
Authentication + OTP

Phase 3:
Users + Roles + Permissions

Phase 4:
Property Management

Phase 5:
Floor Management

Phase 6:
Room Management

Phase 7:
Bed Management

Phase 8:
Tenant Management

Phase 9:
Rent System

Phase 10:
Dues

Phase 11:
Payments

Phase 12:
Expenses

Phase 13:
Documents

Phase 14:
Agreements

Phase 15:
Bookings

Phase 16:
Complaints

Phase 17:
Announcements

Phase 18:
Notifications

Phase 19:
Staff

Phase 20:
Food Menu

Phase 21:
Manager Dashboard

Phase 22:
Owner Dashboard

Phase 23:
Tenant Dashboard

Phase 24:
Reports

Phase 25:
Testing

Phase 26:
Security Review

Phase 27:
Deployment

Phase 28:
Production Monitoring

---

# 30. DEVELOPMENT RULE

Every feature must be developed in this order:

Database Model
    ↓
Validation
    ↓
Controller
    ↓
Service
    ↓
Route
    ↓
Authentication
    ↓
Authorization
    ↓
API Testing
    ↓
Frontend Service
    ↓
Frontend Page
    ↓
Components
    ↓
Loading State
    ↓
Error State
    ↓
Success State
    ↓
Testing

Do not build everything at once.

Complete one module before moving to the next.

---

# 31. BRANDING

Product:

THE HOSTEL YARD

Brand colors:

Primary:
Red

Secondary:
Black / Dark Charcoal

Background:
White / Light Gray

Design:

- Modern
- Clean
- Professional
- Responsive
- Desktop-first dashboard
- Mobile-friendly tenant portal
- Consistent cards
- Consistent buttons
- Consistent typography
- Accessible UI

---

# 32. V1 GOAL

V1 must allow a property manager to completely operate
a hostel/PG digitally.

Manager should be able to:

1. Create property
2. Add floors
3. Add rooms
4. Add beds
5. Add tenant
6. Assign tenant to bed
7. Set rent
8. Set rent cycle
9. Track dues
10. Collect rent
11. Record expenses
12. Upload documents
13. Manage agreements
14. Manage complaints
15. Send announcements
16. Manage staff
17. Manage food menu
18. View reports

Tenant should be able to:

1. Login
2. View profile
3. View room/bed
4. View rent
5. Pay rent
6. View dues
7. View payment history
8. View agreement
9. View documents
10. Raise complaint
11. View announcements
12. View food menu

Owner should be able to:

1. View property performance
2. View collections
3. View expenses
4. View dues
5. View occupancy
6. View tenants
7. View reports

---

# 33. IMPORTANT BUSINESS RULE

The system must NEVER depend only on dashboard numbers.

Dashboard numbers should be calculated from
actual database records.

Example:

Today's Collection
=
sum of verified payments
for today's date.

Monthly Collection
=
sum of verified payments
for the selected month.

Total Dues
=
sum of outstanding dues.

Monthly Expenses
=
sum of verified expenses
for the selected month.

Occupancy
=
occupied beds / total active beds × 100.

---

# 34. FINAL PRODUCT

The final product should feel like:

A professional property-management SaaS
for Indian hostel, PG and rental-property operators.

It should be scalable from:

1 property
    ↓
10 properties
    ↓
100 properties
    ↓
1000+ properties

without rewriting the entire application.