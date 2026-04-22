# Implementation Plan: Username System

## Overview

Implement a username system across the full stack: add the `username` field to the User model, expose backend endpoints for setting and updating usernames, extract pure helper utilities for testability, and update all frontend surfaces (register page, settings page, dashboard layout, overview page, developers page) to display usernames in place of email addresses where appropriate.

## Tasks

- [x] 1. Add `username` field to the User model and validation schemas
  - Add `username` field to `backend/models/User.js` with `sparse: true`, `unique: true`, `trim: true`, `minlength: 3`, `maxlength: 30`, and a regex match for `/^[a-z0-9_-]+$/`
  - Add a `pre('save')` hook that lowercases `this.username` when it is modified and non-null (chain after the existing password hook)
  - Add a `usernameRule` Joi rule to `backend/middleware/validation.js` (optional, allows null/empty, pattern `/^[a-zA-Z0-9_-]+$/`, min 3, max 30, lowercase transform)
  - Extend `schemas.register` in `validation.js` to accept the optional `username` field using `usernameRule`
  - Add `schemas.updateUsername` to `validation.js` with `username` required via `usernameRule`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.2, 2.4, 3.2, 3.4_

  - [ ]* 1.1 Write property test for username validation (Property 1)
    - **Property 1: Username validation accepts exactly the valid character set**
    - Test that `isValidUsername` returns true if and only if the trimmed, lowercased input consists solely of `[a-z0-9_-]` and has length 3–30
    - Use `fc.string()` for arbitrary inputs and `fc.stringMatching(/^[a-zA-Z0-9_-]{3,30}$/)` for valid inputs
    - **Validates: Requirements 1.3, 1.4, 2.2, 3.2**

  - [ ]* 1.2 Write property test for username normalisation idempotence (Property 2)
    - **Property 2: Username normalisation is idempotent and produces lowercase**
    - Test that `normaliseUsername(normaliseUsername(s)) === normaliseUsername(s)` and equals `s.toLowerCase()` for any valid username string
    - Use `fc.stringMatching(/^[a-zA-Z0-9_-]{3,30}$/)` as the generator
    - **Validates: Requirements 1.5**

- [x] 2. Create `frontend/lib/username.ts` with pure helper utilities
  - Implement and export `isValidUsername(value: string): boolean` — returns true iff trimmed+lowercased value matches `/^[a-z0-9_-]{3,30}$/`
  - Implement and export `normaliseUsername(value: string): string` — returns `value.toLowerCase()`
  - Implement and export `getDisplayName(username: string | null, email: string): string` — returns `username` when non-null and non-empty, otherwise `email`
  - Implement and export `getEmailPrefix(email: string): string` — returns the portion before `@`
  - Implement and export `getAvatarInitial(username: string | null, email: string): string` — returns first char (uppercased) of username when set, else first char of email; falls back to `'?'`
  - Implement and export `filterDevelopers<T extends { email: string; username: string | null }>(developers: T[], query: string): T[]` — case-insensitive substring match on both fields
  - _Requirements: 4.1, 4.2, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 7.1, 7.2, 8.5_

  - [ ]* 2.1 Write property tests for display identity selection (Property 7)
    - **Property 7: Display identity selection — username takes priority over email**
    - Test that `getDisplayName` returns the username when it is a non-empty string, and falls back to email when username is null or empty
    - Use `fc.option(fc.stringMatching(/^[a-z0-9_-]{3,30}$/))` and `fc.emailAddress()`
    - **Validates: Requirements 4.1, 4.2, 5.1, 5.2, 6.1, 6.2**

  - [ ]* 2.2 Write property tests for avatar initial (Property 8)
    - **Property 8: Avatar initial reflects the correct identity source**
    - Test that `getAvatarInitial` returns the uppercased first char of username when set, or of email when username is null
    - Use `fc.option(fc.stringMatching(/^[a-z0-9_-]{3,30}$/))` and `fc.emailAddress()`
    - **Validates: Requirements 5.3, 5.4**

  - [ ]* 2.3 Write property tests for developer search filter (Property 10)
    - **Property 10: Developer search matches on both email and username**
    - Test that `filterDevelopers` returns exactly those developers whose email or username contains the query as a case-insensitive substring
    - Use `fc.array(fc.record({ email: fc.emailAddress(), username: fc.option(fc.stringMatching(/^[a-z0-9_-]{3,30}$/)) }))` and `fc.string()`
    - **Validates: Requirements 8.5**

- [x] 3. Update backend auth routes to include `username` in all responses
  - In `backend/routes/auth.js` register handler: add username uniqueness check before `User.create`, pass `username: username || null` to `User.create`, and change the response user object to `{ id: user._id, username: user.username }`
  - In the login handler: change the response user object to `{ id: user._id, username: user.username }`
  - In the `/auth/me` handler: change the response user object to `{ id: req.user._id, username: req.user.username, createdAt: req.user.createdAt }`
  - Add `PATCH /auth/username` route (requires `verifyToken`, uses `validate(schemas.updateUsername)`): check uniqueness excluding current user, set `req.user.username = normalised`, save, return `{ user: { id, username } }`
  - _Requirements: 2.3, 2.5, 2.6, 3.3, 3.5, 3.7, 9.1, 9.2, 9.3_

  - [ ]* 3.1 Write property test for auth response shape (Property 4)
    - **Property 4: Auth responses always include the username field**
    - Test that for any valid register/login payload the response user object always contains a `username` key (value may be null)
    - Use `fc.record({ email: fc.emailAddress(), password: fc.string({ minLength: 8 }) })`
    - **Validates: Requirements 2.5, 9.1, 9.2, 9.3**

  - [ ]* 3.2 Write property test for username uniqueness rejection (Property 3)
    - **Property 3: Username uniqueness — duplicate usernames are rejected**
    - Test that registering or updating to a username already held by another account returns a 400 with "Username already taken"
    - Use `fc.stringMatching(/^[a-z0-9_-]{3,30}$/)` to generate the shared username
    - **Validates: Requirements 1.2, 2.3, 3.3**

  - [ ]* 3.3 Write property test for username update round-trip (Property 5)
    - **Property 5: Username update round-trip**
    - Test that `PATCH /auth/username` with any valid username string returns the lowercased value, and a subsequent `/auth/me` call returns the same value
    - Use `fc.stringMatching(/^[a-zA-Z0-9_-]{3,30}$/)` as the generator
    - **Validates: Requirements 3.5**

- [x] 4. Update the admin developers route to expose `username`
  - In `backend/routes/admin.js` `GET /admin/developers` handler: add `username` to the `.select(...)` call and add `username: u.username ?? null` to the result mapping object
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 5. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update the Auth Store to carry `username`
  - In `frontend/lib/store.ts`, extend the `User` interface to add `username: string | null`
  - No signature change to `setAuth` is needed — callers will pass the `username` field from the API response
  - _Requirements: 9.4_

  - [ ]* 6.1 Write property test for auth store username reflection (Property 6)
    - **Property 6: Auth store reflects username after setAuth**
    - Test that after calling `setAuth` with a user object containing any `username` value, `useAuthStore.getState().user.username` equals that value immediately
    - Use `fc.option(fc.stringMatching(/^[a-z0-9_-]{3,30}$/))` as the generator
    - **Validates: Requirements 3.6, 9.4**

- [x] 7. Update the Register page to accept an optional username field
  - Add `username` state variable to `frontend/app/register/page.tsx`
  - Add an optional username `<input>` field below the email field with placeholder "username (optional)"
  - Add inline format validation feedback (show error text if `username.trim()` is non-empty and `!isValidUsername(username.trim())`)
  - In `handleSubmit`, build the payload conditionally: include `username` only when `username.trim()` is non-empty and valid
  - Pass `username` from the API response into `setAuth` so the store is populated immediately
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 8. Update the Settings page to allow setting and updating username
  - Add `newUsername` and `usernameSaving` state variables to `frontend/app/dashboard/settings/page.tsx`
  - Pre-populate `newUsername` from `user?.username ?? ''` on mount (add a `useEffect` that watches `user`)
  - Add a "Username" sub-section inside the Account tab card, below the existing email field, with a text input and a "Save Username" button
  - In the save handler, call `api.patch('/auth/username', { username: newUsername })` and on success call `useAuthStore.getState().setAuth({ ...user!, username: res.data.user.username }, accessToken!, refreshToken!)` then show `toast.success`
  - On error, show `toast.error(error.response?.data?.error)` consistent with the existing pattern
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 7.3_

- [x] 9. Update the Dashboard Layout (sidebar and topbar) to display username
  - Import `getDisplayName`, `getEmailPrefix`, and `getAvatarInitial` from `@/lib/username` in `frontend/app/dashboard/layout.tsx`
  - In the sidebar "Logged in as" section, replace `{user?.email}` with `{getDisplayName(user?.username ?? null, user?.email ?? '')}`
  - In the topbar avatar initial, replace `{user?.email?.[0]?.toUpperCase()}` with `{getAvatarInitial(user?.username ?? null, user?.email ?? '')}`
  - In the topbar display label, replace `{user?.email?.split('@')[0]}` with `{user?.username ? user.username : getEmailPrefix(user?.email ?? '')}`
  - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 7.1_

  - [ ]* 9.1 Write property test for email absent from UI when username is set (Property 9)
    - **Property 9: Email is absent from topbar/sidebar/overview when username is set**
    - Test that when `username` is a non-null, non-empty string, `getDisplayName` and `getAvatarInitial` do not return any substring of the email address
    - Use `fc.stringMatching(/^[a-z0-9_-]{3,30}$/)` for username and `fc.emailAddress()` for email
    - **Validates: Requirements 7.1, 7.2**

- [x] 10. Update the Overview page to display username
  - In `frontend/app/dashboard/page.tsx`, import `getDisplayName` from `@/lib/username`
  - Replace `{user?.email}` in the subtitle `<p>` with `{getDisplayName(user?.username ?? null, user?.email ?? '')}`
  - _Requirements: 6.1, 6.2, 7.2_

- [x] 11. Update the Developers page to show username column and dual-field search
  - In `frontend/app/dashboard/developers/page.tsx`, add `username: string | null` to the `Developer` interface
  - Add a "Username" `<th>` column header to the table (after the Email column)
  - Add a `<td>` cell in each row that renders `{dev.username ?? '—'}`
  - Replace the `filtered` computation to use `filterDevelopers` from `@/lib/username` instead of the current email-only filter
  - Update the search input placeholder to "Search by email or username..."
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 11.1 Write property test for developers table email always shown (Property 11)
    - **Property 11: Developers table always shows email regardless of username**
    - Test that `filterDevelopers` with an empty query returns all developers, and that the email field is present on every returned object
    - Use `fc.array(fc.record({ email: fc.emailAddress(), username: fc.option(fc.stringMatching(/^[a-z0-9_-]{3,30}$/)) }))`
    - **Validates: Requirements 8.4**

- [x] 12. Final checkpoint — Ensure all tests pass
  - Run `vitest --run` in the `frontend` directory and ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties defined in the design document
- Unit tests validate specific examples and edge cases
- The pure helper functions in `frontend/lib/username.ts` (Task 2) must be created before the UI tasks (Tasks 7–11) that import them
- Backend tasks (1, 3, 4) are independent of frontend tasks and can be worked in parallel
