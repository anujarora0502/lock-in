# Lock In

A mobile-first lock-in tracker for studying and work sessions. It uses Next.js for Vercel deployment and Supabase for auth and storage.

## Setup

1. Copy the Supabase env vars into `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

2. Run `schema.sql` in the Supabase SQL editor to create the new tables.
3. In Vercel, set `NEXT_PUBLIC_SITE_URL` to your production URL, for example `https://your-app.vercel.app`. Add the same URL in Supabase Auth redirect URLs.
4. Start the app:

```bash
npm run dev
```
