# iOS App Store Checklist — GPS Video Capture

## 1. Apple Developer Account
- [ ] Enroll in Apple Developer Program at developer.apple.com ($99/year)
- [ ] Accept all agreements in App Store Connect
- [ ] Create an App Store Connect app entry (Bundle ID must match app.json)

---

## 2. App Configuration (`app.json`)
- [x] Set `ios.bundleIdentifier` → currently `com.gpsvideocapture.app` — **change this to your permanent ID before first submission; it cannot be changed after**
- [x] Set `ios.buildNumber` to `"1"` (increment with every submission)
- [x] Set `ios.deploymentTarget` to `"17.0"`
- [x] Added `NSLocationAlwaysAndWhenInUseUsageDescription` to `ios.infoPlist`
- [x] Added `UIBackgroundModes: ["location"]` to `ios.infoPlist`
- [x] Removed dev-only `origin: "https://replit.com/"` from expo-router plugin config

---

## 3. App Icon & Splash Screen
- [x] Custom app icon generated — 1024×1024 PNG, no transparency (camera lens + GPS crosshair HUD design)
- [ ] Review the generated icon and replace with custom artwork if desired (`assets/images/icon.png`)
- [ ] Design or update the splash screen image (`assets/images/splash-icon.png`)
- [x] Splash background color `#0A0A0A` configured

---

## 4. App Store Screenshots
- [ ] Capture screenshots on a 6.5" device or simulator (iPhone 14 Pro Max / 15 Plus) — **required**
- [ ] Capture screenshots on a 5.5" device or simulator (iPhone 8 Plus) — required for older device support
- [ ] Minimum 3 screenshots per size; maximum 10
- [ ] Suggested screens: camera viewfinder, GPS HUD, settings, upload progress modal, sign detection overlay
- [ ] Optional: record a 15–30 second App Preview video

---

## 5. Privacy Policy
- [x] Privacy policy written — see `PRIVACY_POLICY.md`; covers camera/video, GPS/location, photos, pluggable cloud storage (user-controlled, not compiled into app)
- [ ] Host it publicly (GitHub Pages, Notion public page, or a simple website)
- [ ] Have the URL ready to paste into App Store Connect (see Section 9 below)

---

## 6. Cloud Storage Security
- [x] **Supabase anon key is no longer compiled into the binary** — the app uses a pluggable storage system where users enter their own credentials at runtime
- [x] Cloud storage is opt-in; default mode is Local Only (no data leaves the device)
- [x] User-supplied credentials are stored in device AsyncStorage only
- [x] No developer-controlled servers receive any user data
- No RLS review required for the developer — each user is responsible for their own Supabase project

---

## 7. EAS Build Setup
- [x] `eas.json` created with `development`, `preview`, and `production` build profiles
- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Log in with your Expo account: `eas login`
- [ ] Fill in `eas.json` → `submit.production.ios`: `appleId`, `ascAppId`, `appleTeamId`
- [ ] Run a production build: `eas build --platform ios --profile production`
- [ ] Install the build on a real device via TestFlight and test all features

---

## 8. TestFlight Beta Testing
- [ ] Upload production build to App Store Connect (via `eas submit` or Transporter)
- [ ] Add yourself as an internal tester in TestFlight
- [ ] Test on a real iPhone: recording, GPS tagging, photo mode, upload, detection overlay
- [ ] Test edge cases: GPS denied, camera denied, no internet, low storage
- [ ] Fix any crashes found before submitting for review

---

## 9. App Store Connect Metadata
Full copy-paste content ready in `APP_STORE_METADATA.md`:
- [x] **App name**: GPS Video Capture
- [x] **Subtitle**: Tag Every Frame with Location
- [x] **Description**: Full 4,000-character description written
- [x] **Keywords**: GPS, dashcam, video, location, frame, survey, mapping, field, coordinates, capture, geo, tag, route
- [x] **Category**: Navigation (primary) / Utilities (secondary)
- [x] **Support URL**: https://github.com/st3v0o/gps-video-capture
- [x] **Age Rating**: 4+
- [x] **Copyright**: © 2026 GPS Video Capture (update with your legal name)
- [x] **Review notes**: Written (explains GPS movement requirement, background location use, Roboflow key)
- [ ] **Privacy Policy URL**: Host `PRIVACY_POLICY.md` and paste URL here
- [ ] **Price**: Set in App Store Connect (free or paid)

---

## 10. App Privacy Nutrition Labels
In App Store Connect under "App Privacy," disclose:
- [ ] **Precise Location** — collected, linked to usage data (GPS frame tagging)
- [ ] **Photos or Videos** — collected (frames/photos saved locally), not linked to identity
- [ ] Answer all questions honestly — Apple cross-checks against your actual code

---

## 11. Pre-Submission Review Checks
- [x] `connect.tsx` (dev-only Expo Go helper) is gated behind `__DEV__` — will throw in production if somehow accessed
- [x] All permission prompts include clear, descriptive text
- [x] App handles "permission denied" gracefully for camera, mic, and location
- [ ] Verify no crashes on clean install (TestFlight)
- [ ] Verify app handles no internet connection without crashing
- [x] No placeholder UI, "lorem ipsum" text, or test/debug buttons visible in navigation
- [ ] App works correctly on the latest iOS version
- [x] Background behavior documented in review notes (screen lock during recording)

---

## 12. Submit for Review
- [ ] Complete all metadata in App Store Connect
- [ ] Select your build in the submission form
- [ ] Paste review notes from `APP_STORE_METADATA.md`
- [ ] Submit — first-time reviews typically take 24–48 hours

---

## Quick Reference: Already Done ✓
- Camera, microphone, and location permission descriptions are set
- Portrait orientation locked
- Dark mode configured
- iOS-only (no tablet support)
- App icon: 1024×1024 GPS+camera HUD design
- Splash background: #0A0A0A
- `app.json`: bundleIdentifier, buildNumber, deploymentTarget, background location all configured
- expo-router dev origin removed
- `eas.json` created with production build profile
- Privacy policy written (`PRIVACY_POLICY.md`)
- App Store metadata written (`APP_STORE_METADATA.md`) — copy-paste ready
- Pluggable storage: user supplies their own credentials; no developer server involved
- `connect.tsx` (Expo Go helper) gated to dev-only builds
