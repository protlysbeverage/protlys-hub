# Protlys Hub Android wrapper

This is the native Android wrapper for Protlys Hub with Health Connect step integration.

Application ID: com.protlys.hub
Host: https://hub.protlys.com
Wrapper version: 1.1.0 (versionCode 2)
Signing alias: my-key-alias
Keystore file: signing.keystore (not committed)

Open the android-health-connect directory in Android Studio.

Copy the existing signing.keystore into android-health-connect/app/. Do not commit the keystore. Configure the release signing config locally with the existing keystore and alias my-key-alias; passwords are intentionally not stored in this repository.

The wrapper requests only READ_STEPS, reads the current Nairobi-calendar-day aggregate, and sends it to the PWA through the TWA postMessage channel. It does not write step records to Health Connect.

Because this version adds Health Connect access, Google Play requires the Health apps declaration and matching Data safety disclosures before release.
