# Requirements Document

## Introduction

This feature adds a username system to the Adarsh Auth platform. Currently, every part of the dashboard identifies users by their email address. With this feature, each developer account can have a unique username that is displayed throughout the dashboard (topbar, sidebar, overview page) in place of the email. Email addresses remain stored and functional for authentication but are hidden from general display — visible only on the user's own profile/settings page. Usernames can be set during or after registration and can be updated at any time from the settings page. The admin Developers page will show both username and email for full visibility.

## Glossary

- **Dashboard_User**: A registered developer account on the Adarsh Auth platform.
- **Username**: A unique, human-readable display name chosen by a Dashboard_User, used to identify them across the dashboard UI.
- **Email**: The email address used for authentication; not displayed publicly in the dashboard except on the user's own settings page.
- **Auth_Store**: The client-side Zustand store (`useAuthStore`) that holds the authenticated user's session data.
- **Settings_Page**: The dashboard page at `/dashboard/settings` where a Dashboard_User manages their account.
- **Developers_Page**: The admin-only dashboard page at `/dashboard/developers` that lists all registered developer accounts.
- **Topbar**: The sticky header bar rendered in the dashboard layout above all dashboard pages.
- **Sidebar**: The fixed left navigation panel rendered in the dashboard layout.
- **Overview_Page**: The main dashboard landing page at `/dashboard`.
- **Username_API**: The backend REST endpoint responsible for setting and updating usernames.

---

## Requirements

### Requirement 1: Username Field on the User Model

**User Story:** As a platform developer, I want the User model to support a username field, so that each account can have a unique display name stored persistently.

#### Acceptance Criteria

1. THE User_Model SHALL include a `username` field of type String that is optional at account creation time.
2. THE User_Model SHALL enforce uniqueness on the `username` field across all Dashboard_User records.
3. THE User_Model SHALL enforce that a stored `username` contains only alphanumeric characters, underscores, and hyphens.
4. THE User_Model SHALL enforce that a stored `username` is between 3 and 30 characters in length.
5. THE User_Model SHALL store `username` values in a case-insensitive manner by normalising them to lowercase before persistence.
6. WHEN a Dashboard_User registers without providing a username, THE User_Model SHALL allow the `username` field to remain null.

---

### Requirement 2: Set Username During Registration

**User Story:** As a new user, I want to optionally set a username when I register, so that my dashboard is personalised from the start.

#### Acceptance Criteria

1. WHEN a Dashboard_User submits the registration form, THE Registration_Form SHALL accept an optional `username` field alongside email and password.
2. WHEN a Dashboard_User submits a registration request with a `username` value, THE Auth_API SHALL validate the username against the format rules defined in Requirement 1 before creating the account.
3. IF a Dashboard_User submits a registration request with a `username` that is already taken, THEN THE Auth_API SHALL return a 400 error with the message "Username already taken".
4. IF a Dashboard_User submits a registration request with a `username` that violates the format rules, THEN THE Auth_API SHALL return a 400 error with a descriptive message identifying the violation.
5. WHEN a Dashboard_User completes registration, THE Auth_API SHALL include the `username` field (which may be null) in the response user object.
6. WHEN a Dashboard_User completes registration via Google OAuth, THE Auth_API SHALL set `username` to null for the new account, allowing the user to set it later from the Settings_Page.

---

### Requirement 3: Set and Update Username from Settings

**User Story:** As a logged-in user, I want to set or change my username from the settings page, so that I can personalise or update my display name at any time.

#### Acceptance Criteria

1. WHEN a Dashboard_User visits the Settings_Page, THE Settings_Page SHALL display a username input field pre-populated with the current username value, or empty if no username has been set.
2. WHEN a Dashboard_User submits a username change, THE Username_API SHALL validate the new value against the format rules defined in Requirement 1.
3. IF a Dashboard_User submits a username that is already taken by another account, THEN THE Username_API SHALL return a 400 error with the message "Username already taken".
4. IF a Dashboard_User submits a username that violates the format rules, THEN THE Username_API SHALL return a 400 error with a descriptive message identifying the violation.
5. WHEN a Dashboard_User successfully updates their username, THE Username_API SHALL return the updated user object including the new `username` value.
6. WHEN a Dashboard_User successfully updates their username, THE Auth_Store SHALL update the stored user object to reflect the new `username` value without requiring a full re-login.
7. THE Username_API SHALL require a valid authentication token; WHEN an unauthenticated request is received, THE Username_API SHALL return a 401 error.

---

### Requirement 4: Username Displayed in the Sidebar

**User Story:** As a logged-in user, I want to see my username in the sidebar instead of my email, so that my identity is shown in a friendly, privacy-respecting way.

#### Acceptance Criteria

1. WHILE a Dashboard_User is authenticated and has a username set, THE Sidebar SHALL display the username in the "Logged in as" section instead of the email address.
2. WHILE a Dashboard_User is authenticated and has no username set, THE Sidebar SHALL display the email address in the "Logged in as" section as a fallback.
3. THE Sidebar SHALL truncate display values that exceed the available width to prevent layout overflow.

---

### Requirement 5: Username Displayed in the Topbar

**User Story:** As a logged-in user, I want to see my username in the topbar avatar area instead of my email prefix, so that my identity is consistently shown across the dashboard.

#### Acceptance Criteria

1. WHILE a Dashboard_User is authenticated and has a username set, THE Topbar SHALL display the username as the primary identity label next to the avatar.
2. WHILE a Dashboard_User is authenticated and has no username set, THE Topbar SHALL display the email prefix (the portion before `@`) as a fallback.
3. WHILE a Dashboard_User is authenticated and has a username set, THE Topbar SHALL use the first character of the username as the avatar initial.
4. WHILE a Dashboard_User is authenticated and has no username set, THE Topbar SHALL use the first character of the email address as the avatar initial.

---

### Requirement 6: Username Displayed on the Overview Page

**User Story:** As a logged-in user, I want to see my username on the overview page subtitle instead of my email, so that the dashboard greeting reflects my chosen identity.

#### Acceptance Criteria

1. WHILE a Dashboard_User is authenticated and has a username set, THE Overview_Page SHALL display the username in the subtitle area beneath the "Overview" heading.
2. WHILE a Dashboard_User is authenticated and has no username set, THE Overview_Page SHALL display the email address in the subtitle area as a fallback.

---

### Requirement 7: Email Privacy — Hidden by Default

**User Story:** As a user, I want my email address to be hidden from general dashboard display, so that my personal contact information is not unnecessarily exposed.

#### Acceptance Criteria

1. THE Dashboard_Layout SHALL not render the Dashboard_User's email address in the Topbar or Sidebar when a username is available.
2. THE Overview_Page SHALL not render the Dashboard_User's email address in the subtitle when a username is available.
3. WHEN a Dashboard_User visits the Settings_Page, THE Settings_Page SHALL display the Dashboard_User's email address in the Account Information section, regardless of whether a username is set.
4. THE Auth_API SHALL not include the email address in API responses that are consumed by general dashboard UI components other than the Settings_Page and the Developers_Page.

---

### Requirement 8: Username Shown on the Developers Page

**User Story:** As an admin, I want to see each developer's username alongside their email on the Developers page, so that I can identify accounts by both their display name and their login credential.

#### Acceptance Criteria

1. WHEN the Developers_Page loads, THE Developers_Page SHALL fetch and display a `username` column in the developer table.
2. WHILE a developer account has a username set, THE Developers_Page SHALL display the username in the username column.
3. WHILE a developer account has no username set, THE Developers_Page SHALL display a "—" placeholder in the username column.
4. THE Developers_Page SHALL continue to display the email address in the existing email column regardless of whether a username is set.
5. WHEN the admin searches the developer list, THE Developers_Page SHALL match the search query against both the email field and the username field.

---

### Requirement 9: Username Included in Auth Token Responses

**User Story:** As a frontend developer, I want the username to be returned in authentication responses, so that the client-side store can be populated without an additional API call.

#### Acceptance Criteria

1. WHEN a Dashboard_User successfully logs in, THE Auth_API SHALL include the `username` field in the response user object.
2. WHEN a Dashboard_User successfully registers, THE Auth_API SHALL include the `username` field in the response user object.
3. WHEN a Dashboard_User calls the `/auth/me` endpoint, THE Auth_API SHALL include the `username` field in the response user object.
4. THE Auth_Store SHALL store the `username` field as part of the user object so that all dashboard components can read it without additional API calls.
