import { NextRequest, NextResponse } from 'next/server'

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/sign-in',
  '/sign-up',
  '/reset-password',
  '/api/auth'
]

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/workflows',
  '/marketplace',
  '/tokens',
  '/profile',
  '/settings',
  '/demo'
]

// Helper function to check if route matches pattern
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow public routes
  if (matchesRoute(pathname, publicRoutes)) {
    return NextResponse.next()
  }
  
  // For protected routes, we'll handle auth on the client side
  // since Firebase auth state is managed in the browser
  if (matchesRoute(pathname, protectedRoutes)) {
    return NextResponse.next()
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}