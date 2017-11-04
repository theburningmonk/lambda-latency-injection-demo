'use strict';

const _       = require('lodash');
const co      = require('co');
const Promise = require('bluebird');
const AWSXRay = require('aws-xray-sdk');

function isLatencyInjectionConfig(obj) {
  return obj.hasOwnProperty("isEnabled") &&
         obj.hasOwnProperty("probability") &&
         obj.hasOwnProperty("minDelay") &&
         obj.hasOwnProperty("maxDelay");
}

let injectLatency = co.wrap(function* (config) {  
  if (config.isEnabled === true && Math.random() < config.probability) {
    let delayRange = config.maxDelay - config.minDelay;
    let delay = Math.floor(config.minDelay + Math.random() * delayRange);

    console.log(`injecting [${delay}ms] latency to wrapped function...`);

    let segment = AWSXRay.getSegment();
    let subsegment = segment.addNewSubsegment("## [wrapper] latency injection");
    subsegment.addMetadata("delay_ms", delay);

    yield Promise.delay(delay);

    subsegment.close();
  }
});

function wrapFunction(f) {
  let _wrapped = function() {
    let args = Array.prototype.slice.call(arguments, 0);
    let config = _.last(args);
    if (config && isLatencyInjectionConfig(config)) {
      args.pop();
      let resp = f.apply(this, args);
      return resp
        .then(resp => injectLatency(config).then(() => resp))
        .catch(e => injectLatency(config).then(() => { throw e }));
    } else {
      return f.apply(this, args);
    }
  };

  return _wrapped;
}

function injectableAll(promisifiedObj) {
  for (let prop in promisifiedObj) {
    if (typeof promisifiedObj[prop] === "function" 
        && promisifiedObj[prop].__isPromisified__ === true) {
      promisifiedObj[prop] = wrapFunction(promisifiedObj[prop]);
    }
  }

  return promisifiedObj;
}

module.exports = {
  injectableAll
};