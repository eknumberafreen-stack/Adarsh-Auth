/**
 * Pure helper utilities for the username system.
 * These functions are used across the dashboard UI and are tested via property-based tests.
 */

/**
 * Returns true iff the trimmed, lowercased value matches the valid username pattern:
 * 3–30 characters, consisting only of lowercase letters, digits, underscores, and hyphens.
 */
export function isValidUsername(value: string): boolean {
  return /^[a-z0-9_-]{3,30}$/.test(value.trim().toLowerCase())
}

/**
 * Normalises a username to lowercase.
 */
export function normaliseUsername(value: string): string {
  return value.toLowerCase()
}

/**
 * Returns the display name for a user.
 * Prefers username when it is a non-null, non-empty string; falls back to email.
 */
export function getDisplayName(username: string | null, email: string): string {
  if (username !== null && username !== '') {
    return username
  }
  return email
}

/**
 * Returns the portion of an email address before the '@' symbol.
 */
export function getEmailPrefix(email: string): string {
  return email.split('@')[0]
}

/**
 * Returns the avatar initial character (uppercased).
 * Uses the first character of username when set, otherwise the first character of email.
 * Falls back to '?' if neither yields a character.
 */
export function getAvatarInitial(username: string | null, email: string): string {
  const source = (username !== null && username !== '') ? username : email
  return source[0]?.toUpperCase() ?? '?'
}

/**
 * Filters a list of developers by a search query.
 * Performs a case-insensitive substring match against both the email and username fields.
 */
export function filterDevelopers<T extends { email: string; username: string | null }>(
  developers: T[],
  query: string
): T[] {
  const lower = query.toLowerCase()
  return developers.filter(
    (d) =>
      d.email.toLowerCase().includes(lower) ||
      (d.username ?? '').toLowerCase().includes(lower)
  )
}
