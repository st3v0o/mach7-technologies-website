const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Block Metro from watching temporary native build directories that expo packages
// create during post-install (e.g. expo-crypto_tmp_* android maven repos).
// These directories are transient and cause ENOENT crashes when Metro tries to
// set up inotify watches on them after they're deleted.
const existingBlockList = config.resolver.blockList;
const blockList = Array.isArray(existingBlockList)
  ? existingBlockList
  : existingBlockList
  ? [existingBlockList]
  : [];

config.resolver.blockList = [
  ...blockList,
  /node_modules\/.*_tmp_\d+\/.*/,
];

module.exports = config;
