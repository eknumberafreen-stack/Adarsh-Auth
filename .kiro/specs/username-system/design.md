# Design Document: Username System

## Overview

This document describes the technical design for adding a username system to the Adarsh Auth platform. The feature introduces a `username` field to the developer account model, exposes API endpoints for setting and updating usernames, and updates all dashboard UI surfaces to display usernames in place of email addresses where appropriate.

The change is additive and backward-compatible. Existing accounts continue to work without a username; the email address is used as a fallback everywhere a username would otherwise appear. Email addresses remain the authentication credential and are only surfaced on the Settings page and the admin Developers page.

### Key Design Decisions

- **Lowercase normalisation at persistence time** — usernames are stored in lowercase regardless of what the user types. This keeps uniqueness checks simple (a single case-insensitive unique index) and avoids display inconsistencies.
- **Null-by-default** — the field is optional. Accounts created before this feature, and Google OAuth accounts, start with `username: null`. No migration is required.
- **Username returned in every auth response** — login, register, and `/auth/me` all include `username` in the user object so the client store is always up to date without extra round-trips.
- **Email removed from general auth responses** — to satisfy the privacy requirement, the `email` field is dropped from the user object returned by login/register/me. It remains available on the Settings page via a dedicated profile endpoint and on the Developers page for admin use.

---

## Architecture

The feature spans three layers:

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js / React)                                 │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Register page│  │Settings page │  │ Dashboard layout │  │
│  │ (optional    │  │ (set/update  │  │ (topbar, sidebar,│  │
│  │  username    │  │  username)   │  │  overview page)  │  │
│  │  field)      │  │              │  │                  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                   │             │
│         └─────────────────┴───────────────────┘             │
│                           │                                 │
│              useAuthStore (Zustand)                         │
│              { id, username }                               │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP / REST
┌───────────────────────────▼─────────────────────────────────┐
│  Backend (Express / Node.js)                                │
│                                                             │
│  POST /auth/register   ─── validates username, creates user │
│  POST /auth/login      ─── returns username in response     │
│  GET  /auth/me         ─── returns username in response     │
│  PATCH /auth/username  ─── updates username (auth required) │
│  GET  /admin/developers ── returns username per developer   │
└───────────────────────────┬─────────────────────────────────┘
                            │ Mongoose
┌───────────────────────────▼─────────────────────────────────┐
│  MongoDB                                                    │
│  User collection — username field (sparse unique index)     │
└─────────────────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### Backend

#### 1. User Model (`backend/models/User.js`)

Add a `username` field to the existing Mongoose schema:

```js
username: {
  type: String,
  default: null,
  sparse: true,          // allows multiple null values with a unique index
  unique: true,
  trim: true,
  minlength: 3,
  maxlength: 30,
  match: [/^[a-z0-9_-]+$/, 'Username may only contain lowercase letters, numbers, underscores, and hyphens']
}
```

A `pre('save')` hook normalises the value to lowercase before persistence:

```js
userSchema.pre('save', function(next) {
  if (this.isModified('username') && this.username) {
    this.username = this.username.toLowerCase();
  }
  next();
});
```

#### 2. Validation Schema (`backend/middleware/validation.js`)

Add a reusable username Joi rule and extend the `register` schema:

```js
const usernameRule = Joi.string()
  .trim()
  .min(3)
  .max(30)
  .pattern(/^[a-zA-Z0-9_-]+$/)
  .lowercase()
  .optional()
  .allow(null, '');

schemas.register = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  username: usernameRule
});

schemas.updateUsername = Joi.object({
  username: usernameRule.required()
});
```

#### 3. Auth Routes (`backend/routes/auth.js`)

**Register** — check username uniqueness before creating the user, include `username` in the response:

```js
// After existing email uniqueness check:
if (username) {
  const takenByUsername = await User.findOne({ username: username.toLowerCase() });
  if (takenByUsername) {
    return res.status(400).json({ error: 'Username already taken' });
  }
}

const user = await User.create({ email, password, username: username || null });

// Response user object:
{ id: user._id, username: user.username }
```

**Login** — include `username` in the response user object (email removed from general response):

```js
user: { id: user._id, username: user.username }
```

**`/auth/me`** — include `username`, remove `email` from the general response:

```js
user: { id: req.user._id, username: req.user.username, createdAt: req.user.createdAt }
```

**`PATCH /auth/username`** — new endpoint, requires authentication:

```js
router.patch('/username', verifyToken, validate(schemas.updateUsername), asyncHandler(async (req, res) => {
  const { username } = req.body;
  const normalised = username.toLowerCase();

  const conflict = await User.findOne({ username: normalised, _id: { $ne: req.userId } });
  if (conflict) {
    return res.status(400).json({ error: 'Username already taken' });
  }

  req.user.username = normalised;
  await req.user.save();

  res.json({ user: { id: req.user._id, username: req.user.username } });
}));
```

#### 4. Admin Routes (`backend/routes/admin.js`)

Update the `GET /admin/developers` handler to include `username` in the select and result mapping:

```js
const users = await User.find({})
  .select('email username createdAt lastLogin googleId plan planAssignedAt')
  // ...
const result = users.map(u => ({
  // ...existing fields...
  username: u.username ?? null,
}));
```

Update the search filter in the frontend (see below) to match against both `email` and `username`.

#### 5. Google OAuth (`backend/routes/googleAuth.js`)

No backend change needed — `username` defaults to `null` when a new user is created via Google OAuth. The redirect URL already passes `userId` and `email`; no username is passed (it will be null).

---

### Frontend

#### 1. Auth Store (`frontend/lib/store.ts`)

Extend the `User` interface and `setAuth` to carry `username`:

```ts
interface User {
  id: string
  email: string
  username: string | null
}
```

The `setAuth` action already accepts a `User` object, so no signature change is needed — callers just need to pass the `username` field from the API response.

#### 2. Register Page (`frontend/app/register/page.tsx`)

Add an optional username field to the form, below the email field:

```tsx
<input
  type="text"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  placeholder="username (optional)"
  // ...
/>
```

Pass `username` (or omit it if empty) in the registration API call:

```ts
const payload: any = { email, password }
if (username.trim()) payload.username = username.trim()
await api.post('/auth/register', payload)
```

#### 3. Settings Page (`frontend/app/dashboard/settings/page.tsx`)

Add a "Username" sub-section inside the existing Account tab. The section shows the current username (pre-populated) and a save button that calls `PATCH /auth/username`. On success, update the auth store:

```ts
const handleSaveUsername = async () => {
  const res = await api.patch('/auth/username', { username: newUsername })
  useAuthStore.getState().setAuth(
    { ...user!, username: res.data.user.username },
    accessToken!,
    refreshToken!
  )
}
```

The email field in the Account Information section remains read-only and always visible (sourced from the store, which still holds the email for settings-page use).

#### 4. Dashboard Layout (`frontend/app/dashboard/layout.tsx`)

**Sidebar** — replace `user?.email` with `user?.username ?? user?.email` in the "Logged in as" section.

**Topbar** — replace the email-prefix display and avatar initial with username-aware logic:

```tsx
// Display label
const displayName = user?.username ?? user?.email?.split('@')[0] ?? ''

// Avatar initial
const avatarInitial = (user?.username ?? user?.email ?? '')[0]?.toUpperCase() ?? '?'
```

#### 5. Overview Page (`frontend/app/dashboard/page.tsx`)

Replace `{user?.email}` in the subtitle with:

```tsx
<p className="text-sm text-gray-500 mt-0.5">
  {user?.username ?? user?.email}
</p>
```

#### 6. Developers Page (`frontend/app/dashboard/developers/page.tsx`)

Add `username` to the `Developer` interface:

```ts
interface Developer {
  // ...existing fields...
  username: string | null
}
```

Add a Username column to the table header and rows:

```tsx
// Header
<th>Username</th>

// Row
<td>{dev.username ?? '—'}</td>
```

Update the search filter to match against both fields:

```ts
const filtered = developers.filter((d) =>
  d.email.toLowerCase().includes(search.toLowerCase()) ||
  (d.username ?? '').toLowerCase().includes(search.toLowerCase())
)
```

---

## Data Models

### User (MongoDB / Mongoose)

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `_id` | ObjectId | — | Auto-generated |
| `email` | String | required, unique, lowercase | Authentication credential |
| `password` | String | required, min 8 | bcrypt-hashed |
| `username` | String | optional, unique (sparse), 3–30 chars, `/^[a-z0-9_-]+$/` | Normalised to lowercase on save; null by default |
| `googleId` | String | optional | Set for Google OAuth accounts |
| `plan` | ObjectId ref | optional | Reference to SubscriptionPlan |
| `refreshToken` | String | optional | Current refresh token |
| `loginAttempts` | Number | default 0 | Brute-force protection |
| `lockUntil` | Date | optional | Account lockout expiry |
| `lastLogin` | Date | optional | Last successful login |
| `planAssignedAt` | Date | default now | When the plan was assigned |
| `createdAt` | Date | auto | Mongoose timestamps |
| `updatedAt` | Date | auto | Mongoose timestamps |

**Index added:** `{ username: 1 }` with `{ unique: true, sparse: true }` — sparse allows multiple `null` values while still enforcing uniqueness among non-null values.

### API Response Shapes

**Auth responses (login / register / me):**
```json
{
  "user": {
    "id": "...",
    "username": "alice" | null
  }
}
```

Note: `email` is intentionally omitted from general auth responses to satisfy the privacy requirement (Requirement 7.4). The Settings page reads email from the store (populated at login time) or via a dedicated profile endpoint if needed.

**Username update response (`PATCH /auth/username`):**
```json
{
  "user": {
    "id": "...",
    "username": "alice"
  }
}
```

**Admin developers response (`GET /admin/developers`):**
```json
{
  "developers": [
    {
      "_id": "...",
      "email": "alice@example.com",
      "username": "alice" | null,
      "loginMethod": "Email" | "Google",
      "appCount": 3,
      "plan": { ... },
      "createdAt": "...",
      "lastLogin": "..."
    }
  ]
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The project uses **Vitest** with **fast-check** (already installed as a dev dependency) for property-based testing.

### Property 1: Username validation accepts exactly the valid character set

*For any* string, the username validation function should accept it if and only if, after trimming and lowercasing, it consists solely of alphanumeric characters, underscores, and hyphens, and has a length between 3 and 30 characters inclusive.

**Validates: Requirements 1.3, 1.4, 2.2, 3.2**

---

### Property 2: Username normalisation is idempotent and produces lowercase

*For any* valid username string (possibly containing uppercase letters), normalising it (lowercasing) and then normalising again should produce the same result, and the result should equal the fully-lowercased input.

**Validates: Requirements 1.5**

---

### Property 3: Username uniqueness — duplicate usernames are rejected

*For any* valid username, if one user account already holds that username, attempting to create or update a second account with the same username (case-insensitively) should fail with a "Username already taken" error.

**Validates: Requirements 1.2, 2.3, 3.3**

---

### Property 4: Auth responses always include the username field

*For any* successful login, registration, or `/auth/me` call, the response user object should always contain a `username` field (which may be null but must be present).

**Validates: Requirements 2.5, 9.1, 9.2, 9.3**

---

### Property 5: Username update round-trip

*For any* valid username string submitted to `PATCH /auth/username`, the response user object's `username` field should equal the lowercased version of the submitted value, and a subsequent `/auth/me` call should return the same value.

**Validates: Requirements 3.5**

---

### Property 6: Auth store reflects username after setAuth

*For any* user object containing a `username` field passed to `setAuth`, the store's `user.username` should equal that value immediately after the call, without requiring a page reload or re-login.

**Validates: Requirements 3.6, 9.4**

---

### Property 7: Display identity selection — username takes priority over email

*For any* user object, the display identity helper function should return the `username` when it is a non-empty string, and fall back to the email address (or email prefix for the topbar) only when `username` is null or empty.

**Validates: Requirements 4.1, 4.2, 5.1, 5.2, 6.1, 6.2**

---

### Property 8: Avatar initial reflects the correct identity source

*For any* user object, the avatar initial should be the first character (uppercased) of the `username` when set, or the first character of the `email` when `username` is null.

**Validates: Requirements 5.3, 5.4**

---

### Property 9: Email is absent from topbar/sidebar/overview when username is set

*For any* user object where `username` is a non-null, non-empty string, the rendered output of the topbar, sidebar, and overview subtitle should not contain the user's email address.

**Validates: Requirements 7.1, 7.2**

---

### Property 10: Developer search matches on both email and username

*For any* search query string and any list of developer objects, the filtered result should contain exactly those developers for whom either the `email` field or the `username` field (case-insensitively) contains the query string as a substring.

**Validates: Requirements 8.5**

---

### Property 11: Developers table always shows email regardless of username

*For any* developer object (with or without a username), the rendered table row should always include the email address in the email column.

**Validates: Requirements 8.4**

---

## Error Handling

| Scenario | Layer | HTTP Status | Response |
|---|---|---|---|
| Username already taken (register) | Backend | 400 | `{ error: "Username already taken" }` |
| Username already taken (update) | Backend | 400 | `{ error: "Username already taken" }` |
| Username format violation | Backend | 400 | `{ error: "Validation failed", details: [...] }` |
| Username update without auth token | Backend | 401 | `{ error: "Access denied" }` |
| Username too short (< 3 chars) | Backend | 400 | Joi validation detail |
| Username too long (> 30 chars) | Backend | 400 | Joi validation detail |
| Username contains invalid characters | Backend | 400 | Joi validation detail |

**Frontend error handling:**
- Username update failures surface via `toast.error(error.response?.data?.error)` in the Settings page, consistent with the existing pattern used throughout the dashboard.
- The registration form shows inline validation feedback for format errors before submission.

---

## Testing Strategy

### Unit Tests (example-based)

- User model: creating a user without a username leaves the field null (Requirement 1.6)
- Auth route: registering via Google OAuth sets username to null (Requirement 2.6)
- Auth route: unauthenticated `PATCH /auth/username` returns 401 (Requirement 3.7)
- Settings page: email is always visible in the Account Information section (Requirement 7.3)
- Developers page: username column header is present in the table (Requirement 8.1)
- Developers page: null username renders as "—" in the table (Requirement 8.3)

### Property-Based Tests (fast-check, minimum 100 iterations each)

Each property test is tagged with a comment referencing the design property it validates.

**Tag format:** `// Feature: username-system, Property {N}: {property_text}`

| Property | Test file | fast-check generators |
|---|---|---|
| 1 — Validation accepts valid set | `frontend/lib/username.test.ts` | `fc.string()`, `fc.stringMatching(/^[a-zA-Z0-9_-]{3,30}$/)` |
| 2 — Normalisation idempotence | `frontend/lib/username.test.ts` | `fc.stringMatching(/^[a-zA-Z0-9_-]{3,30}$/)` |
| 3 — Uniqueness rejection | `backend/tests/auth.property.test.js` | `fc.stringMatching(/^[a-z0-9_-]{3,30}$/)` |
| 4 — Auth response shape | `backend/tests/auth.property.test.js` | `fc.record({ email: fc.emailAddress(), password: fc.string({minLength:8}) })` |
| 5 — Update round-trip | `backend/tests/auth.property.test.js` | `fc.stringMatching(/^[a-zA-Z0-9_-]{3,30}$/)` |
| 6 — Store reflects username | `frontend/lib/store.test.ts` | `fc.option(fc.stringMatching(/^[a-z0-9_-]{3,30}$/))` |
| 7 — Display identity selection | `frontend/lib/username.test.ts` | `fc.option(fc.stringMatching(/^[a-z0-9_-]{3,30}$/))`, `fc.emailAddress()` |
| 8 — Avatar initial | `frontend/lib/username.test.ts` | `fc.option(fc.stringMatching(/^[a-z0-9_-]{3,30}$/))`, `fc.emailAddress()` |
| 9 — Email absent from UI when username set | `frontend/lib/username.test.ts` | `fc.stringMatching(/^[a-z0-9_-]{3,30}$/)`, `fc.emailAddress()` |
| 10 — Developer search | `frontend/lib/username.test.ts` | `fc.array(fc.record({...}))`, `fc.string()` |
| 11 — Developers table email always shown | `frontend/lib/username.test.ts` | `fc.array(fc.record({...}))` |

**Pure helper functions to extract for testability:**

To make properties 1, 2, 7, 8, 9, 10, and 11 testable as pure functions (without DOM or network), extract the following utilities into `frontend/lib/username.ts`:

```ts
// Validates a username string against the format rules
export function isValidUsername(value: string): boolean

// Normalises a username to lowercase
export function normaliseUsername(value: string): string

// Returns the display identity for topbar/sidebar/overview
export function getDisplayName(username: string | null, email: string): string

// Returns the email prefix fallback for the topbar
export function getEmailPrefix(email: string): string

// Returns the avatar initial character
export function getAvatarInitial(username: string | null, email: string): string

// Filters a developer list by a search query (email OR username)
export function filterDevelopers<T extends { email: string; username: string | null }>(
  developers: T[],
  query: string
): T[]
```

These functions contain all the logic that the properties test, keeping the tests fast and deterministic.

### Integration Tests

- End-to-end registration with username via the API (verifies DB persistence and response shape)
- End-to-end username update flow (verifies uniqueness enforcement and response)
- Admin developers endpoint returns username field for all accounts
