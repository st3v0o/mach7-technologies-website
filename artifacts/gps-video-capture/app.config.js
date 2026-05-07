const baseConfig = require("./app.json");

const expoDevDomain = process.env.REPLIT_EXPO_DEV_DOMAIN;

module.exports = ({ config }) => {
  const merged = {
    ...config,
    ...baseConfig.expo,
    extra: {
      ...baseConfig.expo.extra,
    },
  };

  // Expo's CorsMiddleware builds its allowed-origins list from
  // exp.extra.router.origin and exp.extra.router.headOrigin.
  // In Replit, Metro receives requests with Origin: https://<REPLIT_EXPO_DEV_DOMAIN>
  // but req.headers.host is localhost:<port>, so the same-origin check fails and
  // every asset request is rejected with HTTP 500.
  // Setting extra.router.origin to the Replit Expo dev domain adds it to the
  // allowedHosts list inside CorsMiddleware, which fixes the 500 errors.
  if (expoDevDomain) {
    merged.extra = {
      ...merged.extra,
      router: {
        ...merged.extra?.router,
        origin: `https://${expoDevDomain}`,
      },
    };
  }

  return merged;
};
