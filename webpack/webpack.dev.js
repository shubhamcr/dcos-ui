const { DefinePlugin } = require("webpack");
const merge = require("webpack-merge");

const common = require("./webpack.config.js");

module.exports = merge(common, {
  entry: {
    index: "./src/js/index.js"
  },
  devtool: "cheap-module-eval-source-map",
  plugins: [
    new DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify("development"),
        LATER_COV: false
      }
    })
  ]
});
