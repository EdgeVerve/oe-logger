var log;
var process = require('process');

function doTest(loggerConfig) {
  if (loggerConfig) {
    process.env.LOGGER_CONFIG = JSON.stringify(loggerConfig);
  }
  delete require.cache[require.resolve('../oe-logger')];
  log = require('../oe-logger')('logger-test');
  var options = {};
  log.trace(options, 'trace log');
  log.debug(options, 'debug log');
  log.info(options, 'info log');
  log.warn(options, 'warn log');
  log.error(options, 'error log');
  log.fatal(options, 'fatal log');
  log.fatal(options, new Error("error"));
}

var loggerConfig = {
  'name': 'oe-logger',
  'logStreams': [{
    'type': 'pretty'
  }],
  'levels': {
    'default': 'error'
  },
  'enableContextLogging': 1
};

console.log('test without logger config env');
doTest();

console.log('\ntest with LOGGER_CONFIG with error level');
doTest(loggerConfig);

console.log('\ntest with LOGGER_CONFIG with info level');
loggerConfig.levels.default = 'info';
doTest(loggerConfig);

console.log('\ntest with LOGGER_CONFIG with debug level');
loggerConfig.levels.default = 'debug';
doTest(loggerConfig);

console.log('\ntest with LOGGER_CONFIG with trace level');
loggerConfig.levels.default = 'trace';
doTest(loggerConfig);

console.log('\ntest with LOGGER_CONFIG with info level at file');
loggerConfig.levels.default = 'error';
loggerConfig.levels['logger-test'] = 'info';
doTest(loggerConfig);

console.log('\nnegative test with LOGGER_CONFIG with invalid object');
process.env.LOGGER_CONFIG = '{"ok"';
doTest();

console.log('\nnegative test with initialize call');
delete require.cache[require.resolve('../oe-logger')];
delete process.env.LOGGER_CONFIG;
log = require('../oe-logger');
log.initialize({});
log('ok').error('error test');
