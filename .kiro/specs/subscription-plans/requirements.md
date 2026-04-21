# Requirements Document

## Introduction

This document defines the requirements for the Subscription Plans feature. The feature introduces tiered subscription plans (Free, Pro, Enterprise) that govern how many applications, users per application, and licenses a registered developer can create on the platform. Plan limits are enforced at the API layer via middleware. The platform owner (admin) can view plan distribution and manually assign or change plans for any developer. The system is monetization-ready but does not include a payment processor in the initial implementation.

## Glossary

- **System**: The auth SaaS platform (backend + frontend) as a whole.
- **Developer**: A registered user of the platform who creates and manages applications, licenses, and app-users.
- **Admin**: The platform owner; the single privileged user who can manage plans and developers.
- **SubscriptionPlan**: A MongoDB document that defines a named tier (free, pro, enterprise) and its resource limits.
- **Plan_Limit_Middleware**: The Express middleware factory (`checkPlanLimit`) that enforces resource limits before creation routes proceed.
- **Plan_Service**: The server-side service layer responsible for reading plan data and computing usage (`getUserPlanWithUsage`).
- **Plan_Seeder**: The startup routine (`seedPlans`) that ensures the three default plan documents exist in the database.
- **Resource**: A countable entity subject to plan limits — one of `applications`, `usersPerApp`, or `licensesPerApp`.
- **Usage**: The current count of a Resource owned by a Developer.
- **Redis_Cache**: The Redis instance used to cache plan and usage data with a short TTL.
- **Frontend**: The Next.js dashboard served to Developers and the Admin.
- **Free_Plan**: The default plan automatically assigned to every newly registered Developer (maxApplications: 3, maxUsersPerApp: 100, maxLicensesPerApp: 50, maxApiCallsPerDay: 1000).
- **Pro_Plan**: The mid-tier plan (maxApplications: 10, maxUsersPerApp: 1000, maxLicensesPerApp: 500, maxApiCallsPerDay: 10000, price: $19/month).
- **Enterprise_Plan**: The top-tier plan with unlimited resources (all limits: -1, price: $99/month).

---

## Requirements

### Requirement 1: Subscription Plan Model

**User Story:** As a platform owner, I want plan definitions stored in the database, so that I can adjust limits without redeploying code.

#### Acceptance Criteria

1. THE System SHALL store subscription plan definitions in a `subscription_plans` MongoDB collection using the `SubscriptionPlan` schema.
2. THE SubscriptionPlan SHALL include the fields: `name` (enum: free, pro, enterprise), `displayName`, `price` (USD cents/month), `limits.maxApplications`, `limits.maxUsersPerApp`, `limits.maxLicensesPerApp`, `limits.maxApiCallsPerDay`, `features` (string array), `isActive` (boolean), `createdAt`, and `updatedAt`.
3. THE System SHALL enforce that the `name` field is unique across all SubscriptionPlan documents.
4. WHEN a limit field is set to `-1`, THE System SHALL treat that resource as unlimited for all enforcement purposes.

---

### Requirement 2: Plan Seeding on Startup

**User Story:** As a platform owner, I want the three default plans to be created automatically on first startup, so that the system is ready to use without manual database setup.

#### Acceptance Criteria

1. WHEN the server starts, THE Plan_Seeder SHALL ensure exactly three SubscriptionPlan documents exist: `free`, `pro`, and `enterprise`.
2. WHEN the Plan_Seeder runs and a plan document already exists, THE Plan_Seeder SHALL leave the existing document unchanged (upsert with `$setOnInsert`).
3. WHEN the Plan_Seeder runs, THE Plan_Seeder SHALL create the Free_Plan with limits: maxApplications=3, maxUsersPerApp=100, maxLicensesPerApp=50, maxApiCallsPerDay=1000, price=0.
4. WHEN the Plan_Seeder runs, THE Plan_Seeder SHALL create the Pro_Plan with limits: maxApplications=10, maxUsersPerApp=1000, maxLicensesPerApp=500, maxApiCallsPerDay=10000, price=1900.
5. WHEN the Plan_Seeder runs, THE Plan_Seeder SHALL create the Enterprise_Plan with limits: maxApplications=-1, maxUsersPerApp=-1, maxLicensesPerApp=-1, maxApiCallsPerDay=-1, price=9900.
6. WHEN the Plan_Seeder runs and existing User documents have a null `plan` field, THE Plan_Seeder SHALL assign the Free_Plan `_id` to those users and set `planAssignedAt` to the current timestamp.

---

### Requirement 3: User Model Plan Association

**User Story:** As a developer, I want my account to be associated with a subscription plan, so that the system can enforce the correct resource limits for my tier.

#### Acceptance Criteria

1. THE System SHALL add a `plan` field (ObjectId reference to SubscriptionPlan) and a `planAssignedAt` (Date) field to the User schema.
2. WHEN a new Developer registers, THE System SHALL automatically assign the Free_Plan to the new User document and set `planAssignedAt` to the registration timestamp.
3. THE System SHALL ensure the `plan` field references a valid, active SubscriptionPlan document.
4. THE System SHALL NOT accept a `plan` field value from any developer-facing update endpoint; plan assignment is restricted to the Admin.

---

### Requirement 4: Plan Limit Enforcement Middleware

**User Story:** As a platform owner, I want resource creation to be blocked when a developer exceeds their plan limits, so that plan tiers are meaningfully enforced.

#### Acceptance Criteria

1. WHEN a Developer attempts to create a Resource and the Developer's plan limit for that Resource is `-1`, THE Plan_Limit_Middleware SHALL call `next()` and allow the request to proceed.
2. WHEN a Developer attempts to create a Resource and the Developer's current Usage is less than the plan limit, THE Plan_Limit_Middleware SHALL call `next()` and allow the request to proceed.
3. WHEN a Developer attempts to create a Resource and the Developer's current Usage is greater than or equal to the plan limit (and the limit is not `-1`), THE Plan_Limit_Middleware SHALL return HTTP 403 with a JSON body containing: `error`, `resource`, `current`, `limit`, `plan` (plan name), and `upgradeRequired: true`.
4. THE Plan_Limit_Middleware SHALL NOT mutate any database documents during a limit check.
5. WHEN the Plan_Limit_Middleware checks limits, THE Plan_Limit_Middleware SHALL first attempt to read the Developer's plan from the Redis_Cache using the key `plan:{userId}`.
6. WHEN the Redis_Cache does not contain the Developer's plan, THE Plan_Limit_Middleware SHALL query MongoDB for the User with the populated plan and store the result in Redis_Cache with a TTL of 60 seconds.
7. IF the Developer's `plan` field is null or references a deleted SubscriptionPlan, THEN THE Plan_Limit_Middleware SHALL fall back to the Free_Plan limits without returning an error.
8. THE Plan_Limit_Middleware SHALL be applied to the `POST /api/applications` route to enforce `maxApplications`.
9. THE Plan_Limit_Middleware SHALL be applied to the app-user creation route to enforce `maxUsersPerApp` per application.
10. THE Plan_Limit_Middleware SHALL be applied to the license creation route to enforce `maxLicensesPerApp` per application.

---

### Requirement 5: Plan Usage Service

**User Story:** As a developer, I want to see my current resource usage alongside my plan limits, so that I know how close I am to my tier's ceiling.

#### Acceptance Criteria

1. WHEN `getUserPlanWithUsage(userId)` is called, THE Plan_Service SHALL return an object containing the populated SubscriptionPlan document and a `usage` object.
2. THE Plan_Service SHALL set `usage.applications.current` to the count of Application documents where `userId` matches the Developer's `_id`.
3. THE Plan_Service SHALL set `usage.applications.limit` to the plan's `maxApplications` value.
4. WHEN `getUserPlanWithUsage` is called, THE Plan_Service SHALL cache the result in Redis_Cache under the key `plan:usage:{userId}` with a TTL of 60 seconds.
5. IF Redis_Cache is unavailable when the Plan_Service attempts to read or write cached data, THEN THE Plan_Service SHALL fall back to a direct MongoDB query and SHALL NOT surface a cache error to the caller.

---

### Requirement 6: Developer Plan API Endpoints

**User Story:** As a developer, I want API endpoints to retrieve available plans and my current plan with usage, so that my dashboard can display accurate subscription information.

#### Acceptance Criteria

1. WHEN an unauthenticated or authenticated client sends `GET /api/plans`, THE System SHALL return HTTP 200 with a JSON array of all active SubscriptionPlan documents.
2. WHEN an authenticated Developer sends `GET /api/plans/my`, THE System SHALL return HTTP 200 with a JSON object containing the Developer's current plan details and live usage counts in the shape defined in the design document.
3. WHEN an unauthenticated client sends `GET /api/plans/my`, THE System SHALL return HTTP 401.

---

### Requirement 7: Admin Plan Management API Endpoints

**User Story:** As a platform owner, I want API endpoints to view and update plans and assign plans to developers, so that I can manage the subscription tiers without touching the database directly.

#### Acceptance Criteria

1. WHEN the Admin sends `GET /api/admin/plans`, THE System SHALL return HTTP 200 with a JSON array of all SubscriptionPlan documents including the count of Developers on each plan.
2. WHEN the Admin sends `PUT /api/admin/plans/:id` with valid limit fields, THE System SHALL update the specified SubscriptionPlan document and return HTTP 200 with the updated plan.
3. WHEN the Admin sends `PATCH /api/admin/developers/:id/plan` with a valid `planId`, THE System SHALL update the target Developer's `plan` field and `planAssignedAt` timestamp and return HTTP 200.
4. IF the Admin sends `PATCH /api/admin/developers/:id/plan` with a `planId` that does not exist or belongs to an inactive plan, THEN THE System SHALL return HTTP 404 with `{ "error": "Plan not found or inactive" }`.
5. WHEN a non-Admin authenticated user sends a request to any `/api/admin/` endpoint, THE System SHALL return HTTP 403.
6. THE System SHALL extend the existing `GET /api/admin/developers` response to include each Developer's current plan name and `planAssignedAt` date.

---

### Requirement 8: Plan Downgrade Behavior

**User Story:** As a platform owner, I want plan downgrades to be non-destructive, so that developers do not lose existing data when their plan is reduced.

#### Acceptance Criteria

1. WHEN a Developer's plan is changed to a lower tier, THE System SHALL NOT delete any existing Resource documents that exceed the new plan's limits.
2. WHEN a Developer's Usage for a Resource already meets or exceeds the new plan's limit after a downgrade, THE Plan_Limit_Middleware SHALL block new Resource creation for that Resource type and return HTTP 403.
3. WHEN a Developer's Usage for a Resource is below the new plan's limit after a downgrade, THE Plan_Limit_Middleware SHALL allow new Resource creation for that Resource type.

---

### Requirement 9: Frontend Plan & Billing Page

**User Story:** As a developer, I want a dedicated plan and billing page in my dashboard, so that I can see my current plan, usage, and available upgrade options at a glance.

#### Acceptance Criteria

1. THE Frontend SHALL include a Plan & Billing page accessible from the developer dashboard navigation.
2. WHEN the Plan & Billing page loads, THE Frontend SHALL display the Developer's current plan name and all plan limits.
3. WHEN the Plan & Billing page loads, THE Frontend SHALL display live usage bars for each Resource showing current usage versus the plan limit (e.g., "2 / 3 applications used").
4. WHEN the Plan & Billing page loads, THE Frontend SHALL display a comparison of all available plans with their features and prices.
5. THE Frontend SHALL display a "Contact us to upgrade" call-to-action on the Plan & Billing page; no payment flow is required in v1.
6. WHEN a Developer receives a HTTP 403 limit-reached response from any resource-creation endpoint, THE Frontend SHALL display an upgrade prompt directing the Developer to the Plan & Billing page.

---

### Requirement 10: Admin Developer Plan View

**User Story:** As a platform owner, I want to see each developer's current plan in the admin developers list and be able to change it, so that I can manage plan assignments from the dashboard.

#### Acceptance Criteria

1. WHEN the Admin views the developers list page, THE Frontend SHALL display each Developer's current plan name alongside their other details.
2. WHEN the Admin selects a Developer and assigns a new plan, THE Frontend SHALL send `PATCH /api/admin/developers/:id/plan` and reflect the updated plan in the UI upon success.
3. WHEN the plan assignment request fails, THE Frontend SHALL display the error message returned by the API.

---

### Requirement 11: Security and Authorization

**User Story:** As a platform owner, I want plan management to be restricted to the admin, so that developers cannot self-assign higher plans.

#### Acceptance Criteria

1. THE System SHALL protect all `/api/admin/` plan endpoints with both `verifyToken` and `verifyOwner` middleware.
2. THE System SHALL NOT expose or accept a `plan` field in any developer-facing profile update endpoint.
3. THE System SHALL enforce plan limits server-side; frontend usage display is informational only and SHALL NOT be the sole enforcement mechanism.
4. WHEN the Plan_Limit_Middleware returns a HTTP 403 response, THE System SHALL NOT include internal system details beyond `error`, `resource`, `current`, `limit`, `plan`, and `upgradeRequired`.

---

### Requirement 12: Redis Cache Resilience

**User Story:** As a platform operator, I want the system to continue functioning correctly when Redis is unavailable, so that a cache outage does not cause service disruption.

#### Acceptance Criteria

1. IF Redis_Cache is unavailable during a plan limit check, THEN THE Plan_Limit_Middleware SHALL fall back to a direct MongoDB query and SHALL continue processing the request normally.
2. IF Redis_Cache is unavailable during a usage summary fetch, THEN THE Plan_Service SHALL fall back to a direct MongoDB query and SHALL return the correct usage data to the caller.
3. WHEN Redis_Cache becomes available again after an outage, THE System SHALL resume caching plan data on subsequent requests without requiring a restart.
