﻿/*
©2015-2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.
The EdgeVerve proprietary software program ("Program"), is protected by copyrights laws, international treaties and other pending or existing intellectual property rights in India, the United States and other countries.
The Program may contain/reference third party or open source components, the rights to which continue to remain with the applicable third party licensors or the open source community as the case may be and nothing here transfers the rights to the third party and open source components, except as expressly permitted.
Any unauthorized reproduction, storage, transmission in any form or by any means (including without limitation to electronic, mechanical, printing, photocopying, recording or  otherwise), or any distribution of this Program, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.
*/
var bunyan = require('bunyan');
var gelfStream = require('gelf-stream');
var PrettyStream = require('bunyan-prettystream');

var levels = {
  'trace': 10,
  'debug': 20,
  'info': 30,
  'warn': 40,
  'error': 50,
  'fatal': 60
};

var config;
var configStr = process.env.LOGGER_CONFIG;
if (configStr) {
  try {
    config = JSON.parse(process.env.LOGGER_CONFIG);
  } catch (ex) {
    console.error('Error parsing LOGGER_CONFIG environment variable.', ex.message);
  }
}
if (!config) {
  config = {};
}

function PecLogger(loggerImpl, debugLogger, name) {
  this.logger = loggerImpl;
  this.debugLogger = debugLogger;
  this.name = name;
  var logLevel = 0;

  this.info = function empty() {};
  this.trace = function empty() {};
  this.warn = function empty() {};
  this.error = function empty() {};
  this.debug = function empty() {};
  this.fatal = function empty() {};
  this.defaultContext = function () {
    return { ctxname: 'logContext', ctx: { remoteUser: 'system' } };
  };
  logLevel = config.levels[name] || config.levels.default || 'info';
  logLevel = levels[logLevel];
  updateLogger(this, logLevel);
}

var convertArguments = function connvertToArray(allArguments) {
  var args = [];
  for (var i = 0; i < allArguments.length; i++) {
    args.push(allArguments[i]);
  }
  return args;
};

var getMessage = function writeMessage(contextLogLevel, contextLogging, originalArguments) {
  var args = convertArguments(originalArguments);
  if (typeof args[0] === 'string') {
    for (var count = args.length; count > 0; count--) {
      args[count] = args[count - 1];
    }
    args[0] = {};
  }
  var callContext = args[0];
  if ((callContext && callContext.ctx && callContext.ctx.logging && callContext.ctx.logging <= contextLogLevel) || (!contextLogging)) {
    var message = { context: {}, message: '' };
    var inputContext = callContext ? callContext : { ctxname: 'logContext', ctx: { remoteUser: 'system' } };
    if (inputContext.modelName) {
      message.context.modelName = inputContext.modelName;
    }
    if (inputContext.ctx) {
      if (inputContext.ctx.logging) {
        message.context.logging = inputContext.ctx.logging;
      }
      if (inputContext.ctx.remoteUser) {
        message.context.remoteUser = inputContext.ctx.remoteUser;
      }
      if (inputContext.ctx.tenantId) {
        message.context.tenantId = inputContext.ctx.tenantId;
      }
      if (inputContext.ctx.requestId) {
        message.context.requestId = inputContext.ctx.requestId;
      }
    }
    // if (inputContext.accessToken) {
    //   message.context.accessToken = inputContext.accessToken;
    // }
    if (inputContext.txnId) {
      // message.context.txnId = inputContext.txnId;
      if (!message.context.requestId) {
        message.context.requestId = inputContext.txnId;
      }
    }
    for (var i = 1; i < args.length; i++) {
      message.message = message.message + ' ' + safeStringify(args[i]);
    }
    message.message = message.message.trim();
    return message;
  }
  return '';
};

function safeStringify(obj) {
  if (typeof obj === 'string') {
    return obj;
  }

  var stringified;

  if (obj instanceof Error) {
    try {
      stringified = JSON.stringify(obj, Object.getOwnPropertyNames(obj));
      return stringified;
    } catch (e) {
      return 'CIRCULAR OBJECT - ERROR';
    }
  }

  try {
    stringified = JSON.stringify(obj);
    return stringified;
  } catch (e) {
    try {
      stringified = JSON.stringify(obj, Object.getOwnPropertyNames(obj));
      return stringified;
    } catch (er) {
      return 'CIRCULAR OBJECT - ERROR';
    }
  }
}

var updateLogger = function updateLoggerFn(curLogger, level) {
  if (!curLogger) {
    // this shouldn't happen, but just incase for some reason curLogger is undefined
    return;
  }
  curLogger.level = level;

  function empty() {}
  curLogger.trace = empty;
  curLogger.info = empty;
  curLogger.warn = empty;
  curLogger.error = empty;
  curLogger.debug = empty;
  curLogger.fatal = empty;

  if (config && config.enableContextLogging === 1) {
    curLogger.trace = function contextLogging() {
      var message = getMessage(levels.trace, 1, arguments);
      if (message) {
        curLogger.logger.trace(message.context, message.message);
      }
    };

    curLogger.debug = function contextLogging() {
      var message = getMessage(levels.debug, 1, arguments);
      if (message) {
        curLogger.logger.debug(message.context, message.message);
      }
    };

    curLogger.info = function contextLogging() {
      var message = getMessage(levels.info, 1, arguments);
      if (message) {
        curLogger.logger.info(message.context, message.message);
      }
    };

    curLogger.warn = function contextLogging() {
      var message = getMessage(levels.warn, 1, arguments);
      if (message) {
        curLogger.logger.warn(message.context, message.message);
      }
    };

    curLogger.error = function contextLogging() {
      var message = getMessage(levels.error, 1, arguments);
      if (message) {
        curLogger.logger.error(message.context, message.message);
      }
    };
    curLogger.fatal = function contextLogging() {
      var message = getMessage(levels.fatal, 1, arguments);
      if (message) {
        curLogger.logger.fatal(message.context, message.message);
      }
    };
  }

  if (level <= levels.trace) {
    curLogger.trace = function trace() {
      var message = getMessage(levels.trace, 0, arguments);
      curLogger.logger.trace(message.context, message.message);
    };
  }

  if (level <= levels.debug) {
    curLogger.debug = function debug() {
      var message = getMessage(levels.debug, 0, arguments);
      curLogger.logger.debug(message.context, message.message);
    };
  }

  if (level <= levels.info) {
    curLogger.info = function info() {
      var message = getMessage(levels.info, 0, arguments);
      curLogger.logger.info(message.context, message.message);
    };
  }

  if (level <= levels.warn) {
    curLogger.warn = function warn() {
      var message = getMessage(levels.warn, 0, arguments);
      curLogger.logger.warn(message.context, message.message);
    };
  }

  if (level <= levels.error) {
    curLogger.error = function error() {
      var message = getMessage(levels.error, 0, arguments);
      curLogger.logger.error(message.context, message.message);
    };
  }

  if (level <= levels.fatal) {
    curLogger.fatal = function fatal() {
      var message = getMessage(levels.fatal, 0, arguments);
      curLogger.logger.fatal(message.context, message.message);
    };
  }
};

var createInstance = function () {
  var instance;
  var loggers = {};
  var bunyanOptions = {};

  bunyanOptions.name = config.name || 'oe-logger';
  config.logStreams = config.logStreams || [{ type: 'pretty' }];
  config.levels = config.levels || { default: 'info' };
  config.enableContextLogging = config.enableContextLogging || false;

  var tempStreams = [];
  if (config.logStreams) {
    for (var i = 0; i < config.logStreams.length; i++) {
      var curStream = config.logStreams[i];
      // DEFAULT LEVEL, EVERYTHING IS LOGGED
      var myLevel = 10;
      if (curStream.level) {
        myLevel = curStream.level;
      }

      if (curStream.type === 'udp') {
        if (curStream.host && curStream.port) {
          var stream = gelfStream.forBunyan(curStream.host, curStream.port);
          tempStreams.push({
            stream: stream,
            type: 'raw',
            level: myLevel
          });
        }
      } else if (curStream.type === 'pretty') {
        var prettyStdOut = new PrettyStream();
        prettyStdOut.pipe(process.stdout);
        tempStreams.push({
          stream: prettyStdOut,
          level: myLevel
        });
      } else if (curStream.type === 'out') {
        tempStreams.push({
          stream: process.stdout
        });
      } else {
        tempStreams.push(curStream);
      }
    }
  }
  bunyanOptions.streams = tempStreams;

  function init() {
    // main logger - every other logger is a child of this one
    var logger = bunyan.createLogger(bunyanOptions);
    return {
      getLogger: function getLoggerFn() {
        return logger;
      },

      getLoggers: function getLoggersFn() {
        // array of child loggers
        return loggers;
      },

      setLogger: function setLoggerFn(newLogger) {
        loggers[newLogger.name] = newLogger;
      },

      changeLogger: function changeLoggerFn(logger, level) {
        updateLogger(logger, level);
      }
    };
  }

  return {
    getInstance: function getInstanceFn() {
      if (!instance) {
        instance = init();
      }
      return instance;
    }

  };
};

var mySingleton;

var loggerFn = function createLogger(name) {
  if (!mySingleton) {
    mySingleton = createInstance({});
  }

  if (name === 'LOGGER-CONFIG') {
    return mySingleton.getInstance();
  }

  var myLogger = mySingleton.getInstance().getLogger();
  var logArray = mySingleton.getInstance().getLoggers();

  if (logArray[name]) {
    return logArray[name];
  }

  var debug = require('debug')(name);
  var newLogger = new PecLogger(myLogger.child({
    __name__: name
  }), debug, name);
  mySingleton.getInstance().setLogger(newLogger);
  return mySingleton.getInstance().getLoggers()[name];
};

loggerFn.DEBUG_LEVEL = levels.debug;
loggerFn.ERROR_LEVEL = levels.error;
loggerFn.INFO_LEVEL = levels.info;
loggerFn.WARN_LEVEL = levels.warn;
loggerFn.NONE_LEVEL = levels.none;
loggerFn.FATAL_LEVEL = levels.fatal;

loggerFn.initialize = function (options) {
  console.error('oe-logger initialize method is not used, use LOGGER_CONFIG environment variable instead');
};

module.exports = loggerFn;
