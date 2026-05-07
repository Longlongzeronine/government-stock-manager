# Hosted Supabase Auth Fix

This app uses hosted Supabase from `.env`:

```env
VITE_SUPABASE_URL=https://pogmvgqfirovujjwgaqi.supabase.co
```

To remove `Email signups are disabled`:

1. Open Supabase Dashboard.
2. Select project `pogmvgqfirovujjwgaqi`.
3. Go to `Authentication` -> `Providers` -> `Email`.
4. Enable `Allow new users to sign up`.
5. For dev, disable `Confirm email`.
6. Save.

Local-only config already exists in `supabase/config.toml`:

```toml
[auth.email]
enable_signup = true
enable_confirmations = false
```

Hosted Supabase ignores local `supabase/config.toml`.
