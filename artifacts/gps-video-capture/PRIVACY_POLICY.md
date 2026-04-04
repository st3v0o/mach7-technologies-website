# Privacy Policy — GPS Video Capture

**Last updated:** April 2026

## Overview

GPS Video Capture ("the App") is designed to help you capture GPS-tagged video footage and photos from your device's camera. This policy explains exactly what data the App collects, where it is stored, and what it is used for.

---

## Data We Collect

### Camera & Video
The App records video and captures photos using your device's rear camera. All video segments and extracted frames are saved **directly on your device** in the app's local document storage. Video files and frames are never sent anywhere without your explicit configuration (see Cloud Storage below).

### GPS / Location Data
The App continuously collects precise GPS coordinates (latitude, longitude, accuracy, and speed) while a recording session is active. This location data is:
- Associated with each extracted video frame and photo
- Saved in a CSV log file on your device
- Used only for geotagging your captured media

Location is accessed in the foreground and optionally in the background (when the screen is locked during a recording session) to maintain continuous GPS tagging.

### Photos and Media
Extracted video frames and photos are saved to the App's private document directory on your device. These files are **not** added to your Photo Library unless you explicitly choose to share them.

---

## Cloud Storage (Optional, User-Configured)

The App includes an optional cloud upload feature. **Cloud storage is disabled by default.** If you choose to configure it, you have full control over where your data is sent.

Supported options:
- **Local Only** (default) — No data leaves your device
- **Supabase** — You provide your own Supabase project URL and credentials. Data is sent to your Supabase project, which you control entirely.
- **Custom Webhook** — You provide your own HTTPS endpoint. Frame data (including GPS coordinates and the image as base64) is POSTed to your server.

In all cloud cases, **the developer of this App has no access to your data.** You are connecting to infrastructure you own or control. No data passes through servers operated by the App developer.

---

## Data We Do NOT Collect

- We do not collect your name, email, or any personal identifiers
- We do not have analytics or crash reporting built into the App
- We do not track usage or behavior
- We do not share any data with third parties
- We do not have access to any cloud credentials you configure

---

## Data Stored on Your Device

The App stores the following in your device's private document directory:

| Item | Location | Contents |
|------|----------|----------|
| Video segments | `gps-capture/segments/` | Raw `.mp4` files from recording sessions |
| Extracted frames | `gps-capture/frames/` | `.jpg` images extracted from video |
| GPS log | `gps-capture/log.csv` | Filename, timestamp, latitude, longitude per frame |
| Upload queue | AsyncStorage | Pending/completed upload state (if cloud is configured) |
| Storage config | AsyncStorage | Your cloud provider choice and credentials |

All data in the App's document directory is deleted when you use the "Clear All Data" function in the Frame Log tab, or when you delete the App from your device.

---

## Permissions Requested

| Permission | Why |
|------------|-----|
| Camera | Required to record video and capture photos |
| Microphone | Required to record audio with video |
| Location (When In Use) | Required to tag frames with GPS coordinates |
| Location (Always) | Optional — allows GPS tagging to continue while the screen is locked during a recording session |

---

## Children's Privacy

This App is not directed at children under 13 and does not knowingly collect data from children.

---

## Changes to This Policy

If this policy changes, the updated version will be available at the same URL with a new "Last updated" date.

---

## Contact

If you have questions about this privacy policy, please open an issue on the project's GitHub page:
**https://github.com/st3v0o/gps-video-capture**
