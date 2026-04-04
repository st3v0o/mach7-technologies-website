# iOS App Store Checklist — GPS Video Capture

## 1. Apple Developer Account
- [ ] Enroll in Apple Developer Program at developer.apple.com ($99/year)
- [ ] Accept all agreements in App Store Connect
- [ ] Create an App Store Connect app entry (Bundle ID must match app.json)

---

## 2. App Configuration (`app.json`)
- [ ] Set `ios.bundleIdentifier` (e.g. `com.yourname.gpsvideocapture`) — permanent, cannot change after submission
- [ ] Set `ios.buildNumber` to `"1"` (increment with every submission)
- [ ] Set `ios.deploymentTarget` to `"17.0"` (or your minimum supported iOS)
- [ ] Add `NSLocationAlwaysAndWhenInUseUsageDescription` to `ios.infoPlist` for continuous GPS during recording
- [ ] Add `UIBackgroundModes: ["location"]` to `ios.infoPlist` if you want GPS to keep running when the screen locks
- [ ] Remove or update the `expo-router` origin (`"https://replit.com/"`) — this is a dev-only setting and should be removed for production builds

---

## 3. App Icon & Splash Screen
- [ ] Design a custom app icon — 1024×1024 PNG, no transparency, no rounded corners (iOS adds those)
- [ ] Replace `assets/images/icon.png` with your custom icon
- [ ] Design or update the splash screen image (`assets/images/splash-icon.png`)
- [ ] Verify the splash background color (`#0A0A0A`) looks correct with your new splash image

---

## 4. App Store Screenshots
- [ ] Capture screenshots on a 6.5" device or simulator (iPhone 14 Pro Max / 15 Plus) — **required**
- [ ] Capture screenshots on a 5.5" device or simulator (iPhone 8 Plus) — required for older device support
- [ ] Minimum 3 screenshots per size; maximum 10
- [ ] Suggested screens to show: camera viewfinder, GPS HUD, settings, upload progress modal, sign detection overlay
- [ ] Optional: record a 15–30 second App Preview video

---

## 5. Privacy Policy
- [ ] Write a privacy policy covering: camera/video, GPS/location, photos, and Supabase cloud upload
- [ ] Host it publicly (GitHub Pages, Notion public page, or a simple website)
- [ ] Have the URL ready to paste into App Store Connect

---

## 6. Supabase Security (before shipping)
- [ ] Review all Row-Level Security policies — the Supabase anon key is compiled into the app binary and can be extracted
- [ ] Ensure INSERT-only policies (no DELETE or UPDATE from anonymous users unless intentional)
- [ ] Confirm no sensitive user data is stored without proper access controls
- [ ] Consider rate-limiting uploads if the bucket is publicly writable

---

## 7. EAS Build Setup
- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Log in: `eas login`
- [ ] Initialize: `eas build:configure` (creates `eas.json`)
- [ ] Create a `production` build profile in `eas.json`
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
- [ ] **App name**: GPS Video Capture (max 30 characters)
- [ ] **Subtitle**: Short tagline, max 30 characters
- [ ] **Description**: Full description up to 4,000 characters
- [ ] **Keywords**: Comma-separated, max 100 characters total (drives search)
- [ ] **Category**: Navigation (primary) — consider Utilities as secondary
- [ ] **Support URL**: A page where users can get help (can be a GitHub page)
- [ ] **Privacy Policy URL**: From step 5 above
- [ ] **Age Rating**: Complete the questionnaire — this app should rate 4+
- [ ] **Copyright**: e.g. `© 2025 Your Name`
- [ ] **Price**: Free or paid

---

## 10. App Privacy Nutrition Labels
In App Store Connect under "App Privacy," disclose every data type you collect:
- [ ] **Precise Location** — collected, linked to usage data
- [ ] **Photos or Videos** — collected (frames/photos saved), not linked to identity
- [ ] **Crash Data** — if you add crash reporting later
- [ ] Answer all questions honestly — Apple cross-checks this against your actual code

---

## 11. Pre-Submission Review Checks
- [ ] App does not crash on launch on a clean install
- [ ] All permission prompts include clear, descriptive text (already done ✓)
- [ ] App handles "permission denied" gracefully for camera, mic, and location
- [ ] App handles no internet connection without crashing
- [ ] No placeholder UI, "lorem ipsum" text, or test/debug buttons visible
- [ ] App works correctly on the latest iOS version
- [ ] Background behavior is clearly documented in the review notes (Apple reviewers will test locking the screen)

---

## 12. Submit for Review
- [ ] Complete all metadata in App Store Connect
- [ ] Select your build in the submission form
- [ ] Add review notes explaining what the app does and any special hardware/account requirements
- [ ] Mention in review notes that the app requires physical movement for GPS tagging to work properly
- [ ] Submit — first-time reviews typically take 24–48 hours

---

## Quick Reference: Already Done ✓
- Camera, microphone, and location permission descriptions are set
- Portrait orientation locked
- Dark mode configured
- iOS-only (no tablet support)
- Supabase upload + RLS policies in place
- App icon file referenced (needs custom artwork)
