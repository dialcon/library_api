'use strict';
var request = require('request');
var config = require(`${_path}/config`);
var listErrors = require(`${_path}/libs/errors`);

exports.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    request.get({
      url: `${config.url_gate}/v1/${config.app}/fcms`,
      json: true,
      headers: {
        'apikey': config.apikey.key
      },
      qs: {
        active: true,
        user_id: req.user._id,
        device_id: req.user.device_id,
        return: '_id'
      }
    }, (err, result, body) => {
      if (err) {
        return listErrors(500, res);
      }
      if (result.statusCode !== 200) {
        return res.status(result.statusCode).send(body);
      }
      if (!body.result.length) {
        return listErrors(401, res);
      }
      next();
    });
  } else {
    return listErrors(401, res);
  }
};