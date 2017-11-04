'use strict';

const co           = require('co');
const apiHandler   = require('../lib/apiHandler');
const configClient = require('../lib/configClient');

module.exports.handler = apiHandler(
  co.wrap(function* (event, context) {    
    return {
      message: "everything is... fine?"
    };
  })
);