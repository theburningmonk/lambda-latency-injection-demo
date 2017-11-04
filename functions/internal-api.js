'use strict';

const co           = require('co');
const apiHandler   = require('../lib/apiHandler');
const configClient = require('../lib/configClient');

module.exports.handler = apiHandler(
  null,
  co.wrap(function* (event, context, configJson) {    
    return {
      message: "everything is... fine?"
    };
  })
);