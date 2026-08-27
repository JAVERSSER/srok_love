const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Some dependencies (e.g. zustand) publish an ESM build via "exports" that
// contains `import.meta`, which breaks when Metro bundles it into a classic
// (non-module) <script> for web. Falling back to the legacy "main" field
// resolution avoids picking those ESM entry points.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
