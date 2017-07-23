const webpack = require('webpack');

const debug = process.env.NODE_ENV !== 'production';
const path = require('path');

// extract text from code into seperate file
const ExtractTextPlugin = require('extract-text-webpack-plugin');

// --------------
// settings
// --------------
const context = path.resolve(__dirname, 'src');
const devtool = debug ? 'cheap-eval-source-map' : 'source-map'; // generate full source map for production
const entry = path.join(__dirname, 'src', 'app.js');
const devServer = {
  inline: true,
  port: 4000,
  contentBase: '../static',
  historyApiFallback: {
    index: 'index.html',   // fallback to index.html
  },
};
const output = {
  path: path.join(__dirname, 'static'),
  filename: './js/bundle.js',
};
const modules = {
  rules: [
    {
      test: /\.js$/,
      loader: 'babel-loader',
      include: path.resolve(__dirname, './src'),
      options:
      {
        cacheDirectory: 'babel_cache',
        presets: [
          ['react'], ['es2015', { modules: false }],
        ],
        plugins: [
          ['react-css-modules', { context }],
        ],
      },
    },
    {
      test: /\.css$/,
      loader: ExtractTextPlugin.extract('css-loader?importLoader=1&modules&localIdentName=[path]___[name]__[local]___[hash:base64:5]'),
      include: path.resolve(__dirname, './src'),
    },
    {
      test: /\.html$/,
      loader: 'file-loader?name=[name].html',
    },
    { test: /\.(jpg|png|svg|gif)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'file-loader?name=./images/[name].[ext]&context=./images' },
    { test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'url-loader?limit=10000&mimetype=application/font-woff' },
    { test: /\.(ttf|eot)$/, loader: 'file-loader?name=fonts/[name].[ext]&context=./fonts' },
  ],
};
const plugins = [
  new ExtractTextPlugin({
    filename: 'css/style.css',   // extract css into single file (from css-modules)
  }),
  new webpack.DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  }),
  new webpack.optimize.UglifyJsPlugin({
    compress: { warnings: false },
    mangle: debug || false,
    sourcemap: debug || false,
    beautify: debug || false,
    dead_code: true,
  }),
];

// --------------
// export
// --------------
const config = {
  context,
  devtool,
  entry,
  devServer,
  output,
  module: modules,
  plugins,
};

module.exports = config;
