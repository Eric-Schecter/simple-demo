const path = require('path');

module.exports = function override(config, env) {
  const loaders = config.module.rules.find(rule => Array.isArray(rule.oneOf)).oneOf;
  const index = loaders.length - 2;
  loaders.splice(index, 0, {
    test: /\.(frag|vert|vs|fs|fragment|vertex|shader|glsl)$/,
    use: ['raw-loader', 'glslify-loader']
  })

  // Make file-loader ignore WASM files
  const wasmExtensionRegExp = /\.wasm$/;
  config.resolve.extensions.push('.wasm');
  config.module.rules.forEach(rule => {
      (rule.oneOf || []).forEach(oneOf => {
          if (oneOf.loader && oneOf.loader.indexOf('file-loader') >= 0) {
              oneOf.exclude.push(wasmExtensionRegExp);
          }
      });
  });

  // Add a dedicated loader for WASM
  config.module.rules.push({
      test: wasmExtensionRegExp,
      include: path.resolve(__dirname, 'src'),
      use: [{ loader: require.resolve('wasm-loader'), options: {} }]
  });

  return config;
}