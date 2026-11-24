import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This frontend does not use Next.js Server Actions.
// Block automated bot/scanner probes sending fake Next-Action headers or POSTs to app pages
// so they never trigger Next.js Server Action stack traces in production logs.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Never interfere with proxied backend API calls
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const hasNextActionHeader =
    request.headers.has('next-action') ||
    request.headers.has('Next-Action')

  if (hasNextActionHeader || request.method === 'POST') {
    return new NextResponse(null, { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|.*\\..*).*)'],
}
