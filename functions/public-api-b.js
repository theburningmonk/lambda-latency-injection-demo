'use strict';

const co           = require('co');
const http         = require('../lib/http');
const apiHandler   = require('../lib/apiHandler');
const configClient = require('../lib/configClient');

const configObj = configClient.loadConfigs([ "public-api-b.config" ]);

module.exports.handler = apiHandler(
  co.wrap(function* (event, context) {
    let config      = JSON.parse(yield configObj.config);
    let uri         = config.internalApi;
    let chaosConfig = config.chaosConfig || {};
    let latencyInjectionConfig = chaosConfig.latencyInjectionConfig;
    
    let reply = yield http({ method : 'GET', uri, latencyInjectionConfig });
    
    return {
      message : "everything is still awesome",
      reply   : reply
    };
  })
);