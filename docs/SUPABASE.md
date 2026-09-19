# Supabase setup for Klocky sync

## 1. Database

In the Supabase dashboard, open **SQL** → **New query**, paste the contents of [`supabase/migrations/001_user_sync.sql`](../supabase/migrations/001_user_sync.sql), and run it.

That creates `public.user_sync` with row-level security so each signed-in user can only read/write their own row.

## 2. Auth redirect URLs

**Authentication** → **URL configuration**:

| Setting | Values |
|--------|--------|
| **Site URL** | Production URL, e.g. `https://your-site.netlify.app` |
| **Redirect URLs** | `http://localhost:5173/**`, your production origin `https://your-site.netlify.app/**`, and preview URLs if you use Netlify deploy previews |

Magic links return to whatever page the user was on when they requested the link.

## 3. Local environment

```sh
cp .env.example .env.local
```

Fill in from **Project Settings** → **API**:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY` (safe in the browser; RLS protects data)

Restart the dev server after changing env vars:

```sh
npm run dev
```

## 4. Production (Netlify)

**Site configuration** → **Environment variables**: add the same two `VITE_*` variables, then redeploy.

## 5. Smoke test

1. Favorite two clocks → sync sheet (optional).
2. Enter email → **Email me a sign-in link**.
3. Open the link from your inbox (same browser profile helps).
4. Toast: “Favorites synced to your account.”
5. **Settings** → signed-in email; favorites should match after a second device signs in with the same account.

## What syncs

Stored in `user_sync.payload` (JSON):

- `favorites` (curated ids)
- `savedFavorites` (custom configurations)
- Subset of `preferences`: weather location, time zone, locale, units, 24h, seconds

Merge strategy: union favorites/configs; fill empty preference fields from the cloud. Local-first if sync is down.
