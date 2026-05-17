import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - apps/ (static mobile apps)
     * - app_logo.png
     * - logo.png
     */
    '/((?!api|_next/static|_next/image|favicon.ico|apps|app_logo.png|logo.png).*)',
  ],
};

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';

  // Get the subdomain (e.g., "school-a.tkclocking.com" -> "school-a")
  // Handle localhost (e.g., "school-a.localhost:3000" -> "school-a")
  let subdomain = '';
  
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('10.')) {
    // Local dev environments (e.g., school-a.localhost:3000 or IP addresses)
    // For raw IP addresses or simple localhost:3000, we don't have a subdomain.
    const parts = hostname.split('.');
    if (parts.length > 1 && !hostname.startsWith('localhost') && !hostname.startsWith('127.') && !hostname.startsWith('10.')) {
       subdomain = parts[0];
    }
  } else {
    // Production (e.g., school-a.tkclocking.com)
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      subdomain = parts[0];
    }
  }

  // Prevent rewriting if it's the main root domain (e.g., tkclocking.com or www.tkclocking.com or admin.tkclocking.com)
  if (
    subdomain === '' ||
    subdomain === 'www' ||
    subdomain === 'admin'
  ) {
    return NextResponse.next();
  }

  // If a valid tenant subdomain is detected, rewrite the path internally!
  // Example: greenwood.tkclocking.com/login -> internally maps to /_tenants/greenwood/login
  return NextResponse.rewrite(new URL(`/_tenants/${subdomain}${url.pathname}`, req.url));
}
