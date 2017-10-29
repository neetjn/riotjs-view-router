module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', 'riot'],
    files: [
      'test/e2e/*.spec.js'
    ],
    preprocessors: {
      '**/*.tag': ['riot']
    },
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['PhantomJS'],
    singleRun: true
  })
}
