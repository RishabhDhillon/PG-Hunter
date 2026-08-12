/**
 * PG Hunter — Supabase auth + user data layer.
 *
 * Authentication, profiles and saved PGs live in Supabase (Auth + Postgres).
 * The browser talks to Supabase directly with the anon key; Row Level Security
 * keeps every user's data private. Property *listings* remain mock data
 * (src/data) until the Cloudflare D1 phase lands, so saved_pgs stores mock
 * property ids and the UI resolves them against src/data/properties.
 *
 * Requires env vars: PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY.
 * Run supabase/migrations/0001_auth_init.sql once in the project before use.
 */

import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = (): boolean => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;

/** Lazily-created Supabase client, or null when not configured. */
export const getClient = (): SupabaseClient | null => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
};

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  college_slug: string | null;
  role: 'student' | 'owner';
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/** The app-facing user, assembled from the Supabase session + profile row. */
export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'owner';
  phone?: string;
  collegeSlug?: string;
  avatar?: string | null;
  createdAt: string;
  provider: string;
}

export interface AuthResult {
  user?: AppUser;
  /** When sign-up requires email confirmation, no session is returned yet. */
  needsConfirmation?: boolean;
  error?: string;
}

/* ------------------------------------------------------------------ */
/* Session + profile                                                   */
/* ------------------------------------------------------------------ */

/** Quick session check (no DB round-trip). Null when logged out. */
export const getCurrentSession = async (): Promise<Session | null> => {
  const sb = getClient();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
};

let profileCache: { userId: string; profile: Profile | null; at: number } | null = null;
const PROFILE_CACHE_MS = 15_000;

const fetchProfile = async (userId: string): Promise<Profile | null> => {
  if (profileCache && profileCache.userId === userId && Date.now() - profileCache.at < PROFILE_CACHE_MS) {
    return profileCache.profile;
  }
  const sb = getClient();
  if (!sb) return null;
  const { data } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
  profileCache = { userId, profile: data ?? null, at: Date.now() };
  return data ?? null;
};

const appUserFrom = (session: Session, profile: Profile | null): AppUser => ({
  id: session.user.id,
  name:
    profile?.full_name ??
    (session.user.user_metadata?.full_name as string | undefined) ??
    session.user.email?.split('@')[0] ??
    'User',
  email: session.user.email ?? '',
  role: profile?.role ?? (session.user.user_metadata?.role as 'student' | 'owner' | undefined) ?? 'student',
  phone: profile?.phone ?? undefined,
  collegeSlug: profile?.college_slug ?? undefined,
  avatar: profile?.avatar_url ?? (session.user.user_metadata?.avatar_url as string | undefined) ?? null,
  createdAt: profile?.created_at ?? session.user.created_at,
  provider: (session.user.app_metadata?.provider as string | undefined) ?? 'email',
});

/** Currently logged-in user (session + profile), or null. */
export const getSession = async (): Promise<AppUser | null> => {
  const session = await getCurrentSession();
  if (!session) return null;
  const profile = await fetchProfile(session.user.id);
  return appUserFrom(session, profile);
};

/** Subscribe to auth changes. Returns an unsubscribe function. */
export const onAuthChange = (cb: (user: AppUser | null) => void): (() => void) => {
  const sb = getClient();
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      profileCache = null;
      cb(session ? appUserFrom(session, await fetchProfile(session.user.id)) : null);
    } else if (event === 'SIGNED_OUT') {
      profileCache = null;
      cb(null);
    }
  });
  return () => data.subscription.unsubscribe();
};

/* ------------------------------------------------------------------ */
/* Auth actions                                                        */
/* ------------------------------------------------------------------ */

const friendlyAuthError = (message: string): string => {
  const msg = message.toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Incorrect email or password. Please try again.';
  if (msg.includes('already registered')) return 'An account with this email already exists. Try logging in.';
  if (msg.includes('email not confirmed')) return 'Please confirm your email first — check your inbox for the confirmation link.';
  if (msg.includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.';
  return message;
};

/** Create a new account with email + password. */
export const register = async (input: {
  name: string;
  email: string;
  password: string;
  role?: 'student' | 'owner';
}): Promise<AuthResult> => {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (!name) return { error: 'Please enter your name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Please enter a valid email address.' };
  if (input.password.length < 6) return { error: 'Password must be at least 6 characters long.' };

  const sb = getClient();
  if (!sb) return { error: 'Supabase is not configured. Add PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY to .env' };

  const redirectTo = `${window.location.origin}/auth/callback`;
  const { data, error } = await sb.auth.signUp({
    email,
    password: input.password,
    options: {
      data: { full_name: name, role: input.role ?? 'student' },
      emailRedirectTo: redirectTo,
    },
  });

  if (error) return { error: friendlyAuthError(error.message) };
  if (!data.session) return { needsConfirmation: true };
  return { user: appUserFrom(data.session, await fetchProfile(data.session.user.id)) };
};

/** Log in with email + password. */
export const login = async (input: { email: string; password: string }): Promise<AuthResult> => {
  const sb = getClient();
  if (!sb) return { error: 'Supabase is not configured. Add PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY to .env' };

  const { data, error } = await sb.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
  if (error) return { error: friendlyAuthError(error.message) };
  if (!data.session) return { error: 'Could not start a session. Please try again.' };
  return { user: appUserFrom(data.session, await fetchProfile(data.session.user.id)) };
};

/**
 * Start Google OAuth. The user leaves to Google and returns to
 * /auth/callback, where the PKCE code is exchanged and they're redirected
 * back to `next`.
 */
export const signInWithGoogle = async (next?: string): Promise<{ error?: string }> => {
  const sb = getClient();
  if (!sb) return { error: 'Supabase is not configured. Add PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY to .env' };

  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  sessionStorage.setItem('pghunter.next', safeNext);

  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) return { error: friendlyAuthError(error.message) };
  return {};
};

/** Sign out locally; Supabase also clears its persisted session. */
export const signOut = async (): Promise<void> => {
  const sb = getClient();
  if (!sb) return;
  await sb.auth.signOut();
  profileCache = null;
};

/** Redirect to the login page (preserving a next destination) when logged out. */
export const redirectToLogin = (next?: string): void => {
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  const params = new URLSearchParams({ next: safeNext });
  window.location.replace(`/login?${params.toString()}`);
};

/** Initials avatar, e.g. "RS" for "Riya Sharma". */
export const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export const updateProfile = async (patch: {
  name?: string;
  phone?: string;
  collegeSlug?: string;
}): Promise<{ user?: AppUser; error?: string }> => {
  const sb = getClient();
  const session = await getCurrentSession();
  if (!sb || !session) return { error: 'Not logged in.' };

  const row: Record<string, string> = { id: session.user.id, updated_at: new Date().toISOString() };
  if (patch.name !== undefined) {
    if (!patch.name.trim()) return { error: 'Name cannot be empty.' };
    row.full_name = patch.name.trim();
  }
  if (patch.phone !== undefined) row.phone = patch.phone.trim();
  if (patch.collegeSlug !== undefined) row.college_slug = patch.collegeSlug;

  const { error } = await sb.from('profiles').upsert(row);
  if (error) return { error: friendlyAuthError(error.message) };

  profileCache = null;
  const profile = await fetchProfile(session.user.id);
  return { user: appUserFrom(session, profile) };
};

/* ------------------------------------------------------------------ */
/* Saved PGs                                                           */
/* ------------------------------------------------------------------ */

export const getSavedIds = async (): Promise<string[]> => {
  const sb = getClient();
  const session = await getCurrentSession();
  if (!sb || !session) return [];
  const { data } = await sb
    .from('saved_pgs')
    .select('property_id')
    .eq('user_id', session.user.id);
  return (data ?? []).map((r) => r.property_id);
};

export const isSaved = async (propertyId: string): Promise<boolean> => {
  const sb = getClient();
  const session = await getCurrentSession();
  if (!sb || !session) return false;
  const { data } = await sb
    .from('saved_pgs')
    .select('property_id')
    .eq('user_id', session.user.id)
    .eq('property_id', propertyId)
    .maybeSingle();
  return Boolean(data);
};

/** Toggle a property in the saved list. */
export const toggleSaved = async (
  propertyId: string
): Promise<{ saved: boolean; user: AppUser | null; error?: string }> => {
  const sb = getClient();
  const session = await getCurrentSession();
  if (!sb || !session) return { saved: false, user: null };

  const existing = await isSaved(propertyId);
  if (existing) {
    const { error } = await sb
      .from('saved_pgs')
      .delete()
      .eq('user_id', session.user.id)
      .eq('property_id', propertyId);
    if (error) return { saved: true, user: null, error: error.message };
    return { saved: false, user: appUserFrom(session, await fetchProfile(session.user.id)) };
  }

  const { error } = await sb.from('saved_pgs').insert({ user_id: session.user.id, property_id: propertyId });
  if (error) return { saved: false, user: null, error: error.message };
  return { saved: true, user: appUserFrom(session, await fetchProfile(session.user.id)) };
};
