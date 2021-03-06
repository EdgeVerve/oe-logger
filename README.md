# Overview

Logger utility to log messages.

## Usage

Once the logger is added to package.json and installed, it can be used in following way

```js
var logger = require("oe-logger");
var log = logger("testlog");

log.debug(context, arg1, arg2);
log.info(context, arg1, arg2);
log.warn(context, arg1, arg2);
log.error(context, arg1, arg2);
log.fatal(context, arg1, arg2);
```

The log functions accepts atleast two parameters,
    * first parameter is ```context``` which would be the callContext for the request
    * second parameter onward can be ```String``` or ```Object``` as they will be printed as a concatenated string.

The logger requires a configuration to be passed as environment variable ```LOGGER_CONFIG```. In case, no value is passed, then it uses default config, which is

```json
{"logStreams": [{"type": "pretty"}],"levels": {"default": "info"}, "enableContextLogging": false}
```

### Log Streams

Support for three log streams is provided, which are
    * Standard Output: Prints log as JSON on the console
    * Pretty Standard Output: Prints log in a pretty format on the console
    * UDP stream: Streams log to a udp stream using gelf

Following are examples for configuring them for different log streams (standard output, pretty output, udp stream) respectively,

```sh
export LOGGER_CONFIG={"logStreams":[{"type":"out"}],"levels":{"default":"debug"},"enableContextLogging":1}

export LOGGER_CONFIG={"logStreams":[{"type":"pretty"}],"levels":{"default":"debug"},"enableContextLogging":1}

export LOGGER_CONFIG={"logStreams":[{"type":"udp", "host":"127.0.0.1", "port":"1234"}],"levels":{"default":"debug"},"enableContextLogging":1}

export LOGGER_CONFIG={"logStreams":[{"type":"file","path":"./a.log","level":"debug"}],"levels":{"default":"debug"},"enableContextLogging":1}

export LOGGER_CONFIG={"logStreams":[{"type":"rotating-file","path":"./a.log","level":"debug", "period": "1d", "count": 3}],"levels":{"default":"debug"},"enableContextLogging":1}
Note: for rotating-file, following are optional, 
period - The period at which to rotate. This is a string of the format "$number$scope" where "$scope" is one of "ms" (milliseconds -- only useful for testing), "h" (hours), "d" (days), "w" (weeks), "m" (months), "y" (years). Or one of the following names can be used "hourly" (means 1h), "daily" (1d), "weekly" (1w), "monthly" (1m), "yearly" (1y). Rotation is done at the start of the scope: top of the hour (h), midnight (d), start of Sunday (w), start of the 1st of the month (m), start of Jan 1st (y).
count - The number of rotated files to keep.
```

Following are error log statement ```log.error({}, "sample log");``` the output for out and pretty streams are as follows respectively:

```
{"name":"oe-logger","hostname":"HOSTNAME","pid":9940,"__name__":"test","level":50,"msg":"sample log","time":"2016-01-01T11:28:50.643Z","v":0}

[2016-01-01T11:28:29.126Z] ERROR: oe-logger on HOSTNAME: sample log (test)
```

### Log Arguments

The first argument for the log statements can be call context, which allow to log modelName, remoteUser, tenantId and requestId related to the request being sent. These values are being placed in options/context of the request which can be passed as first argument to log them for easy filtering of requests.

Following is example to log a request details from the req-logging-filter, which passes the callContext as first argument for BaseUsers login API for admin user

```js
log.debug(req.callContext, "Body: ", req.body);
```

```
[2017-07-11T06:20:55.726Z] DEBUG: oe-logger on HOSTNAME: Body:  {"username":"admin","password":"admin"} (req-logging-filter, BaseUsers, system, default, 18c036a0-6601-11e7-9cc9-fbb7d2f1cd6b)
```