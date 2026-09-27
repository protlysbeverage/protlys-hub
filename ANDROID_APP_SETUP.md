# Protlys Hub Android

This repository now includes the Capacitor Android layer for Protlys Hub.

## Architecture

The Android application uses Capacitor 8 and loads the production Protlys Hub at:

https://hub.protlys.com

The existing Next.js/Supabase web application remains the source of truth. No Android-specific fork of the product is created.

## Application ID

com.protlys.hub

Treat this as permanent once the app is published.

## Local development

Capacitor 8 requires Node.js 22+.

```bash
npm install
npm run android:add
npm run android:sync
npm run android:open
```

Android Studio is required to run the native project locally.

## Google Play release build

The GitHub Actions workflow generates the Android project, syncs Capacitor, signs the release, and produces:

android/app/build/outputs/bundle/release/app-release.aab

Before running the release workflow, add these GitHub Actions secrets:

- ANDROID_KEYSTORE_BASE64
- ANDROID_KEYSTORE_PASSWORD
- ANDROID_KEY_ALIAS
- ANDROID_KEY_PASSWORD

Do not commit the keystore or its passwords to the repository.

## Important authentication note

The first Android build intentionally keeps the existing web authentication flow unchanged. Google OAuth inside an embedded WebView can require native browser/deep-link handling. Test Google sign-in on a real Android device before Play submission; if it is blocked, the next step is to add Capacitor App/Browser deep-link handling rather than weakening the existing Supabase security model.
