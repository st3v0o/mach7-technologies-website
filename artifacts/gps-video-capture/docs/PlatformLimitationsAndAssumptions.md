# Platform Limitations and Assumptions

## iOS / iPadOS

| Limitation | Detail |
|---|---|
| UVC camera support | Requires iPadOS 17+ or iPhone with USB-C (iPhone 15+). Not available on older Lightning iPhones. |
| Vendor SDK cameras | Require the vendor's proprietary SDK binary, which must be obtained separately. Simulator cannot load real hardware SDKs. |
| Background Wi-Fi | Maintaining a Wi-Fi connection to a camera AP in the background requires the `voip` or `audio` background mode, or BLE keep-alive. App may lose connection when backgrounded. |
| BLE pairing persistence | BLE peripheral pairing state is stored by iOS. If the user revokes Bluetooth permission mid-session, the connection will drop with no recovery path. |
| External GPS accuracy | GPS data from a camera (Insta360, GoPro) is embedded in video telemetry, not a live stream. Live GPS from external cameras is vendor-specific and may lag by 1–2 seconds. |
| CoreLocation always-on | `requestAlwaysAuthorization` is required for background GPS. Apple's review team will reject the app if the justification string is not accurate. |
| AVFoundation multi-cam | Simultaneous capture from two cameras on one iPhone requires `AVCaptureMultiCamSession` (iPhone XS+). Not supported on iPads prior to M-series. |

## Android

This app targets **iOS only**. The external camera architecture is designed
with iOS/iPadOS in mind. Android support would require:
- Replacing `expo-camera` with an Android-compatible capture pipeline.
- Replacing iOS `AVFoundation` UVC calls with Android USB Host API or UVC
  library equivalents.
- Different BLE APIs for GoPro/Insta360 on Android (generally similar
  protocol, different SDK surface).

## Simulator

- No physical camera access — `BuiltInPhoneCameraProvider` falls back to the
  `MockCameraProvider` automatically when running in the simulator.
- No Bluetooth/Wi-Fi hardware — vendor SDK cameras cannot be connected.
- `GenericUVCCameraProvider` is non-functional on the simulator.
- `IOSCoreLocationProvider` returns simulated locations from Xcode's
  `GPX` scheme simulation.
- `MockCameraProvider` is provided specifically for simulator/CI use.

## Assumptions

1. The user grants Camera, Microphone, Location, and Bluetooth permissions.
2. When a vendor SDK camera is connected, it is the **primary** capture device;
   the built-in camera is not simultaneously active.
3. The device has sufficient free storage for both raw video and imported assets.
4. Network connectivity (Wi-Fi to camera AP) may coexist with cellular; iOS
   will maintain both interfaces simultaneously only if the camera AP has no
   internet route.
5. GPS points are stored in memory for the session duration and written to disk
   on `stopLocationStream`. Very long sessions (>12 hours) may accumulate
   significant GPS data (~100 KB/h at 1 Hz).
