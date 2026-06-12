/**
 * Niyam AI — Next.js Middleware
 * Protects /admin/* routes: requires a valid admin_access_token cookie.
 * This is a UX guard only — real security is enforced on the backend API.
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /admin-login: allow access, but redirect to /admin if already authenticated as admin
  if (pathname === '/admin-login') {
    const adminToken = request.cookies.get('admin_access_token')?.value
    if (adminToken) {
      const payload = decodeJwtPayload(adminToken)
      if (payload?.type === 'admin_access' && payload.exp > Date.now() / 1000) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    }
    return NextResponse.next()
  }

  // /admin/*: require valid admin_access_token cookie
  if (pathname.startsWith('/admin')) {
    const adminToken = request.cookies.get('admin_access_token')?.value

    if (!adminToken) {
      return NextResponse.redirect(new URL('/admin-login', request.url))
    }

    const payload = decodeJwtPayload(adminToken)

    if (!payload || payload.type !== 'admin_access' || payload.exp <= Date.now() / 1000) {
      const res = NextResponse.redirect(new URL('/admin-login', request.url))
      res.cookies.delete('admin_access_token')
      return res
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/admin-login'],
}
