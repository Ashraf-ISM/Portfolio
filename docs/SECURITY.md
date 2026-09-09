# Security notes

Operational notes for this repository. Read this before re-adding third-party
scripts or changing anything under `manage/`.

---

## 1. The Google Maps API key — action required

A Google Maps browser key (the one beginning `AIzaSyAIA_zq…`) was
hard-coded in `index.html` and is **permanently present in this repository's git
history**. Rewriting history will not reliably un-publish it, so treat it as
compromised.

The embed itself has been removed, because it was already broken: the
`#google-maps` container it rendered into no longer existed on the page, so the
script downloaded roughly half a megabyte from Google, consumed billable quota
and threw `initMap is not a function` on every single page load while showing
nothing at all.

### What you must do in the Google Cloud Console

Nothing in this repository can apply these settings. They are console-only:

1. **Delete or regenerate the key.** The site no longer uses it, so deleting it
   is the clean option. Regenerate instead only if the same key is used by
   another project.
2. If you keep a key, **add an HTTP referrer restriction**:
   `https://ash-geophysics.netlify.app/*`, plus
   `http://localhost:*/*` only while developing locally.
3. **Restrict it by API** to just the Maps JavaScript API. A key with no API
   restriction can be spent against every billable Google API on the project.
4. **Set a budget alert** on the billing account so runaway usage is visible.

### What does *not* work

A Google Maps browser key **cannot be kept secret**. It is sent to every
visitor's browser, so it is readable in DevTools no matter how it is stored.
Moving it into a Netlify environment variable, a separate JS file, or a build
step changes nothing about its visibility — it only makes the key harder for
*you* to find. Referrer + API restrictions are the actual control; they make a
leaked key useless to anyone else.

### Restoring a map later

A working embed needs all three of these, not just the script tag:

- a container element, e.g. `<div id="google-maps" style="height:400px"></div>`
- an `initMap()` function defined **before** the callback fires
- a referrer-restricted key

The original init function is recoverable from history:
`git show 774a86a:assets/js/google-maps.js`

A privacy-friendlier alternative that needs no key and no billing account is an
OpenStreetMap iframe.

---

## 2. Supabase keys (`manage/admin/`)

The admin area uses two values that are **designed to be public**: the project
URL and the anon/publishable key. Shipping them to the browser is expected and
is not a leak.

What actually protects the data is Row Level Security. `manage/admin/schema.sql`
enables RLS on every table and scopes each policy to `auth.uid() = user_id`,
and the storage bucket is private. That is the correct setup — keep it that way.

Two things that would be real incidents:

- **Never** put the `service_role` key in any file under this repository. It
  bypasses RLS entirely.
- **Never** disable RLS on a table to "fix" a query.

Note that `manage/admin/js/config.js` is gitignored but its values are already
in history (commits `3d1f1ef`, `cadee0f`). That is acceptable for a publishable
key, but the `.gitignore` comment claiming the values were never committed is
inaccurate.

---

## 3. Response headers

Set in `netlify.toml` for all routes:

| Header | Value | Why |
|---|---|---|
| `X-Frame-Options` | `DENY` | blocks clickjacking via framing |
| `X-Content-Type-Options` | `nosniff` | stops MIME-type guessing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | trims referrer leakage |
| `Permissions-Policy` | geolocation/mic/camera/payment/usb off | drops unused capabilities |
| `Cross-Origin-Opener-Policy` | `same-origin` | isolates the browsing context |

`/manage/*` additionally sends `X-Robots-Tag: noindex, nofollow` and
`Cache-Control: no-store`.

### Content-Security-Policy is deliberately absent

A CSP is *not* set. The remaining third-party origins are Google Fonts,
cdnjs (GSAP) and jsDelivr (the Supabase client). A CSP is worth adding, but it
must be written and then tested against every page — a wrong `script-src` or
`font-src` silently breaks fonts or the admin login with no visible error.

Suggested starting point, to roll out as `Content-Security-Policy-Report-Only`
first and promote only once the reports are clean:

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data:;
connect-src 'self' https://*.supabase.co;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

`'unsafe-inline'` is required as written because the pages carry inline
`<style>` blocks, inline `style=` attributes and inline `<script>` blocks.
Removing it means moving all of those out to files first.

---

## 4. Recurring checks

- Never commit `service_role` keys, `.env` files, or private SSH keys.
  (A public SSH key was previously committed at the repo root; it has been
  removed. Public keys are not secrets, but they do not belong in a web root.)
- Everything in this repository is published by Netlify. Any file committed
  here is downloadable by anyone who guesses the URL.
- Before adding a third-party script, check it is actually used by a page.
