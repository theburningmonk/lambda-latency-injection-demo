'use strict';

const co           = require('co');
const http         = require('../lib/http');
const apiHandler   = require('../lib/apiHandler');

module.exports.handler = apiHandler(
  "public-api-a.config",
  co.wrap(function* (event, context, configJson) {
    let config      = JSON.parse(configJson);
    let uri         = config.internalApi;
    let chaosConfig = config.chaosConfig || {};
    let latencyInjectionConfig = chaosConfig.httpClientLatencyInjectionConfig;
    
    let reply = yield http({ method : 'GET', uri, latencyInjectionConfig });
    
    return {
      message : "everything is awesome",
      reply   : reply
    };
  })
);