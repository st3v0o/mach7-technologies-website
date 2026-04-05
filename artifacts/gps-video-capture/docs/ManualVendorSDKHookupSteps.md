# Manual Vendor SDK Hookup Steps

---

## Insta360 Provider (`Insta360CameraProvider.ts`)

### Status: Skeleton — requires NDA binary
The Insta360 Open SDK requires a non-disclosure agreement.
All code is ready to accept the binary; see Task #5 for the drop-in steps.

### Prerequisites
- Obtain the **Insta360 Open SDK** from developer.insta360.com (requires NDA).
- Add the framework to your Xcode project via Swift Package Manager or
  manually drop the `.xcframework` into `ios/Frameworks/`.
- Declare `NSBluetoothAlwaysUsageDescription` and
  `NSLocalNetworkUsageDescription` in `Info.plist` (already done in `app.json`).

### Step-by-step
1. **Import the SDK** — replace the TODO import block:
   ```swift
   import INSCameraSDK
   ```
2. **Start the connection manager** in `connect()`:
   ```swift
   INSCameraManager.socket().setup()
   INSCameraManager.socket().cameraDelegate = self
   ```
3. **Device discovery** — iterate `INSCameraManager.socket().cameras` inside
   `discoverDevices()`.
4. **Preview** — use `INSCameraManager.socket().startPreviewWith(options:)` in
   `startPreview()`.
5. **Recording** — call `INSCameraManager.socket().startCapture(options:)` /
   `stopCapture()` inside the recording methods.
6. **GPS telemetry** — subscribe to `INSCameraDelegate.camera(_:didUpdate:)` for
   gyroscope/GPS payloads; normalise into `GPSPoint` in
   `ExternalCameraGPSProvider`.
7. **Media import** — use `INSCameraMediaFetcher` in `listMedia()` and
   `importMedia()`.

---

## GoPro Provider (`GoProCameraProvider.ts`)

### Status: Fully implemented — requires EAS build to test

The Open GoPro protocol needs no SDK binary.
BLE pairing and REST control are complete in `GoProCameraProvider.ts`.

### How it works
1. **BLE scan** — `react-native-ble-plx` scans for peripherals advertising
   service UUID `FEA6`.  GoPro cameras appear with a name starting with
   "GoPro".
2. **Pairing** — the app sends command `[0x03, 0x17, 0x01, 0x01]` on the
   Command Request characteristic (`b5f90072-…`) to enable the camera's Wi-Fi AP.
3. **Wi-Fi credentials** — SSID and password are read from BLE characteristics
   `b5f90002-…` and `b5f90003-…`.
4. **Wi-Fi join** — `react-native-wifi-reborn` calls
   `connectToProtectedSSID(ssid, pass)` using the
   `com.apple.developer.networking.HotspotConfiguration` entitlement.
5. **REST control** — all recording/media calls go to `http://10.5.5.9:8080/gopro/`.
6. **GPMF GPS** — after `importMedia()` downloads the `.mp4`, `gpmf.ts` parses
   the embedded telemetry track and returns `GPSPoint[]` objects.

### EAS build requirements
- `com.apple.developer.networking.HotspotConfiguration` entitlement — **already
  set** in `app.json`.
- `NSBluetoothAlwaysUsageDescription` and `NSLocalNetworkUsageDescription` —
  **already set** in `app.json`.
- `react-native-ble-plx` and `react-native-wifi-reborn` plugins — **already
  configured** in `app.json`.
- Run `eas build --platform ios --profile development` to get a testable build.

---

## Canon CCAPI Provider (`CanonCCAPIProvider.ts`)

### Status: Fully implemented — requires camera on same Wi-Fi network

Canon CCAPI is a REST API over Wi-Fi; no SDK binary is needed.

### Supported cameras
EOS R-series, EOS 90D, EOS 5D Mark IV, EOS 6D Mark II, EOS 850D,
EOS M50 Mark II, PowerShot G7X III, and others that support CCAPI.
Check `https://developercommunity.usa.canon.com/s/article/ccapi` for the
full list.

### Camera setup
1. On the camera: **Communication settings → Wi-Fi settings → Enable CCAPI**.
2. Connect the camera to the **same Wi-Fi router as the iPhone**, OR use the
   camera's built-in AP mode (the phone connects to the camera's own AP).

### How discovery works
`discoverDevices()` does two things in parallel:
- Probes the fixed AP-mode IP `192.168.1.1:8080`.
- Gets the phone's local IP via `@react-native-community/netinfo` and scans
  a dozen nearby hosts on the same subnet.

Any host that responds to `GET /ccapi/ver100/deviceinformation` with HTTP 200
is added to the discovered device list.

### Recording
- **Photo**: POST `/ccapi/ver100/shooting/control/shutterbutton` (full press + release).
- **Video start**: POST `/ccapi/ver100/shooting/control/movierecording { action: 'start' }`.
- **Video stop**: POST `/ccapi/ver100/shooting/control/movierecording { action: 'stop' }`.
- **Media list**: GET `/ccapi/ver100/contents/sd/1` → enumerate directories and files.
- **Import**: `expo-file-system` downloads files directly from the camera URL.

---

## Generic UVC Provider (`GenericUVCCameraProvider.ts`)

### Status: Fully implemented — requires USB-C iPhone 15+ and EAS build

The native module `modules/uvc-capture/` wraps AVFoundation's `.external`
device type (available since iOS 17).

### How it works
1. `discoverDevices()` calls `UvcCaptureModule.discoverDevices()` (Swift) which
   runs `AVCaptureDevice.DiscoverySession(deviceTypes: [.external])`.
2. `connect(id)` calls `UvcCaptureModule.connect(id)` which creates an
   `AVCaptureSession` and an `AVCaptureMovieFileOutput`.
3. `startRecording(path)` calls `AVCaptureMovieFileOutput.startRecording(to:)`.
4. `stopRecording()` stops the output and returns the file path.

### EAS build requirements
- The `uvc-capture` local module is listed in `package.json` as a
  `file:./modules/uvc-capture` dependency; Expo auto-links it via
  `expo-module.config.json`.
- No extra entitlements beyond `NSCameraUsageDescription` (already in `app.json`).
- Run `eas build --platform ios --profile development`.

### Testing
Physical device only — connect a UVC camera via USB-C adapter, then:
- Select "USB Camera (UVC)" in the External tab.
- Tap Scan to list discovered cameras.
- Tap Connect, then Record.

---

## Built-In Phone Camera Provider

No external SDK needed.  The built-in provider wraps the existing
`expo-camera` / `CameraView` flow.

---

## General EAS Build Checklist

- [ ] `NSBluetoothAlwaysUsageDescription` — in `app.json` ✅
- [ ] `NSLocalNetworkUsageDescription` — in `app.json` ✅
- [ ] `com.apple.developer.networking.HotspotConfiguration` entitlement — in `app.json` ✅
- [ ] `react-native-ble-plx` plugin — in `app.json` ✅
- [ ] `react-native-wifi-reborn` plugin (with `addHotspotEntitlement: true`) — in `app.json` ✅
- [ ] `uvc-capture` local module linked — in `package.json` ✅
- [ ] All providers pass `pnpm typecheck` — ✅
- [ ] EAS build submitted and installed on a physical iPhone 15+
- [ ] GoPro tested: scan → BLE pair → Wi-Fi join → record → import → GPS track extracted
- [ ] Canon tested: discovery scan → REST connect → photo/video → import
- [ ] UVC tested: USB-C camera attached → discover → record
