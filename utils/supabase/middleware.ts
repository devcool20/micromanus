import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing security logic below retrieveUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const path = url.pathname;

  // Define route groups
  const isAuthRoute = path === '/' || path.startsWith('/auth/callback');
  const isProtectedRoute = path.startsWith('/chat') || path.startsWith('/stats') || path.startsWith('/keys') || path.startsWith('/paywall');

  if (!user && isProtectedRoute) {
    // Redirect unauthenticated users to landing
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  if (user) {
    // If user is authenticated, check their status
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single();

    const status = profile?.status || 'free';

    if (isAuthRoute) {
      // Redirect authenticated users to appropriate app path
      url.pathname = status === 'active' ? '/chat' : '/paywall';
      return NextResponse.redirect(url);
    }

    if (status === 'free') {
      // Free users should only be allowed to access /paywall
      if (path.startsWith('/chat') || path.startsWith('/stats') || path.startsWith('/keys')) {
        url.pathname = '/paywall';
        return NextResponse.redirect(url);
      }
    } else if (status === 'active') {
      // Active users do not need to see the paywall
      if (path.startsWith('/paywall')) {
        url.pathname = '/chat';
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
