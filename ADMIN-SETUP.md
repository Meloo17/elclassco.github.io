# EL CLASSCO admin panel setup

The existing public site is preserved. This branch adds an admin panel scaffold and a Supabase schema; it does not silently replace the current game catalog.

## Files
- `admin.html`: purple galaxy admin interface; Supabase Auth login; game CRUD and request moderation UI.
- `admin-config.example.js`: safe template for public Supabase URL + anon/publishable key.
- `supabase-schema.sql`: tables and Row Level Security policies.
- `admin-config.js` is intentionally not committed because it contains project-specific configuration.

## Required setup
1. Create a Supabase project.
2. Run `supabase-schema.sql` in the SQL Editor.
3. In Supabase Auth, create your own admin user and keep public signups disabled.
4. In SQL Editor, manually grant admin role to that user's UUID:
   `insert into public.profiles (id, role) values ('USER_UUID', 'admin') on conflict (id) do update set role = 'admin';`
5. Copy `admin-config.example.js` to `admin-config.js` and fill in the project URL and anon/publishable key.
6. Configure the host/deployment so `admin-config.js` is deployed but not committed if you want to keep project configuration out of the repository. Note: the anon key is public by design; RLS is the security boundary.
7. Test login with an admin account and confirm a non-admin account is rejected.

## Current limitations (do not treat as finished production admin)
- The public `index.html` still uses its embedded `games` array and `downloadLinks`. CRUD in the new database does not change the public catalog until a separate integration is made and tested.
- The existing game request form currently only shows an alert; it must be connected to `game_requests` to persist submissions.
- Chat is an embedded WidgetBot Discord channel. Moderating Discord messages requires a server-side Discord bot integration; never expose a bot token in browser code.
- A static GitHub Pages site cannot keep service secrets. Do not use a client-side password or hidden URL as authentication.
