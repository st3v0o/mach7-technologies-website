# GPS Video Capture

iOS mobile app built with Expo (SDK 54) that continuously records video from the rear iPhone camera while logging GPS coordinates. Every ~250 MB the app auto-saves the segment, extracts frames at 1 fps, matches each frame to the nearest GPS coordinate by timestamp, saves frame images to device storage, and appends a row to a local CSV log.

## Architecture

- **Framework**: Expo SDK 54, Expo Router 6, React Native
- **Target**: iOS via Expo Go (proof of concept)
- **Two tabs**: Capture (camera + recording controls) and Log (frame browser)

## Key files

| File | Purpose |
|------|---------|
| `app/(tabs)/index.tsx` | Full-screen camera, recording loop, adaptive 250 MB segment sizing |
| `app/(tabs)/log.tsx` | Frame log browser with GPS metadata and CSV share |
| `contexts/RecordingContext.tsx` | GPS watching, segment processing, frame extraction, CSV management |
| `app/connect.tsx` | QR code page for connecting Expo Go |
| `constants/colors.ts` | Dark field-tech color palette |

## Segment sizing

The first segment defaults to 90 seconds. After each segment saves, the app measures the actual file size, computes the real bitrate, then sets the next segment duration to hit exactly 250 MB. Segments are clamped between 30 s and 5 min.

## GPS notes

GPS runs in parallel with recording — it does not block the recording loop from starting. If the phone is indoors, GPS may take time to acquire a fix; frames recorded before a fix have no GPS coordinate and are skipped in the CSV. Works best outdoors.

## Storage layout (device)

```
<DocumentDirectory>/gps-capture/
  segments/   seg_001.mp4, seg_002.mp4, …
  frames/     seg_001_f0000_<ts>.jpg, …
  log.csv     filename, timestamp, lat, lng, video_segment, local_path, video_path
```

## Packages

- `expo-camera@~17.0.10` — CameraView + recordAsync
- `expo-file-system@~19.0.21` — file I/O via `/legacy` import path
- `expo-location@~19.0.x` — GPS watchPositionAsync
- `expo-video-thumbnails@~10.0.8` — frame extraction at 1 fps
- `expo-sharing@~14.0.8` — CSV share sheet
- `expo-blur`, `expo-haptics`, `@expo/vector-icons` — UI
