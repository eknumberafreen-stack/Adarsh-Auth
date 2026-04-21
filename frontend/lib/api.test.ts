/**
 * Property-Based Tests for api.ts response interceptor
 *
 * Property 15: Upgrade prompt shown on any 403 limit response
 * Validates: Requirements 9.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'

// ---------------------------------------------------------------------------
// Hoist mock variables so they are available when vi.mock factories run
// ---------------------------------------------------------------------------
const { mockToastError, mockToastDismiss } = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastDismiss: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), {
    error: mockToastError,
    dismiss: mockToastDismiss,
  }),
}))

vi.mock('axios', () => {
  const interceptorUse = vi.fn()
  const instance = {
    interceptors: {
      request: { use: interceptorUse },
      response: { use: interceptorUse },
    },
    defaults: { headers: { common: {} } },
  }
  return {
    default: Object.assign(vi.fn(() => instance), {
      create: vi.fn(() => instance),
      post: vi.fn(),
    }),
  }
})

// Import the pure helper functions after mocks are registered
import { isPlanLimitError, showUpgradePrompt } from './api'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('api.ts – upgrade prompt helpers (Property 15)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // isPlanLimitError – pure function tests
  // -------------------------------------------------------------------------

  /**
   * Property 15: Upgrade prompt shown on any 403 limit response
   *
   * For ANY error object with status 403 and upgradeRequired: true,
   * isPlanLimitError MUST return true.
   *
   * Validates: Requirements 9.6
   */
  it('Property 15 – isPlanLimitError returns true for any 403 + upgradeRequired:true response', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary extra fields that might appear in the response body
        fc.record({
          message: fc.string(),
          resource: fc.constantFrom('applications', 'usersPerApp', 'licensesPerApp'),
          current: fc.nat({ max: 1000 }),
          limit: fc.nat({ max: 100 }),
        }),
        (extraBody) => {
          const error = {
            response: {
              status: 403,
              data: {
                upgradeRequired: true,
                ...extraBody,
              },
            },
          }
          expect(isPlanLimitError(error)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 15 (negative): 403 responses WITHOUT upgradeRequired: true must
   * NOT be identified as plan-limit errors.
   *
   * Validates: Requirements 9.6 (only trigger on upgradeRequired flag)
   */
  it('Property 15 (negative) – isPlanLimitError returns false for 403 without upgradeRequired', () => {
    fc.assert(
      fc.property(
        fc.record({
          message: fc.string(),
          upgradeRequired: fc.constantFrom(false, undefined, null, 0, ''),
        }),
        (body) => {
          const error = {
            response: {
              status: 403,
              data: body,
            },
          }
          expect(isPlanLimitError(error)).toBe(false)
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Property 15 (boundary): Non-403 status codes with upgradeRequired: true
   * must NOT be identified as plan-limit errors.
   *
   * Validates: Requirements 9.6 (only 403 triggers the prompt)
   */
  it('Property 15 (boundary) – isPlanLimitError returns false for non-403 status codes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 400, max: 599 }).filter((s) => s !== 403),
        (status) => {
          const error = {
            response: {
              status,
              data: { upgradeRequired: true },
            },
          }
          expect(isPlanLimitError(error)).toBe(false)
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Property 15 (edge): Malformed / null / undefined errors must not throw
   * and must return false.
   */
  it('Property 15 (edge) – isPlanLimitError handles malformed errors gracefully', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant({}),
          fc.constant({ response: null }),
          fc.constant({ response: { status: 403 } }), // no data
          fc.string()
        ),
        (error) => {
          expect(() => isPlanLimitError(error)).not.toThrow()
          expect(isPlanLimitError(error)).toBe(false)
        }
      ),
      { numRuns: 50 }
    )
  })

  // -------------------------------------------------------------------------
  // showUpgradePrompt – verifies toast.error is called
  // -------------------------------------------------------------------------

  /**
   * Property 15 (integration): showUpgradePrompt MUST call toast.error exactly
   * once with a render function (for the custom toast with billing link).
   *
   * Validates: Requirements 9.6
   */
  it('Property 15 (integration) – showUpgradePrompt calls toast.error with a render function', () => {
    showUpgradePrompt()

    expect(mockToastError).toHaveBeenCalledTimes(1)

    // First argument should be a function (custom render)
    const [renderFn, options] = mockToastError.mock.calls[0]
    expect(typeof renderFn).toBe('function')

    // Options should include the plan-limit-reached id
    expect(options).toMatchObject({ id: 'plan-limit-reached' })
  })
})
