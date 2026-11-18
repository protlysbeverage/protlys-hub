module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE;

  const isNonProduction =
    profile === 'development' || profile === 'preview';

  const isWindows = process.platform === 'win32';

  return {
    ...config,

    name: isNonProduction ? 'Protlys Dev' : 'Protlys',

    android: {
      ...config.android,
      package: isNonProduction
        ? 'com.protlys.hub.dev'
        : 'com.protlys.hub',
    },

    plugins: [
      ...(config.plugins ?? []),
      [
        'expo-build-properties',
        {
          android: isWindows
            ? {
                cmakeVersion: '3.31.6',
              }
            : {},
        },
      ],
    ],
  };
};