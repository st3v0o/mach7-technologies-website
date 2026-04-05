/**
 * Expo config plugin for insta360-camera.
 *
 * The Insta360 SDK requires the same Bluetooth + local-network permissions
 * that are already declared in the app's app.json.  This plugin is a
 * pass-through that lets Expo's config-plugin system register the module;
 * no additional Info.plist modifications are needed beyond what app.json
 * already declares.
 */
const { createRunOncePlugin } = require('@expo/config-plugins');

const withInsta360Camera = config => config;

module.exports = createRunOncePlugin(withInsta360Camera, 'insta360-camera', '1.0.0');
