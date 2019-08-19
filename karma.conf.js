// karma.conf.js
module.exports = function(config) {
  config.set({
    frameworks: ["browserify", "mocha"],

    preprocessors: {
      "test/**/*.js": "browserify",
      "lib/**/*.js": "browserify"
    },

    browserify: {
      debug: true
    },

    files: ["lib/**.js", "test/**/*.js"],

    reporters: ["spec"],

    browsers: ["ChromeHeadless"],

    // for development only
  //   client: {
  //     captureConsole: true
  //   },
  //   browserConsoleLogOptions: {
  //     level: "log",
  //     format: "%b %T: %m",
  //     terminal: true
  //   },
  //   logLevel: "ALL"
  // });
};
