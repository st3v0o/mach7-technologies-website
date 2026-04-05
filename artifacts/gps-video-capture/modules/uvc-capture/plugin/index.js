/**
 * Expo config plugin for uvc-capture.
 *
 * Currently this module only needs the standard camera permission
 * (NSCameraUsageDescription) which is already declared in the app's app.json.
 * This file exists so Expo's config-plugin system can find and register it;
 * it is a pass-through plugin that makes no additional modifications.
 */
const { createRunOncePlugin } = require('@expo/config-plugins');

const withUvcCapture = config => config;

module.exports = createRunOncePlugin(withUvcCapture, 'uvc-capture', '1.0.0');
