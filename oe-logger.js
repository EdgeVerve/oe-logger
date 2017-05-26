/*
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
    } catch(ex) {
        console.error('Error parsing LOGGER_CONFIG environment variable.' , ex.message);
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
    this.defaultContext = function() {
        return {ctxname: 'logContext',ctx: {remoteUser: 'system'}};
    };
    logLevel = config.levels[name] || config.levels['default'] || 'info';
    logLevel = levels[logLevel];
    updateLogger(this, logLevel);
}

var getMessage = function writeMessage(contextLogLevel, contextLogging, originalArguments) {
    var callContext = originalArguments[0];
    if ((callContext && callContext.ctx && callContext.ctx.logging && callContext.ctx.logging <= contextLogLevel) || (!contextLogging)) {
        var message = {context: {ctx: {}}};
        var inputContext = callContext ? callContext : {ctxname: 'logContext',ctx: {remoteUser: 'system'}};
        if (inputContext.modelName) {
            message.context.modelName = inputContext.modelName;
        }
        if (inputContext.ctx) {
            if (inputContext.ctx.logging) {
                message.context.ctx.logging = inputContext.ctx.logging;
            }
            if (inputContext.ctx.remoteUser) {
                message.context.ctx.remoteUser = inputContext.ctx.remoteUser;
            }
            if (inputContext.ctx.tenantId) {
                message.context.ctx.tenantId = inputContext.ctx.tenantId;
            }
        }
        message.message = '';
        for (var i = 1; i < originalArguments.length; i++) {
            message.message = message.message + safeStringify(originalArguments[i]);
        }
        return message;
    }
    return '';
};

function safeStringify(obj) {
    if (typeof obj === 'string') {
        return obj;
    }
    try {
        var stringified = JSON.stringify(obj, Object.getOwnPropertyNames(obj));
        return stringified;
    } catch (e) {
        return 'CIRCULAR OBJECT - ERROR';
    }
}

var updateLogger = function updateLoggerFn(curLogger, level) {
    if (!curLogger) {
        return; //this shouldn't happen, but just incase for some reason curLogger is undefined
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
                curLogger.logger.trace({context: message.context}, message.message);
            }
        };
        
        curLogger.debug = function contextLogging() {
            var message = getMessage(levels.debug, 1, arguments);
            if (message) {
                curLogger.logger.debug({context: message.context}, message.message);
            }
        };

        curLogger.info = function contextLogging() {
            var message = getMessage(levels.info, 1, arguments);
            if (message) {
                curLogger.logger.info({context: message.context}, message.message);
            }
        };

        curLogger.warn = function contextLogging() {
            var message = getMessage(levels.warn, 1, arguments);
            if (message) {
                curLogger.logger.warn({context: message.context}, message.message);
            }
        };

        curLogger.error = function contextLogging() {
            var message = getMessage(levels.error, 1, arguments);
            if (message) {
                curLogger.logger.error({context: message.context}, message.message);
            }
        };
        curLogger.fatal = function contextLogging() {
            var message = getMessage(levels.fatal, 1, arguments);
            if (message) {
                curLogger.logger.fatal({context: message.context}, message.message);
            }
        };

    }

    if (level <= levels.trace) {
        curLogger.trace = function trace() {
            var message = getMessage(levels.trace, 0, arguments);
            curLogger.logger.trace({context: message.context}, message.message);
        };
    }

    if (level <= levels.debug) {
        curLogger.debug = function debug() {
            var message = getMessage(levels.debug, 0, arguments);
            curLogger.logger.debug({context: message.context}, message.message);
        };
    }

    if (level <= levels.info) {
        curLogger.info = function info() {
            var message = getMessage(levels.info, 0, arguments);
            curLogger.logger.info({context: message.context}, message.message);
        };
    }

    if (level <= levels.warn) {
        curLogger.warn = function warn() {
            var message = getMessage(levels.warn, 0, arguments);
            curLogger.logger.warn({context: message.context}, message.message);
        };
    }

    if (level <= levels.error) {
        curLogger.error = function error() {
            var message = getMessage(levels.error, 0, arguments);
            curLogger.logger.error({context: message.context}, message.message);
        };
    }

    if (level <= levels.fatal) {
        curLogger.fatal = function fatal() {
            var message = getMessage(levels.fatal, 0, arguments);
            curLogger.logger.fatal({context: message.context}, message.message);
        };
    }
};

var createInstance = function() {

    var instance;
    var loggers = {};
    var bunyanOptions = {};

    bunyanOptions.name = config.name || 'oe-logger';
    config.logStreams = config.logStreams || [{ type: "pretty" }];
    config.levels = config.levels || { default: "info" };
    config.enableContextLogging = config.enableContextLogging || false;

    if (config.logStreams) {
        var tempStreams = [];
        for (var i = 0; i < config.logStreams.length; i++) {
            var curStream = config.logStreams[i];
            var myLevel = 10; /*DEFAULT LEVEL, EVERYTHING IS LOGGED*/
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

        var logger = bunyan.createLogger(bunyanOptions); //main logger - every other logger is a child of this one
        return {
            getLogger: function getLoggerFn() {
                return logger;
            },

            getLoggers: function getLoggersFn() { //array of child loggers
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
        },

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

loggerFn.initialize = function(options) {
    console.error('oe-logger initialize method is not used, use LOGGER_CONFIG environment variable instead');
};

module.exports = loggerFn;
