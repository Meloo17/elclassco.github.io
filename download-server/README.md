# EL CLASSCO Download Server (prototype)

This is a separate Node.js file server for **files you have the right to distribute**. It does not alter GitHub Pages and does not contain commercial game files. It supports multiple concurrent downloads, HTTP Range requests (resume-capable clients), and checks the user's Supabase session before a download.

## Requirements

- Node.js 18 or newer
- A Supabase project (same project used by EL CLASSCO)
- A small, freely distributable test file

## Local setup on Windows

1. Open Command Prompt in this folder.
2. Copy `.env.example` to `.env`.
3. Fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY` from your existing Supabase project. These are the project URL and public/publishable anon key; never put a service-role key here.
4. Keep `HOST=127.0.0.1` for local testing. Do not expose a home PC to the public internet yet.
5. Create a `downloads` folder beside `server.js`.
6. Put a small legal test file in `downloads`, e.g. `elclassco-test.zip`.
7. Edit `manifest.json`:
   ```json
   {
     "games": [
       {
         "id": "test-file",
         "title": "EL CLASSCO test file",
         "description": "Small file used to verify downloads.",
         "filename": "elclassco-test.zip"
       }
     ]
   }
   ```
8. Run:
   ```powershell
   npm run check
   npm start
   ```
9. Check `http://127.0.0.1:8787/api/health` and `http://127.0.0.1:8787/api/games`.

The `/api/games` endpoint lists manifest entries and whether their files exist. `GET /downloads/test-file` requires `Authorization: Bearer <Supabase access token>`; an expired or missing login receives HTTP 401. Two downloads can be active simultaneously because each request is streamed independently. A `Range: bytes=...` request receives HTTP 206 when valid.

## Before public deployment

- Keep the server on localhost until you've tested it.
- Deploy behind HTTPS with a reverse proxy or a hosting service that supports Node.js and persistent storage.
- Set `HOST=0.0.0.0` only on a properly secured server, never casually on a home PC.
- Set `CORS_ORIGIN` to the exact EL CLASSCO website origin.
- Add rate limiting, disk-space monitoring, request logging, backups, and abuse protection before public launch.
- Configure the site to pass the logged-in Supabase session access token in the download request.
- Do not put a service-role key, private key, or server password in the browser or GitHub.
- Only upload game installers, demos, mods, or other files that you own or are explicitly licensed to redistribute.

## Current limits

This prototype protects download requests using Supabase Auth but does not yet connect the existing website UI to this API. It intentionally does not auto-publish or modify the live website. The frontend integration should be reviewed and tested separately before merging into `main`.
