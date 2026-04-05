# Manual Vendor SDK Hookup Steps

Each vendor camera provider is a skeleton with `// TODO:` markers where the
official SDK must be integrated.  Follow the steps below for each provider.

---

## Insta360 Provider (`Insta360CameraProvider.ts`)

### Prerequisites
- Obtain the **Insta360 Open SDK** from developer.insta360.com (requires NDA).
- Add the framework to your Xcode project via Swift Package Manager or
  manually drop the `.xcframework` into `ios/Frameworks/`.
- Declare `NSBluetoothAlwaysUsageDescription` and
  `NSLocalNetworkUsageDescription` in `Info.plist`.

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

### Prerequisites
- Register at developer.gopro.com and accept the GoPro OpenAPI licence.
- The GoPro Open GoPro API operates over **BLE + Wi-Fi** (no SDK binary
  required — it is a REST/BLE protocol).
- Add `NSBluetoothAlwaysUsageDescription` and Wi-Fi entitlements.

### Step-by-step
1. **BLE pairing** — scan for BLE peripheral with service UUID
   `FEA6` in `discoverDevices()`.
2. **Connect** — pair via BLE `0xB5F90002` characteristic, then trigger
   Wi-Fi AP mode via BLE command `0x17 0x01 0x01`.
3. **Wi-Fi connection** — join the camera's AP using the credentials read from
   BLE characteristic `0xB5F90003`.
4. **REST control** — all recording/preview/media calls go to
   `http://10.5.5.9:8080/gopro/` once Wi-Fi is joined.  Map endpoints to the
   provider methods as documented at https://gopro.github.io/OpenGoPro/.
5. **GPS** — GoPro cameras embed GPS in the `.MP4` GPMF telemetry track.
   Import the file first, then parse GPMF frames; there is no live GPS stream.

---

## Generic UVC Provider (`GenericUVCCameraProvider.ts`)

### Prerequisites
- UVC (USB Video Class) cameras connected via USB-C + camera adapter.
- iOS support for UVC is available from **iPadOS 17** onward for iPads;
  iPhone support is device-specific and requires a USB-C model.
- Import `AVFoundation` — no additional SDK needed.

### Step-by-step
1. **Discovery** — use `AVCaptureDevice.DiscoverySession` with `.external`
   device type (iOS 17+); replace the TODO comment in `discoverDevices()`.
2. **Capture session** — build an `AVCaptureSession` in `connect()` using
   the chosen `AVCaptureDevice`.
3. **Preview** — attach `AVCaptureVideoPreviewLayer` to a provided UIView in
   `startPreview()`.
4. **Photo capture** — use `AVCapturePhotoOutput` in `takePhoto()`.
5. **Video recording** — use `AVCaptureMovieFileOutput` in
   `startRecording()` / `stopRecording()`.
6. **Platform guard** — wrap all AVFoundation UVC calls in an availability
   check: `#available(iOS 17, *)`.

---

## Built-In Phone Camera Provider

No external SDK needed.  The built-in provider wraps the existing
`expo-camera` / `CameraView` flow.  If you need finer AVFoundation control
(e.g. RAW capture, multi-cam), use `AVCaptureSession` directly in a native
module and bridge it via Expo Modules API.

---

## General Checklist (all vendors)

- [ ] SDK licence reviewed and accepted
- [ ] Privacy keys added to `Info.plist`
- [ ] Background mode entitlements added if Wi-Fi/BLE usage continues in background
- [ ] TODO markers in provider file replaced with real SDK calls
- [ ] Provider registered in `lib/camera/providers/index.ts`
- [ ] Capability flags updated to match actual device capabilities
- [ ] Tested on a physical device (simulator cannot access external hardware)
