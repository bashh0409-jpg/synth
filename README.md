This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Supabase setup

The account avatar and automatic workspace setup require
Supabase resources. The migrations in `supabase/migrations/` create the public
Storage bucket named `avatars`, the `public.profiles` table, and the
`public.workspaces` table with per-user row-level security policies.

To create them in your Supabase project, run both migration files in timestamp
order in the Supabase Dashboard SQL Editor. If this repository is linked to
your project with the Supabase CLI, apply them with `supabase db push`.

If the app reports `PGRST205` for `public.workspaces`, verify the migrations
were applied to the project configured by `NEXT_PUBLIC_SUPABASE_URL`. Then run
this in that project's SQL Editor to refresh PostgREST's schema cache:

```sql
NOTIFY pgrst, 'reload schema';
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
