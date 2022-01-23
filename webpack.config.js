const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Your first THREE.js app',
      favicon: './src/logo.png'
    }),
    new CopyWebpackPlugin({
      patterns: [
        {from: 'public', to: 'inner'},
        {from: 'node_modules/@webxr-input-profiles/assets/dist/profiles', to: 'webxr-input-profiles'}
      ]
    })
  ],
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|glb|jpeg|hdr|gif)$/i,
        type: 'asset/resource',
      },
    ]
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  devServer: {
    compress: true,
    port: 9000
  }
};
