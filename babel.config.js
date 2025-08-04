// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // NOTE: 'react-native-reanimated/plugin' must be the last plugin in the list.
      'react-native-reanimated/plugin',
    ],
  };
};