# App Store Metadata — GPS Video Capture

Paste these directly into App Store Connect.

---

## App Name
```
GPS Video Capture
```
*(30 characters max — this is 19)*

---

## Subtitle
```
Tag Every Frame with Location
```
*(30 characters max — this is 30)*

---

## Description (4000 character max)
```
GPS Video Capture automatically records continuous video from your rear camera, extracts frames at precise intervals, and tags every single frame with its exact GPS coordinates — all in real time.

Designed for professionals, researchers, and field teams who need spatial context for their footage: road surveyors, infrastructure inspectors, field data collectors, and anyone who needs to know exactly where every image was taken.

KEY FEATURES

• Continuous video recording with automatic 90-second segment rotation
• Frame extraction at fixed rates (1/4s to 4fps) or dynamic GPS distance intervals (1–1000 ft per frame)
• Every extracted frame is timestamped and tagged with latitude, longitude, and accuracy
• Photo mode for direct high-res capture at timed or distance-based intervals
• Real-time sign and object detection overlay using Roboflow — lock-on target HUD shows detected objects as you drive
• Full GPS metadata log exported as CSV — open in any spreadsheet app
• Optional cloud upload to your own Supabase project, custom REST endpoint, or local-only device storage
• Session management with frame preview, thumbnail grid, and detail view
• Infinity focus lock option to prevent autofocus drift on dashcam-style mounts

HOW IT WORKS

Start a session — the app acquires GPS lock and begins recording. Every 90 seconds, the current segment is saved and frame extraction runs in the background. Each extracted JPEG is stored locally with a matching CSV row containing the filename, timestamp, and GPS coordinates.

In Distance Mode, the app uses live GPS speed to extract frames at a consistent spatial interval — so you capture one frame every X feet traveled regardless of how fast you're moving. At 60 mph with 100 ft spacing, that's approximately 3 frames per second.

CLOUD STORAGE (OPTIONAL)

The app is designed to work fully offline — everything is saved on your device. If you want to sync frames to the cloud, configure your own Supabase project or point the app at any HTTPS endpoint you control. Your data goes directly to infrastructure you own; it never passes through the app developer's servers.

PERFECT FOR

• Street-level imagery collection
• Road condition and infrastructure surveys  
• Field research and environmental monitoring
• Construction site documentation
• Any workflow that needs GPS-tagged photos at scale
```

---

## Keywords (100 characters max, comma-separated)
```
GPS,dashcam,video,location,frame,survey,mapping,field,coordinates,capture,geo,tag,route
```
*(98 characters)*

---

## Category
- **Primary:** Navigation
- **Secondary:** Utilities

---

## Age Rating
**4+** — No objectionable content. Complete the questionnaire selecting "None" for all content categories.

---

## Copyright
```
© 2026 GPS Video Capture
```
*(Update with your legal name before submission)*

---

## Support URL
```
https://github.com/st3v0o/gps-video-capture
```

---

## Privacy Policy URL
*(Host PRIVACY_POLICY.md publicly and paste the URL here — GitHub Pages, Notion, or any static site)*

---

## Review Notes for Apple
```
GPS Video Capture records video from the rear camera and extracts frames tagged with GPS coordinates. 

To test the app:
- Camera and location permissions are required on first launch
- The main "Capture" tab shows the camera viewfinder
- Tap the record button to begin a session; frames are extracted every 90 seconds
- The "Log" tab shows all extracted frames with GPS coordinates
- The "Settings" tab controls frame rate, capture mode, and optional cloud storage

Note: The GPS frame tagging feature requires physical movement to demonstrate properly, as frames are extracted based on distance traveled. In a stationary test environment, the app will still record and extract frames at a fixed rate.

The Sign Detection feature uses the device camera viewfinder in real time — no images are sent to external servers during detection; the Roboflow API key is user-supplied in the detection settings.

Cloud upload is disabled by default. If configured, data goes to infrastructure the user controls (their own Supabase project or custom endpoint), not to the app developer's servers.

Background location is used only during an active recording session to maintain GPS tagging when the screen locks. The app does not run background location outside of an active session.
```

---

## What's New (Version 1.0)
```
Initial release.
```
