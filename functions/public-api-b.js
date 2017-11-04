'use strict';

const co         = require('co');
const apiHandler = require('../lib/apiHandler');
const injectable = require('../lib/injectable');
const Promise    = require('bluebird');
const AWS        = require('aws-sdk');
const asyncDDB   = Promise.promisifyAll(new AWS.DynamoDB.DocumentClient());
const dynamodb   = injectable.injectableAll(asyncDDB);

module.exports.handler = apiHandler(
  "public-api-b.config",
  co.wrap(function* (event, context, config) {    
    let chaosConfig = config.chaosConfig || {};
    let latencyInjectionConfig = chaosConfig.latencyInjectionConfig;
    
    let req = {
      TableName : 'latency-injection-demo-dev',
      Key: { id: 'foo' }
    };
    let item = yield dynamodb.getAsync(req, latencyInjectionConfig);
    
    return {
      message : "everything is still awesome",
      reply   : item
    };
  })
);