# Protlys Hub — Google Sign-In setup

Protlys Hub uses Supabase Auth with Google's OAuth flow and Next.js PKCE callbacks.

## 1. Google Cloud / Google Auth Platform

Open Google Auth Platform and use the existing **Protlys Hub** web OAuth client.

### Authorized JavaScript origins

Add:

```text
https://protlys.com
```

For local development also add:

```text
http://localhost:3000
```

### Authorized redirect URI

Google must redirect back to the **Supabase Auth callback**, not directly to the Next.js callback:

```text
https://sulricjcirnpncwaiblg.supabase.co/auth/v1/callback
```

This is the callback Google authorizes. Supabase then sends the user to the Protlys Hub callback.

## 2. Supabase Auth

In the Hub Supabase project:

**Authentication → Providers → Google**

Make sure Google is enabled and the same Google **Client ID** and **Client Secret** are entered there.

Then go to:

**Authentication → URL Configuration**

Set the production **Site URL** to:

```text
https://protlys.com
```

Add these Redirect URLs:

```text
https://protlys.com/auth/callback
http://localhost:3000/auth/callback
```

If Vercel preview deployments need OAuth testing, add a suitable Vercel wildcard redirect URL as permitted by Supabase's redirect URL rules.

## 3. Google OAuth consent / audience

If the Google app is still in **Testing**, the Google account being used to test must be included as a test user in Google Auth Platform.

For a public launch, complete Google's required audience/branding/verification setup as applicable. Supabase's current Google setup requires the `openid`, email and profile scopes for normal Google authentication.

## 4. How Protlys Hub handles the flow

The application uses authorization-code + PKCE:

```text
Protlys Hub
   ↓
Supabase Auth /authorize
   ↓
Google
   ↓
Supabase /auth/v1/callback
   ↓
Protlys /auth/callback
   ↓
Hub
```

The Next.js callback exchanges the authorization code for the Supabase session. The callback also validates the optional `next` destination so OAuth cannot be used as an open redirect.

The login and signup buttons both use `prompt=select_account`, so users can choose the Google account they want instead of being silently pushed into whichever Google account is already active in the browser.

## 5. Important distinction

Do **not** put this in Google's Authorized redirect URIs:

```text
https://protlys.com/auth/callback
```

Google's redirect URI is the Supabase callback:

```text
https://sulricjcirnpncwaiblg.supabase.co/auth/v1/callback
```

The Protlys `/auth/callback` URL belongs in **Supabase's Redirect URLs** list.

## 6. Troubleshooting

### Google says “Access blocked” or “invalid request”

Check these in order:

1. Google OAuth client is a **Web application**.
2. Google Authorized redirect URI exactly matches the Supabase callback above.
3. Supabase Google provider is enabled.
4. The Google Client ID and Secret in Supabase match the Google web client.
5. Supabase Site URL is `https://protlys.com`.
6. Supabase Redirect URLs include `https://protlys.com/auth/callback`.
7. If Google is in Testing mode, the Google account is listed as a test user.
8. Google OAuth consent/audience configuration is complete.

### Protlys redirects to `/login` with an OAuth error

The app now surfaces the OAuth error on the login screen. Check the error text first; it normally identifies whether the problem is the provider, redirect configuration, or code exchange.

### OAuth reaches `/auth/callback` but the session is not created

Protlys Hub uses PKCE. The browser client and server callback must retain the PKCE verifier cookies. The auth proxy intentionally skips session refresh for `/auth/callback` so it does not interfere with the one-time code exchange.
