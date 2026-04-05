# Real Device Test Checklist

Run this checklist on a **physical iPhone** before every App Store submission.
Simulator results are insufficient for external camera features.

---

## 1. Built-In Phone Camera

- [ ] Camera preview renders without delay on app launch
- [ ] Photo mode captures GPS-tagged photos at configured rate
- [ ] Manual mode: single tap captures one photo with haptic + flash
- [ ] Video mode records 250 MB segments; new segment starts automatically
- [ ] GPX track saved to disk after session ends
- [ ] Share GPX produces a valid `.gpx` file openable in Maps / Gaia GPS
- [ ] Segment processing completes without crashing when app is backgrounded
- [ ] Focus locks at infinity when toggle is on
- [ ] Pinch-to-zoom works; double-tap resets to 1×
- [ ] Upload modal appears and uploads succeed after session (Supabase / HTTP)

## 2. Permissions

- [ ] Cold launch — all permission dialogs appear in correct order
- [ ] Deny camera → graceful error screen, no crash
- [ ] Deny location → GPS shows "denied" state, recording still starts
- [ ] Deny Bluetooth → vendor SDK cameras show "unavailable"
- [ ] Re-grant permission via Settings → app recovers without restart

## 3. External Camera — General

- [ ] "External" tab visible and tappable
- [ ] Provider selector shows all registered providers
- [ ] Unavailable providers (e.g. UVC on old iPhone) are greyed out
- [ ] Capability panel updates correctly after connecting a device
- [ ] GPS source selector respects camera capabilities
  (camera GPS option hidden when `supportsCameraGPS === false`)
- [ ] Disconnect during recording shows error state; recording ends cleanly
- [ ] Re-connect after disconnect restores session state

## 4. Insta360 (requires Insta360 SDK + physical camera)

- [ ] Camera appears in device discovery list within 10 s
- [ ] Connect succeeds and connection state shows "connected"
- [ ] Preview stream renders in preview area
- [ ] Record start/stop completes without error
- [ ] Media list shows recorded file
- [ ] Import copies file to app documents directory
- [ ] GPS data from camera populates GPS track (if camera model supports it)

## 5. GoPro (requires physical GoPro with Open GoPro support)

- [ ] BLE discovery finds camera; pairing succeeds
- [ ] Wi-Fi AP connection established after BLE pairing
- [ ] REST status endpoint returns 200
- [ ] Record start/stop completes
- [ ] Media list returns recorded file
- [ ] Import via HTTP GET succeeds
- [ ] GPMF GPS extracted from imported file

## 6. Generic UVC (requires USB-C iPhone 15+ or compatible iPad)

- [ ] External camera recognised in device discovery
- [ ] AVCaptureDevice.external device type returns device (iOS 17+)
- [ ] Preview renders
- [ ] Photo capture saves file
- [ ] Video recording saves file

## 7. Mock Camera Provider (simulator / CI)

- [ ] Mock provider appears in provider selector on simulator
- [ ] Simulated device discovery returns within 1 s
- [ ] Recording state machine transitions idle → starting → recording → idle
- [ ] GPS points stream correctly during mock session
- [ ] Session persists to AsyncStorage and reloads on restart

## 8. Hybrid GPS

- [ ] Hybrid mode uses camera GPS when provider reports health = 'good'
- [ ] Hybrid mode falls back to phone GPS when camera GPS = 'unavailable'
- [ ] GPSPoint.source correctly reflects 'phone', 'camera', or 'hybrid_fallback'
- [ ] Fallback event is logged in session errorLog

## 9. Session persistence

- [ ] Active session survives app background + foreground
- [ ] Session JSON persists to AsyncStorage after `endSession()`
- [ ] Persisted session loads correctly on next app launch
- [ ] Multiple sessions stored; old sessions do not overwrite new ones

## 10. Error handling

- [ ] Camera disconnect mid-record → error logged, recording stopped gracefully
- [ ] Import failure (camera storage full / file deleted) → error shown in UI
- [ ] GPS unavailable for >30 s → 'degraded' health shown; recording continues
- [ ] Provider init failure → provider shows error state; other providers unaffected
