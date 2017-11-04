'use strict';

const co = require('co');

function OK (result) {
  return {
    statusCode: 200,
    body: JSON.stringify(result)
  };
};

function createApiHandler (f) {  
  return co.wrap(function* (event, context, cb) {
    console.log(JSON.stringify(event));

    try {  
      let result = yield Promise.resolve(f(event, context));
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