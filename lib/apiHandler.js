'use strict';

const co = require('co');
const configClient = require('./configClient');

function OK (result) {
  return {
    statusCode: 200,
    body: JSON.stringify(result)
  };
};

function createApiHandler (configKey, f) {
  let configObj = configKey ? configClient.loadConfigs([ configKey ]) : undefined;

  return co.wrap(function* (event, context, cb) {
    console.log(JSON.stringify(event));

    let config = configObj ? yield configObj[configKey] : undefined;

    try {
      let result = yield Promise.resolve(f(event, context, config));
      result = result || {};

      console.log('SUCCESS', JSON.stringify(result));
      cb(null, OK(result));
    } catch (err) {
      console.error("Failed to process request", err);
      cb(err);
    }
  });
}

module.exports = createApiHandler;