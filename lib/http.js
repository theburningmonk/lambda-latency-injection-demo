'use strict';

const co      = require('co');
const Promise = require('bluebird');
const http    = require('superagent-promise')(require('superagent'), Promise);
const AWSXRay = require('aws-xray-sdk');

function getRequest (options) {
  let uri    = options.uri;
  let method = options.method || '';

  switch (method.toLowerCase()) {
    case '':
    case 'get':
      return http.get(uri);
    case 'head':
      return http.head(uri);
    case 'post':
      return http.post(uri);
    case 'put':
      return http.put(uri);
    case 'delete':
      return http.del(uri);
    default:
      throw new Error(`unsupported method : ${method.toLowerCase()}`);
  }
}

function setHeaders (request, headers) {
  let headerNames = Object.keys(headers);
  headerNames.forEach(h => request = request.set(h, headers[h]));

  return request;
}

function setQueryStrings (request, qs) {
  if (!qs) {
    return request;
  }
  
  return request.query(qs); 
}

function setBody (request, body) {
  if (!body) {
    return request;
  }

  return request.send(body);
}

let injectLatency = co.wrap(function* (config, segment) {  
  if (config.isEnabled === true && Math.random() < config.probability) {
    let delayRange = config.maxDelay - config.minDelay;
    let delay = Math.floor(config.minDelay + Math.random() * delayRange);

    console.log(`injecting [${delay}ms] latency to HTTP request...`);
    
    let subsegment = segment.addNewSubsegment("## latency injection");
    subsegment.addMetadata("delay_ms", delay);

    yield Promise.delay(delay);

    subsegment.close();
  }
});

let exec = co.wrap(function* (request, segment) {
  let subsegment = segment.addNewSubsegment("## exec request");
  subsegment.addMetadata("url", request.url);

  try {
    return yield request;
  } finally {
    subsegment.close();
  }
});

// options: { 
//    uri     : string
//    method  : GET (default) | POST | PUT | HEAD
//    headers : object
//    qs      : object
//    body    : object,
//    resolveWithFullResponse : bool (default to false)
//    latencyInjectionConfig : { isEnabled: bool, probability: Double, minDelay: Double, maxDelay: Double }
//  }
let Req = function* (options) {
  if (!options) {
    throw new Error('no HTTP request options is provided');
  }

  if (!options.uri) {
    throw new Error('no HTTP uri is specified');
  }

  let request = getRequest(options);
  request = setHeaders(request, options.headers || {});
  request = setQueryStrings(request, options.qs);
  request = setBody(request, options.body);

  let fullResponse = options.resolveWithFullResponse === true;

  let segment = AWSXRay.getSegment();
  let subsegment = segment.addNewSubsegment("HTTP client");

  let latencyInjectionConfig = options.latencyInjectionConfig;
  yield injectLatency(latencyInjectionConfig, subsegment);

  try {
    let resp = yield exec(request, subsegment);
    return fullResponse ? resp : resp.body;
  } catch (e) {
    if (e.response && e.response.error) {
      throw e.response.error;
    }
    
    throw e;
  } finally {
    subsegment.close();
  }
};

module.exports = Req;