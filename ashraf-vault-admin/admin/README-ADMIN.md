# Ashraf Vault — Admin Setup Guide

A private document vault living at `/admin/` inside your existing portfolio. Static frontend + Supabase backend, deployed on Netlify alongside your public site. Nothing about your portfolio (`index.html`, `assets/`, `html/`) is touched.

## What's here

```
admin/
├── index.html          → routes to dashboard.html or login.html based on session
├── login.html           → sign-in page
├── dashboard.html        → main vault UI (stats, file manager, storage, activity)
├── settings.html         → profile / security / storage breakdown
├── reset-password.html   → landing page for the "forgot password" email link
├── css/admin.css
├── js/
│   ├── config.example.js  → copy to config.js and fill in (config.js is gitignored)
│   ├── supabase-client.js → creates the Supabase client from config.js
│   ├── auth.js            → sign in/out, session guard, password reset
│   ├── app.js              → shared UI helpers (toasts, formatting, sidebar/topbar)
│   ├── files.js            → all data queries (list, favorite, trash, restore, share, stats)
│   ├── upload.js           → drag-and-drop upload with real progress
│   ├── dashboard.js        → wires dashboard.html together
│   └── settings.js
├── schema.sql            → run once in Supabase's SQL editor
└── .gitignore
```

## 1. Create a Supabase project
Go to [supabase.com](https://supabase.com) → New project. Note the **Project URL** and (once created) the **anon/public key** from *Project Settings → API* — you'll need both shortly.

## 2. Run the database schema
Open *SQL Editor* in Supabase, paste the full contents of `schema.sql`, and run it. This creates:
- `public.files` — file metadata, RLS'd so a user only sees their own rows
- `public.categories`, `public.file_shares`, `public.activity_log` — same ownership model
- the private `vault-files` storage bucket, plus storage policies scoped by a `<user_id>/…` path prefix

## 3. Enable email auth & create your one admin account
*Authentication → Providers* → confirm **Email** is enabled. Then *Authentication → Users → Add user* and create your own account with the email/password you want to sign in with. (You can also enable email confirmation under *Authentication → Settings* if you want a verification step.)

Because every RLS policy checks `auth.uid()`, this one account is — by construction — the only account that can ever see its own files. You don't need to write any "is this the admin" logic anywhere.

## 4. Configure the frontend
```bash
cp admin/js/config.example.js admin/js/config.js
```
Edit `admin/js/config.js`:
```js
window.ASHRAF_VAULT_CONFIG = {
  SUPABASE_URL: "https://your-project-ref.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-public-key",
  BUCKET: "vault-files",
  MAX_FILE_SIZE_MB: 100,
  ALLOWED_EXTENSIONS: [...]
};
```

**What's safe to expose vs. what's a secret:**
| Value | Safe in frontend? | Why |
|---|---|---|
| `SUPABASE_URL` | ✅ Yes | Just an endpoint address |
| `SUPABASE_ANON_KEY` | ✅ Yes | Enforces nothing by itself — every table/bucket is locked down by RLS, so this key can only ever do what a policy explicitly allows |
| `service_role` key | ❌ Never | Bypasses RLS entirely. Never put this in any file under `admin/js/` or anywhere else in the repo |
| Your account password | ❌ Never stored anywhere by this app | Supabase Auth handles hashing/verification server-side |

## 5. Local testing
Since this is a static site, any static server works:
```bash
cd Portfolio
npx serve .
# then open http://localhost:3000/admin/
```

## 6. Configure Netlify
Your `/admin/` folder is a plain subfolder of the site, so **no special Netlify routing is required** — `https://ash-geophysics.netlify.app/admin/` will resolve to `admin/index.html` automatically once deployed, exactly like any other static folder.

Two options for getting `config.js` onto Netlify without committing it:
- **Simplest:** since the values in `config.js` are safe to expose (see table above), you can commit it. If you'd rather not, use the option below.
- **Build-time injection:** add a tiny Netlify build step that writes `admin/js/config.js` from Netlify environment variables (*Site settings → Environment variables* → add `SUPABASE_URL`, `SUPABASE_ANON_KEY`), e.g. a `netlify.toml` build command like:
  ```toml
  [build]
    command = "echo \"window.ASHRAF_VAULT_CONFIG={SUPABASE_URL:'$SUPABASE_URL',SUPABASE_ANON_KEY:'$SUPABASE_ANON_KEY',BUCKET:'vault-files',MAX_FILE_SIZE_MB:100,ALLOWED_EXTENSIONS:['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv','zip','png','jpg','jpeg','webp']};\" > admin/js/config.js"
    publish = "."
  ```

## 7. Deploy
```bash
git add admin/ README-ADMIN.md
git commit -m "Add private admin document vault at /admin"
git push origin main
```
Netlify will redeploy automatically if it's connected to this GitHub repo.

## 8. Test authentication
- Visit `/admin/` while logged out → should land on `login.html`.
- Sign in with the account from step 3 → should land on `dashboard.html`.
- Wrong password → generic "Incorrect email or password" message (never reveals whether the account exists).

## 9. Upload a test file
From the dashboard, click **Upload Files**, drop a PDF in. You should see a live progress bar, a success toast, and the file appear in the table and in "Recent Uploads" within a second or two.

## 10. Verify unauthorized access is blocked
- Open dashboard.html directly while logged out → redirected to login.
- Copy a file's storage path (Supabase dashboard → Storage → vault-files) and try opening `https://<project>.supabase.co/storage/v1/object/public/vault-files/<path>` directly → should fail, because the bucket is private and there is no `/public/` route for it. Only `createSignedUrl()` calls — made from inside an authenticated session — can produce a working, time-limited link.
- Sign out, then try re-using an old signed URL after it has expired → should fail.

## About sharing
`createShareLink()` writes a row to `file_shares` with a random token, optional password hash, and an expiry. **Resolving that token for an anonymous visitor** (checking password/expiry, then minting a short-lived signed URL) needs to happen server-side with the `service_role` key — that logic can't live in the browser bundle. The recommended way is a small Supabase Edge Function, e.g.:
```
supabase functions new resolve-share
```
which looks up the token, checks `expires_at`/`revoked_at`/password, and returns a signed URL. A `share.html` page can then call that function. This is intentionally left as a follow-up so no service key ever ships in this frontend.

## Notes on what's implemented vs. scaffolded
Fully wired to Supabase: authentication, session handling/expiry, file listing with search/sort/filter/pagination, drag-and-drop upload with real progress, favorites, rename, trash/restore/permanent delete, signed-URL preview & download, per-category browsing, dashboard stats, storage usage, recent uploads, and an activity log that records every action above.

Left for you to extend: the Edge Function for public share-link resolution (above), email verification enforcement, and a dedicated grid-view file layout (the toggle button is there; it currently falls back to the list view).
