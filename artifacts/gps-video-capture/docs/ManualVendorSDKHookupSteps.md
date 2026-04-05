# Manual Vendor SDK Hookup Steps

---

## Insta360 Provider (`Insta360CameraProvider.ts`)

### Status: Native module wired — requires NDA binary + EAS build

All TypeScript and Swift code is in place.  The native module
(`modules/insta360-camera/`) uses `requireOptionalNativeModule` so JS
compiles and runs safely without the SDK; the Swift side will only link
once the `INSCameraSDK.xcframework` binary is dropped in.

### Prerequisites
- Obtain the **Insta360 Open SDK** from https://developer.insta360.com
  (requires NDA / developer account approval).
- The framework is distributed as `INSCameraSDK.xcframework`.

### Drop-in steps (one-time, after SDK is approved)

#### 1 — Place the xcframework
```
ios/
└── Frameworks/
    └── INSCameraSDK.xcframework   ← copy here
```
Create the `Frameworks/` directory if it does not exist:
```bash
mkdir -p artifacts/gps-video-capture/ios/Frameworks
cp ~/Downloads/INSCameraSDK.xcframework \
   artifacts/gps-video-capture/ios/Frameworks/
```

#### 2 — Write a local podspec and add it to the Podfile

The Insta360 SDK ships as a raw xcframework, not a CocoaPod.  You must
write a minimal podspec so CocoaPods can reference it.

**2a — Create `ios/Frameworks/INSCameraSDK.podspec`:**
```ruby
Pod::Spec.new do |s|
  s.name             = 'INSCameraSDK'
  s.version          = '1.0.0'
  s.summary          = 'Insta360 Open SDK'
  s.homepage         = 'https://developer.insta360.com'
  s.license          = { :type => 'Commercial' }
  s.author           = { 'Insta360' => 'developer@insta360.com' }
  s.platform         = :ios, '13.0'
  s.source           = { :path => '.' }
  s.vendored_frameworks = 'INSCameraSDK.xcframework'
end
```

**2b — Reference the podspec from `ios/Podfile`** (inside the `target` block):
```ruby
pod 'INSCameraSDK', :podspec => '../Frameworks/INSCameraSDK.podspec'
```

#### 3 — Run pod install & EAS build
```bash
cd artifacts/gps-video-capture/ios && pod install
# Then from the project root:
eas build --platform ios --profile development
```

#### 4 — Verify
- `isAvailableOnCurrentDevice()` will return `true` on a physical device
  once the native module is linked.
- In the UI, the Insta360 tab should go from "SDK not installed" → "Scan".

---

### How it works (post-binary)

#### Discovery
1. User ensures the iPhone is connected to the Insta360 camera's Wi-Fi AP
   (the camera creates a hotspot when powered on).
2. App calls `discoverDevices()` → native module calls
   `INSCameraManager.socket().setup()` then returns
   `INSCameraManager.socket().cameras`.

#### Connection
`connect(deviceId)` calls `INSCameraManager.socket().connect(camera:, finish:)`
and waits for the delegate callback before resolving.

#### Preview
`startPreview()` calls `INSCameraManager.socket().startPreviewWith(options:, for:, finish:)`.
The preview stream is rendered by the camera's own protocol; a future
enhancement can expose a native `UvPreviewView`-style React component.

#### Recording
- `startRecording(config)` maps resolution + frameRate to `INSCaptureOptions`
  and calls `INSCameraManager.socket().startCapture(options:, for:, finish:)`.
- `stopRecording()` calls `INSCameraManager.socket().stopCapture(for:, finish:)`
  and returns the camera-side file key (used as the `mediaId` for import).

#### GPS telemetry (live)
The native module emits `onTelemetry` events via Expo's `sendEvent`.
These events fire through `INSTelemetry` delegate callbacks in
`Insta360TelemetryDelegate` (see `ios/Insta360CameraModule.swift`).

`Insta360CameraProvider.subscribeToGPSTelemetry()` subscribes to these
events and forwards GPS samples to `ExternalCameraGPSProvider.ingestPoint()`.
No polling is needed — data flows automatically once `startPreview()` is called.

#### Media import
- `listMedia()` → `INSCameraMediaFetcher.fetchMediaList(…)`.
- `importMedia(id, path)` → `INSCameraMediaFetcher.downloadFile(withUri:toLocalPath:)`.

---

### EAS build requirements
- `NSBluetoothAlwaysUsageDescription` — **already in `app.json`** ✅
- `NSLocalNetworkUsageDescription` — **already in `app.json`** ✅
- `insta360-camera` local module linked — **already in `package.json`** ✅
- `./modules/insta360-camera/plugin/index.js` — **already in `app.json`** ✅
- Podfile patched with xcframework (see step 2 above)
- Run `eas build --platform ios --profile development`

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
- [ ] `insta360-camera` local module linked — in `package.json` ✅
- [ ] All providers pass `pnpm typecheck` — ✅
- [ ] EAS build submitted and installed on a physical iPhone 15+
- [ ] GoPro tested: scan → BLE pair → Wi-Fi join → record → import → GPS track extracted
- [ ] Canon tested: discovery scan → REST connect → photo/video → import
- [ ] UVC tested: USB-C camera attached → discover → record
- [ ] Insta360 tested: SDK binary dropped in → connect to camera AP → discover → record → GPS track live
