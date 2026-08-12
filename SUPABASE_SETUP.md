# Supabase Setup — PG Hunter

PG Hunter uses [Supabase](https://supabase.com) for authentication, user
profiles, saved PGs and enquiries. This guide takes you from zero to a working
login/signup (email + Google) in about 15 minutes.

---

## Step 1 — Create a Supabase project

1. Go to <https://supabase.com> and sign up (or log in).
2. Create a **new project**:
   - Pick an organization (a free personal org is fine).
   - Name: `pg-hunter`
   - Database password: create one and **save it somewhere safe**.
   - Region: pick the closest to Delhi (e.g. `Singapore`) — the free tier works
     fine for development.
3. Wait ~2 minutes while the project spins up.

## Step 2 — Copy your API keys

1. In the Supabase dashboard, open **Project Settings → API**.
2. You'll see two values:
   - **Project URL** — looks like `https://abcdefghijklm.supabase.co`
   - **anon / public key** — a long `eyJ...` string.
3. Open the project's `.env` file (create it by copying `.env.example` if it
   doesn't exist) and paste both values:

   ```env
   PUBLIC_SUPABASE_URL=https://abcdefghijklm.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
   ```

   Both are safe to expose in the browser — the anon key is public by design.
   Row Level Security (enabled in Step 3) is what actually protects the data.

## Step 3 — Create the database tables

1. Open **SQL Editor** in the Supabase dashboard (left sidebar).
2. Copy the entire contents of [`supabase/migrations/0001_auth_init.sql`](supabase/migrations/0001_auth_init.sql).
3. Paste it into the editor and click **Run**.

   This creates three tables with Row Level Security already enabled:

   | Table      | Purpose                                            |
   | ---------- | -------------------------------------------------- |
   | `profiles` | One row per user (name, phone, college, role) — auto-created on signup |
   | `saved_pgs`| Each user's saved/shortlisted PGs                  |
   | `leads`    | Enquiries students send from a listing page        |

## Step 4 — Enable email signups

Default is fine, but decide on confirmation:

- **Recommended for real users:** keep "Confirm email" **ON** (Authentication →
  Settings → Email). New users get a confirmation link before their account
  activates. The app shows a "check your inbox" message automatically.
- **For quick testing:** turn confirmation **OFF** so signups are instant.

## Step 5 — Enable Google sign-in

1. In the dashboard go to **Authentication → Providers → Google** and enable it.
2. You need a Google OAuth client (free):
   - Go to <https://console.cloud.google.com/apis/credentials> and create an
     **OAuth client ID** (type: *Web application*).
   - Authorized redirect URIs must include:
     - Local dev: `http://localhost:4321/auth/v1/callback`
     - Production (later): `https://your-domain.com/auth/v1/callback`
   - Copy the generated **Client ID** and **Client Secret** back into the
     Supabase Google provider form and **Save**.
3. Supabase shows the callback URL it expects — it always ends in
   `/auth/v1/callback`. Use that exact URL in Google Cloud.

## Step 6 — Restart the dev server

Stop the running `npm run dev` process and start it again so Astro picks up the
new `.env` values:

```bash
npm run dev
```

Open <http://localhost:4321/login> — the yellow "Supabase is not configured"
banner should be gone.

## Step 7 — Verify

1. **Signup:** go to `/login`, switch to "Sign up free", create an account. You
   should be logged in and land on the homepage (or the page you came from).
2. **Profile:** open `/profile` — it should show your name, let you add a phone
   and college, and save them.
3. **Saved PGs:** open any listing, tap the bookmark. It turns solid. Open
   `/saved` — the PG is there. Remove it and it disappears.
4. **Google:** sign out, then "Continue with Google".
5. **Enquiry:** on any PG page, "Send Enquiry" opens a form (logged in only) and
   writes a row to the `leads` table. Check it in the dashboard: **Table Editor
   → leads**.

---

## Troubleshooting

- **"Supabase is not configured"** — `.env` is missing or empty, or you didn't
  restart the dev server after editing it.
- **Signup says "check your inbox" but no email arrives** — email confirmation
  is on and Supabase's free tier emails can be slow. Check spam, or temporarily
  disable confirmation in Authentication → Settings → Email.
- **Google button errors** — the OAuth client is misconfigured. Double-check the
  redirect URI in Google Cloud is *exactly* what Supabase shows under
  Authentication → Providers → Google.
- **Profile/saved data not saving** — the SQL in Step 3 wasn't run (tables
  missing), or a page was loaded before you logged in.

## Notes

- This is the development setup. For production you'd swap the anon key usage
  for server-side Supabase calls (or keep anon + RLS, which is also valid), add
  rate limiting, and move to the Cloudflare Workers + D1 backend documented in
  [`ai/MASTER_ARCHITECTURE.md`](ai/MASTER_ARCHITECTURE.md).
- Passwords are never stored by this app — Supabase Auth handles them.
