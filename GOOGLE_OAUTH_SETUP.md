# Setting Up Google Sign-In for Protlys Hub

Follow these steps exactly. Takes about 10 minutes.

---

## Step 1 — Create a Google OAuth App

1. Go to: https://console.cloud.google.com
2. Click **Select a project** at the top → **New Project**
3. Name it `Protlys Hub` → click **Create**
4. In the left menu, go to **APIs & Services → OAuth consent screen**
5. Choose **External** → click **Create**
6. Fill in:
   - App name: `Protlys Hub`
   - User support email: your email
   - Developer contact email: your email
7. Click **Save and Continue** through all steps (you can skip optional fields)
8. Click **Back to Dashboard**

---

## Step 2 — Create OAuth Credentials

1. In the left menu, go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth 2.0 Client IDs**
3. Application type: **Web application**
4. Name: `Protlys Hub`
5. Under **Authorised redirect URIs**, click **Add URI** and paste:
   ```
   https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
   ```
   *(Replace YOUR_SUPABASE_PROJECT_REF with the ref from your Supabase project URL)*
6. Click **Create**
7. Copy the **Client ID** and **Client Secret** — you'll need these next

---

## Step 3 — Add to Supabase

1. Go to **supabase.com** → your project
2. Click **Authentication** in the left sidebar
3. Click **Providers**
4. Find **Google** and toggle it **on**
5. Paste your **Client ID** and **Client Secret**
6. Click **Save**

---

## Step 4 — Done!

The "Continue with Google" button on your login and signup pages will now work.

Users click it → Google sign-in popup → automatically redirected to the Hub.

---

## Finding your Supabase Project Ref

Go to supabase.com → your project → Settings → General.
The Project Ref is the string under "Reference ID" (looks like `abcdefghijklmnop`).
Your callback URL is: `https://abcdefghijklmnop.supabase.co/auth/v1/callback`
