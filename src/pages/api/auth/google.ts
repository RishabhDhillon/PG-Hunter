import type { APIContext } from 'astro';
import { isSecureRequest, safePath } from '@/lib/server/auth';
import { OAUTH_NEXT_COOKIE, OAUTH_STATE_COOKIE, googleAuthUrl } from '@/lib/server/oauth';

export const prerender = false;

export async function GET(context: APIContext) {
  const url = new URL(context.request.url);
  const next = safePath(url.searchParams.get('next'));

  const authUrl = googleAuthUrl(context);
  if (!authUrl) {
    return context.redirect('/login?error=google-not-configured');
  }

  const state = new URL(authUrl).searchParams.get('state') ?? '';
  const oauthOpts = {
    httpOnly: true,
    secure: isSecureRequest(context),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 600,
  };
  context.cookies.set(OAUTH_STATE_COOKIE, state, oauthOpts);
  context.cookies.set(OAUTH_NEXT_COOKIE, next, oauthOpts);

  return context.redirect(authUrl);
}
