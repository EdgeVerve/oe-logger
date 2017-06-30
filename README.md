# Overview

Logger utility to log messages.

## Usage

Once the logger is added to package.json and installed, it can be used in following way

```
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

```
{"logStreams": [{"type": "pretty"}],"levels": {"default": "info"}, "enableContextLogging": false}
```

### Log Streams

Support for three log streams is provided, which are
    * Standard Output: Prints log as JSON on the console
    * Pretty Standard Output: Prints log in a pretty format on the console
    * UDP stream: Streams log to a udp stream using gelf

Following are examples for configuring them for different log streams (standard output, pretty output, udp stream) respectively,

```
LOGGER_CONFIG={"logStreams":[{"type":"out"}],"levels":{"default":"debug"},"enableContextLogging":1}

LOGGER_CONFIG={"logStreams":[{"type":"pretty"}],"levels":{"default":"debug"},"enableContextLogging":1}

LOGGER_CONFIG={"logStreams":[{"type":"udp", "host":"127.0.0.1", "port":"1234"}],"levels":{"default":"debug"},"enableContextLogging":1}
```

Following are error log statement ```log.error({}, "sample log");``` the output for out and pretty streams are as follows respectively:

```
{"name":"oe-logger","hostname":"HOSTNAME","pid":9940,"__name__":"test","level":50,"msg":"sample log","time":"2016-01-01T11:28:50.643Z","v":0}

[2016-01-01T11:28:29.126Z] ERROR: oe-logger on HOSTNAME: sample log (test)
```