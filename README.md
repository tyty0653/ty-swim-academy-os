# TY Swim Academy OS

Standalone internal operations system for TY Swim Academy staff.

This app is separate from the public `ty-swim-academy` marketing website. It uses Supabase Auth, Database, Row Level Security, and private Storage.

## Quick Start

```bash
npm install
npm run dev
```

Create `.env.local`:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Do not put a Supabase `service_role` key in `.env.local` or Vercel frontend environment variables.

Run `supabase/schema.sql` in Supabase, create the first Admin profile, then open `/login`.

Full setup notes are in `docs/ty-swim-academy-os.md`.

## Local QA

```bash
npm run build
npm run smoke:routes
```

Use `supabase/demo-seed.sql` with a Supabase test project for fake Admin/Coach workflow data. See `docs/ty-swim-academy-os-testing-guide.md`.
