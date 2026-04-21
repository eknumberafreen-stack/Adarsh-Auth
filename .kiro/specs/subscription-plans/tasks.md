# Implementation Plan: Subscription Plans

## Overview

Implement tiered subscription plans (Free, Pro, Enterprise) that enforce resource limits for developers on the platform. The implementation follows the design-first approach: backend model → seeder → middleware → routes → frontend UI. Each step builds on the previous and is wired together at the end.

## Tasks

- [x] 1. Create the SubscriptionPlan Mongoose model
  - Create `backend/models/SubscriptionPlan.js` with the schema defined in the design: `name` (enum: free/pro/enterprise, unique), `displayName`, `price`, `limits` (maxApplications, maxUsersPerApp, maxLicensesPerApp, maxApiCallsPerDay), `features` (string array), `isActive`, timestamps
  - Enforce that `name` is unique via the schema index
  - Export the model as `SubscriptionPlan`
  - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 1.1 Write property test for SubscriptionPlan schema completeness
    - **Property 13: SubscriptionPlan documents contain all required fields**
    - **Validates: Requirements 1.2**

- [x] 2. Extend the User model with plan fields
  - Add `plan` field (ObjectId ref to `SubscriptionPlan`, default `null`) to `backend/models/User.js`
  - Add `planAssignedAt` field (Date, default `Date.now`) to `backend/models/User.js`
  - Do NOT expose or accept `plan` in any existing user-facing update logic
  - _Requirements: 3.1, 3.4_

- [x] 3. Implement the plan seeder (`seedPlans`)
  - Create `backend/utils/seedPlans.js` with the `seedPlans()` async function
  - Use `findOneAndUpdate` with `{ upsert: true, $setOnInsert }` to create Free, Pro, and Enterprise plan documents without overwriting existing ones (see design for exact limit values)
  - After upserting plans, run `User.updateMany({ plan: null }, { $set: { plan: freePlan._id, planAssignedAt: new Date() } })` to backfill existing users
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 3.1 Write property test for seedPlans idempotence
    - **Property 4: Plan seeder idempotence**
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 3.2 Write property test for seeder backfill
    - **Property 6: Seeder backfills all plan-less users**
    - **Validates: Requirements 2.6**

- [x] 4. Call `seedPlans` on server startup
  - Import `seedPlans` in `backend/server.js`
  - Call `await seedPlans()` inside `startServer()` after `connectDB()` and `connectRedis()` succeed
  - _Requirements: 2.1_

- [x] 5. Auto-assign Free plan on developer registration
  - In `backend/routes/auth.js`, after `User.create(...)` in the `POST /register` handler, query `SubscriptionPlan.findOne({ name: 'free' })` and set `user.plan = freePlan._id` and `user.planAssignedAt = new Date()` before saving
  - Apply the same logic to the Google OAuth registration path in `backend/routes/googleAuth.js` if a new user is created there
  - _Requirements: 3.2, 3.3_

  - [ ]* 5.1 Write property test for new user free plan assignment
    - **Property 5: New user free plan assignment**
    - **Validates: Requirements 3.2**

- [x] 6. Implement the `checkPlanLimit` middleware factory
  - Create `backend/middleware/planLimit.js` exporting `checkPlanLimit(resource)` where `resource` is `'applications' | 'usersPerApp' | 'licensesPerApp'`
  - Follow the pseudocode algorithm in the design exactly:
    1. Try Redis cache key `plan:{userId}`; on miss, populate user's plan from MongoDB and cache with 60s TTL
    2. Fall back to Free plan limits if `user.plan` is null or the referenced plan is missing
    3. Determine `limit` and `current` count based on `resource` (use `Application.countDocuments`, `AppUser.countDocuments`, or `License.countDocuments` with the appropriate filter)
    4. If `limit === -1`, call `next()`; if `current >= limit`, return 403 with the structured error body; otherwise call `next()`
  - Wrap Redis reads/writes in try/catch and fall back to MongoDB on any Redis error
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 12.1_

  - [ ]* 6.1 Write property test for unlimited limit always passes
    - **Property 1: Unlimited limit always passes**
    - **Validates: Requirements 1.4, 4.1**

  - [ ]* 6.2 Write property test for limit enforcement correctness
    - **Property 2: Limit enforcement correctness**
    - **Validates: Requirements 4.2, 4.3, 4.4, 11.4**

  - [ ]* 6.3 Write property test for middleware read-only invariant
    - **Property 3: Middleware is read-only**
    - **Validates: Requirements 4.4**

- [x] 7. Apply `checkPlanLimit` to resource-creation routes
  - In `backend/routes/application.js`, add `checkPlanLimit('applications')` as middleware on `POST /` before the `asyncHandler`
  - In `backend/routes/user.js`, add `checkPlanLimit('usersPerApp')` as middleware on `POST /create` before the `asyncHandler` (the application `_id` is in `req.body.applicationId` — set `req.params.id` or adjust the middleware to read from `req.body`)
  - In `backend/routes/license.js`, add `checkPlanLimit('licensesPerApp')` as middleware on `POST /generate` before the `asyncHandler` (application `_id` is in `req.body.applicationId`)
  - _Requirements: 4.8, 4.9, 4.10_

- [x] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement the `getUserPlanWithUsage` service function
  - Create `backend/services/planService.js` exporting `getUserPlanWithUsage(userId)`
  - The function should: check Redis cache key `plan:usage:{userId}` (TTL 60s); on miss, query `User.findById(userId).populate('plan')`, count `Application.countDocuments({ userId })`, build the `{ plan, usage }` response shape from the design, cache it, and return it
  - Wrap Redis operations in try/catch; fall back to MongoDB on cache failure without surfacing the error
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 12.2_

  - [ ]* 9.1 Write property test for usage counts accuracy
    - **Property 7: Usage counts are accurate**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 10. Implement the `/api/plans` routes
  - Create `backend/routes/plans.js` with:
    - `GET /` — no auth required; returns all `SubscriptionPlan` documents where `isActive: true`
    - `GET /my` — requires `verifyToken`; calls `getUserPlanWithUsage(req.userId)` and returns the result
  - Register the router in `backend/server.js` as `app.use('/api/plans', plansRoutes)`
  - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 10.1 Write property test for GET /api/plans returns all active plans
    - **Property 11: GET /api/plans returns all active plans**
    - **Validates: Requirements 6.1**

- [x] 11. Implement admin plan management routes
  - In `backend/routes/admin.js` (already protected by `verifyToken` + `verifyOwner`), add:
    - `GET /plans` — returns all `SubscriptionPlan` documents with a `developerCount` field (use `User.countDocuments({ plan: plan._id })` per plan)
    - `PUT /plans/:id` — updates limit fields on the specified plan; returns the updated plan
    - `PATCH /developers/:id/plan` — validates `planId` exists and `isActive: true`; updates `User.plan` and `User.planAssignedAt`; returns 404 with `{ error: "Plan not found or inactive" }` on invalid `planId`
  - Update the existing `GET /developers` handler to populate each user's `plan` field and include `plan.name` and `planAssignedAt` in the response
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 11.1 Write property test for admin endpoints reject non-admin users
    - **Property 9: Admin endpoints reject non-admin users**
    - **Validates: Requirements 7.5, 11.1**

  - [ ]* 11.2 Write property test for admin developer list includes plan info
    - **Property 12: Admin developer list includes plan info**
    - **Validates: Requirements 7.6, 10.1**

- [x] 12. Verify plan downgrade behavior (no data deletion)
  - Confirm that `PATCH /api/admin/developers/:id/plan` only updates the `plan` reference on the User document and does not delete any Application, License, or AppUser documents
  - Add a comment in the route handler noting that existing resources are preserved on downgrade per requirements 8.1
  - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 12.1 Write property test for plan downgrade preserves existing resources
    - **Property 10: Plan downgrade preserves existing resources**
    - **Validates: Requirements 8.1**

- [x] 13. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Create the frontend Plan & Billing page
  - Create `frontend/app/dashboard/billing/page.tsx` as a new Next.js page
  - On mount, call `GET /api/plans` and `GET /api/plans/my` in parallel using the existing `api` client from `frontend/lib/api.ts`
  - Display the developer's current plan name and all four limit values
  - Render usage bars for each resource (applications, users, licenses) showing `current / limit` — display "Unlimited" when limit is `-1`
  - Render a plan comparison table listing all active plans with their `features` array and formatted price (convert cents to dollars)
  - Include a "Contact us to upgrade" CTA button (no payment flow)
  - Match the existing dark-theme Tailwind styling used across the dashboard
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 15. Add "Billing" navigation link to the dashboard sidebar
  - In `frontend/app/dashboard/layout.tsx`, add a `{ name: 'Billing', href: '/dashboard/billing', icon: CreditCardIcon }` entry to the `navigation` array (import `CreditCardIcon` from `@heroicons/react/24/outline`)
  - Place it after the "Sessions" entry and before "Settings"
  - _Requirements: 9.1_

- [x] 16. Show upgrade prompt on 403 limit-reached responses
  - In `frontend/lib/api.ts`, extend the response interceptor to detect 403 responses with `upgradeRequired: true` in the response body
  - When detected, display a toast notification (using the existing `react-hot-toast` library) with a message like "Plan limit reached — upgrade your plan" and a link/button that navigates to `/dashboard/billing`
  - _Requirements: 9.6_

  - [ ]* 16.1 Write property test for upgrade prompt shown on 403 limit response
    - **Property 15: Upgrade prompt shown on any 403 limit response**
    - **Validates: Requirements 9.6**

- [x] 17. Update the Admin Developers page to show and manage plans
  - In `frontend/app/dashboard/developers/page.tsx`, update the developer list to display each developer's `plan.name` and `planAssignedAt` from the updated `GET /api/admin/developers` response
  - Add a plan assignment control (e.g., a dropdown or modal) per developer row that calls `PATCH /api/admin/developers/:id/plan` with the selected `planId`
  - On success, refresh the developer list; on failure, display the API error message
  - _Requirements: 10.1, 10.2, 10.3_

  - [ ]* 17.1 Write property test for plan field immutability via developer endpoints
    - **Property 8: Plan field is immutable via developer endpoints**
    - **Validates: Requirements 3.4, 11.2**

- [x] 18. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at the backend and frontend boundaries
- Property tests use `fast-check` as specified in the design's testing strategy
- Unit tests should mock `User.findById`, `Application.countDocuments`, and the Redis client when testing `checkPlanLimit` in isolation
- The `plan` field is never accepted from developer-facing endpoints — enforcement is server-side only
