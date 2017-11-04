'use strict';

const _            = require('lodash');
const co           = require('co');
const Promise      = require('bluebird');
const configClient = require('./configClient');
const AWSXRay      = require('aws-xray-sdk');

function OK (result) {
  return {
    statusCode: 200,
    body: JSON.stringify(result)
  };
};

let injectLatency = co.wrap(function* (config, segment) {  
  if (config.isEnabled === true && Math.random() < config.probability) {
    let delayRange = config.maxDelay - config.minDelay;
    let delay = Math.floor(config.minDelay + Math.random() * delayRange);

    console.log(`injecting [${delay}ms] latency to function invocation...`);
    
    let subsegment = segment.addNewSubsegment("## latency injection");
    subsegment.addMetadata("delay_ms", delay);

    yield Promise.delay(delay);

    subsegment.close();
  }
});

let exec = co.wrap(function* (f, event, context, config) {
  let segment = AWSXRay.getSegment();
  let funcSegment = segment.addNewSubsegment("API Handler");

  try {
    let result = yield Promise.resolve(f(event, context, config));
    result = result || {};

    return result;
  } finally {
    let latencyInjectionConfig = 
      _.get(config, 'chaosConfig.functionLatencyInjectionConfig', {});      
    yield injectLatency(latencyInjectionConfig, funcSegment);

    funcSegment.close();
  }
});

function createApiHandler (configKey, f) {
  let configObj = configKey ? configClient.loadConfigs([ configKey ]) : undefined;

  return co.wrap(function* (event, context, cb) {
    console.log(JSON.stringify(event));

    let config = 
      configObj 
        ? JSON.parse(yield configObj[configKey])
        : undefined;

    try {
      let result = yield exec(f, event, context, config);
      console.log('SUCCESS', JSON.stringify(result));      
      cb(null, OK(result));
    } catch (err) {
      console.error("Failed to process request", err);
      cb(err);
    }
  });
}

module.exports = createApiHandler;