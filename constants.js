/* eslint-disable no-undef */
//se cargan como globales todas  las librerias necesarias
'use strict';
global._ = require('lodash');
global.moment = require('moment-timezone');
global.async = require('async');
global.request = require('request');
global.config = require(`${_path}/config`);
global.listErrors = require(`${_path}/libs/errors`);


global.cl = function (...args) {
  _.forEach(arguments, (arg) => {
    arg = JSON.stringify(arg);
  });
};
