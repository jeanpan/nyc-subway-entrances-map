var webpack = require("webpack"),
    path = require('path');

var appPath = path.resolve(__dirname, 'src', 'app.js'),
    distPath = path.resolve(__dirname, 'dist');

module.exports = {
  watch: true,
  entry: {
    app: appPath,
    vendor: ["jquery", "leaflet"],
  },
  output: {
    path: distPath,
    filename: 'bundle.js',
    publicPath: '/dist/',
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery',
      'root.jQuery': 'jquery'
    }),
    new webpack.optimize.CommonsChunkPlugin(/* chunkName= */"vendor", /* filename= */"vendor.bundle.js"),
  ],
  module: {
   loaders: [
     {
       test: [/\.js$/, /\.es6$/],
       exclude: /node_modules/,
       loader: 'babel-loader',
       query: {
         presets: ['react', 'es2015']
       }
     }
   ]
 },
 resolve: {
   extensions: ['', '.js', '.es6']
 },
}
