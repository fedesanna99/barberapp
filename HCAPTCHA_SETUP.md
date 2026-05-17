# hCaptcha & rate-limiting setup

The codebase has hCaptcha wired into Login, Register, and password-reset.
The widget renders only when `VITE_HCAPTCHA_SITE_KEY` is set in your env —
when unset (e.g. dev), captcha is skipped and the forms behave as before.

## 1. Get hCaptcha keys

1. Sign up at <https://www.hcaptcha.com/> (free tier is enough).
2. Add a site → get a **Site key** (public) and a **Secret key** (private).
3. For local testing without real verification, hCaptcha ships test keys:
   - Site:   `10000000-ffff-ffff-ffff-000000000001`
   - Secret: `0x0000000000000000000000000000000000000000`

## 2. Configure Supabase

Supabase Auth validates the captcha token server-side using the secret key.

1. Supabase Dashboard → **Authentication** → **Settings** → **Bot and Abuse Protection**.
2. Enable **Captcha protection**, select provider **hCaptcha**.
3. Paste the **Secret key** (NOT the site key) and save.

Supabase docs: <https://supabase.com/docs/guides/auth/auth-captcha>

## 3. Configure the frontend

In `.env` (local) and the Vercel project env vars:

```
VITE_HCAPTCHA_SITE_KEY=<your-site-key>
```

Then redeploy. The widget will appear on the auth screens; submissions
include the captcha token in `options.captchaToken` for
`signUp` / `signInWithPassword` / `resetPasswordForEmail`.

CSP in `vercel.json` already allows `*.hcaptcha.com` for script/style/frame/connect.

## 4. (Deferred) Rate-limit on /bookings insert

The IDOR/spam surface most worth protecting at the edge is the booking
insert path. Supabase Auth has its own rate-limit on signup/signin (already
in effect; tunable in dashboard → **Authentication → Rate Limits**), but
`bookings.insert` is reachable directly via PostgREST and is not limited.

This was not implemented here because Vercel rate-limiting requires a
storage backend (KV / Upstash / Edge Config). Pick one and add a middleware
that limits booking inserts per IP / user — for example:

- Vercel KV (preferred if you're already on Vercel Pro):
  <https://vercel.com/docs/storage/vercel-kv>
- Upstash Redis (free tier works, lower-friction):
  <https://upstash.com/docs/redis/tutorials/api_with_vercel_functions>

A naive cap of e.g. 5 bookings/min per `auth.uid()` is enough to neutralize
abusive scripts while staying invisible to real users.
