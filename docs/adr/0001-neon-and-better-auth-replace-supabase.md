# Neon Postgres and Better Auth replace Supabase

Supabase hosted both the database and sign-in. Its free project was paused for inactivity and the data was lost, so the app moved to Neon Postgres, the database provider the print calculator uses, with Better Auth running inside the app for sign-in. Only server code talks to the database; the browser never holds database credentials, unlike the old setup where it queried Supabase tables directly.

## Considered Options

- **Neon Auth** (Neon's managed Better Auth): rejected after finding its SDK still in beta, Google sign-in on by default and no sign-up allowlist. With one shared account that sees every receipt, sign-up and social sign-in need to be off in code, where they can't be re-enabled by a console setting.
