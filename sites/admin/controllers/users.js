/* eslint-disable no-undef */
'use strict';
var request = require('request');
var async = require('async');
var libUsers = require(`${_path}/libs/users`);
var libAlliances = require(`${_path}/libs/alliances`);
var libValidatePhone = require(`${_path}/libs/validate_phone`);



function getUser(user_id, returnString, cb) {
  request.get({
    url: `${config.url_gate}/v1/${config.app}/users/${user_id}`,
    json: true,
    qs: {
      return: returnString
    },
    headers: {
      'apikey': config.apikey.key
    }
  }, (err, result, body) => {
    if (err || result.statusCode !== 200) {
      return cb(err || body);
    }
    cb(null, body);
  });
}

/**
 * Realiza el login con los parametros enviados, se implementa FCM para la facil comunicación con los usuarios
 * @param  {String} req.body.device_id
 * @param  {String} req.body.device_type
 * @param  {String} req.body.email
 * @param  {String} req.body.password
 * @return {Object}
 */
exports.login = (req, res, next) => {
  req.assert('email', 'EmailNotValid').isEmail();
  req.assert('email', 'EmailNotEmpty').notEmpty();
  req.assert('password', 'PasswordNotEmpty').notEmpty();
  req.sanitize('email').normalizeEmail({
    remove_dots: false,
    all_lowercase: true
  });

  if (!req.body.device_id) {
    return listErrors(4001, res);
  }
  if (!req.body.device_type) {
    return listErrors(4002, res);
  }

  async.auto({
    login: (cb) => {
      request.post({
        url: `${config.url_gate}/v1/login/${config.app}/users`,
        json: true,
        headers: {
          'apikey': config.apikey.key
        },
        qs: req.query,
        body: req.body
      }, (err, result, body) => {
        if (err || result.statusCode !== 200) {
          return cb(err || {
            statusCode: result.statusCode,
            body: body
          });
        }
        return cb(null, body);
      });
    },
    validateAdmin: ['login', (results, cb) => {
      if (!results.login.user.admin) {
        return cb(listErrors(401));
      }
      cb(null, true);
    }],
    deleteOthersFCM: ['login', 'validateAdmin', (results, cb) => {
      cb();
    }],
    setFCM: ['deleteOthersFCM', (results, cb) => {
      request.get({
        url: `${config.url_gate}/v1/${config.app}/fcms`,
        json: true,
        headers: {
          'apikey': config.apikey.key
        },
        qs: {
          user_id: results.login.user._id,
          device_id: req.body.device_id,
          return: '_id,active'
        }
      }, (err, result, body) => {
        if (err || result.statusCode !== 200) {
          return cb(err || body);
        }
        if (body.result.length) {
          async.mapLimit(body.result, 10, (item, cb) => {
            request.put({
              url: item.active ? `${config.url_gate}/v1/${config.app}/fcms/${item._id}` : `${config.url_gate}/v1/activate/${config.app}/fcms/${item._id}`,
              json: true,
              headers: {
                'apikey': config.apikey.key
              },
              body: {
                fcm_id: req.body.fcm_id,
                device_type: req.body.device_type
              }
            }, (err, result, body) => {
              if (err || result.statusCode !== 200) {
                return cb(err || body);
              }
              cb(null, true);
            });
          }, (err, results) => {
            if (err) {
              return cb(err);
            }
            return cb(null, body.result);
          });
        } else {
          request.post({
            url: `${config.url_gate}/v1/${config.app}/fcms`,
            json: true,
            headers: {
              'apikey': config.apikey.key
            },
            body: {
              user_id: results.login.user._id,
              device_id: req.body.device_id,
              fcm_id: req.body.fcm_id,
              device_type: req.body.device_type
            }
          }, (err, result, body) => {
            if (err || result.statusCode !== 200) {
              return cb(err || body);
            }
            cb(null, true);
          });
        }

      });
    }]
  }, (err, results) => {
    //validación para errores de falta de parametros
    if (err && err.statusCode) {
      return res.status(err.statusCode).send(err);
    } else if (err) {
      return listErrors(500, res);
    }
    res.status(200).send(results.login);
  });
};

exports.get = (req, res, next) => {
  request.get({
    url: `${config.url_gate}/v1/${config.app}/users/${req.params.user_id}`,
    json: true,
    headers: {
      'apikey': config.apikey.key
    },
    qs: req.query
  }, (err, result, body) => {
    if (err) {
      return listErrors(500, res);
    }
    res.status(result.statusCode).send(body);
  });
};

exports.list = (req, res, next) => {
  request.get({
    url: `${config.url_gate}/v1/${config.app}/users${req.params.count ? '/count' : ''}`,
    json: true,
    qs: req.query,
    headers: {
      'apikey': config.apikey.key
    }
  }, (err, result, body) => {
    if (err) {
      console.log(err);
      return listErrors(500, res);
    }
    res.send(body);
  });
};


exports.post = (req, res, next) => {
  if (req.body.personal_info) {
    req.body.personal_info.image = 'https://s3.amazonaws.com/miaguila.pictures/profile/900922';
  }


  let errorMessage = '';
  if (_.get(req.body, 'personal_info.firstname')) {
    req.body.personal_info.firstname = (req.body.personal_info.firstname || '')
      .trim()
      .split(' ')
      .map(name => _.capitalize(name))
      .join(' ');
  }
  if (_.get(req.body, 'personal_info.lastname')) {
    req.body.personal_info.lastname = (req.body.personal_info.lastname || '')
      .trim()
      .split(' ')
      .map(name => _.capitalize(name))
      .join(' ');
  }
  if (req.body.email) {
    req.body.email = (req.body.email || '').trim().toLowerCase();
  }
  request.post({
    url: `${config.url_gate}/v1/${config.app}/users`,
    json: true,
    headers: {
      'apikey': config.apikey.key
    },
    qs: req.query,
    body: req.body
  }, (err, result, body) => {
    if (err && err.statusCode) {
      return res.status(err.statusCode).send(err.body || err);
    } else if (err) {
      return listErrors(500, res);
    }
    body.errorMessage = errorMessage;
    res.status(200).send(body);
  });
};

exports.put = (req, res, next) => {
  if (req.body.password) {
    req.body.password_restore = true;
  }
  if (_.get(req.body, 'personal_info.firstname')) {
    req.body.personal_info.firstname = (req.body.personal_info.firstname || '')
      .trim()
      .split(' ')
      .map(name => _.capitalize(name))
      .join(' ');
  }
  if (_.get(req.body, 'personal_info.lastname')) {
    req.body.personal_info.lastname = (req.body.personal_info.lastname || '')
      .trim()
      .split(' ')
      .map(name => _.capitalize(name))
      .join(' ');
  }
  if (req.body.email) {
    req.body.email = (req.body.email || '').trim().toLowerCase();
  }
  request.put({
    url: `${config.url_gate}/v1/${config.app}/users/${req.params.user_id}`,
    json: true,
    headers: {
      'apikey': config.apikey.key
    },
    qs: req.query,
    body: req.body
  }, (err, result, body) => {
    if (err) {
      return listErrors(500, res);
    }
    res.status(result.statusCode).send(body);
  });
};


exports.me = (req, res, next) => {
  request.get({
    url: `${config.url_gate}/v1/${config.app}/users/${req.user._id}`,
    json: true,
    headers: {
      'apikey': config.apikey.key
    },
    qs: req.query
  }, (err, result, body) => {
    if (err) {
      return listErrors(500, res);
    }
    res.status(result.statusCode).send(body);
  });
};

exports.setMe = (req, res, next) => {
  let modifiedPhone = false;
  async.autoInject({
    getUser(cb) {
      getUser(req.user._id, '_id,personal_info.phone', function (err, user) {
        if (err) {
          return cb(err);
        }
        if (user.type_user !== 'admin' || user === undefined) {
          return listErrors(401, res);
        }
        cb(null, user);
      });
    },
    updateUser(getUser, cb) {
      let valid = {
        personal_info: req.body.personal_info,
        users_ids: req.body.users_ids
      };
      if (req.body.password) {
        valid.password = req.body.password;
      }
      if (_.get(req.body, 'personal_info.firstname')) {
        req.body.personal_info.firstname = (req.body.personal_info.firstname || '')
          .trim()
          .split(' ')
          .map(name => _.capitalize(name))
          .join(' ');
      }
      if (_.get(req.body, 'personal_info.lastname')) {
        req.body.personal_info.lastname = (req.body.personal_info.lastname || '')
          .trim()
          .split(' ')
          .map(name => _.capitalize(name))
          .join(' ');
      }
      if (req.body.email) {
        req.body.email = (req.body.email || '').trim().toLowerCase();
      }
      delete req.params.user_id;
      request.put({
        url: `${config.url_gate}/v1/${config.app}/users/${req.user._id}`,
        json: true,
        headers: {
          'apikey': config.apikey.key
        },
        qs: req.query,
        body: valid
      }, (err, result, body) => {
        if (err || result.statusCode !== 200) {
          return cb(err || body);
        }
        cb(null, body)
      });
    }

  }, (err, results) => {
    if (err && err.statusCode) {
      return res.status(err.statusCode).send(err);
    } else if (err) {
      return listErrors(500, res);
    }
    res.status(200).send({
      result: results.updateUser
    });
  });

};