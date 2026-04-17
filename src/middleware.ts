/**
 * Niyam AI — Next.js Middleware
 * L5 — Frontend Route Guard: Server-side protection for /admin/* routes. (Section 7.1)
 *
 * IMPORTANT SECURITY NOTE:
 *   This middleware does NOT verify the JWT signature — it has no access to the private key.
 *   Signature verification happens on the backend API (L2 + L3) on every admin API call.
 *   This middleware is UX-only: it prevents regular users from accidentally seeing admin pages.
 *   A determined attacker CAN bypass this by calling the API directly.
 *   The real security is in Layers 1–4 (backend). (Section 7.3)
 *
 *   Frontend protection is convenience. Backend protection (L1–L4) is security. (Section 7, emphasis)
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /admin/* routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // Read JWT from httpOnly cookie
  const token = request.cookies.get('access_token')?.value

  // No token → redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Decode JWT payload (NO signature verification here — see note above)
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Base64url decode the payload
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
    const payload = JSON.parse(atob(padded))

    // Check is_admin claim
    if (!payload.is_admin) {
      // Non-admin user — redirect to their dashboard, not login
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Admin with valid token — allow through
    return NextResponse.next()

  } catch {
    // Malformed token — send to login
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

// Apply middleware only to /admin/* routes (Section 7.1)
export const config = {
  matcher: ['/admin/:path*'],
}
