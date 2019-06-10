var async = require('async');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var jwt = require('jsonwebtoken');
var moment = require('moment');
var request = require('request');
var base = require('../../../models');
var config = require('../../../config');

function generateToken(user) {
  var payload = {
    iss: 'my.domain.com',
    sub: user.id,
    iat: moment().unix(),
    exp: moment().add(7, 'days').unix()
  };
  return jwt.sign(payload, config.secret);
}

/**
 * Login required middleware
 */
exports.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.status(401).send({
      msg: 'Unauthorized'
    });
  }
};
/**
 * POST /login
 * Sign in with email and password
 */
exports.loginPost = (req, res, next) => {
  req.assert('email', req.__('%s no es válido', req.__('Correo'))).isEmail();
  req.assert('email', req.__('%s no puede estar vacio', req.__('Correo'))).notEmpty();
  req.assert('password', req.__('%s no puede estar vacio', req.__('Contraseña'))).notEmpty();
  req.sanitize('email').normalizeEmail({
    remove_dots: false
  });

  var errors = req.validationErrors();

  if (errors) {
    return res.status(400).send(errors);
  }

  base.User.findOne({
    email: req.body.email
  }, function(err, user) {
    if (!user) {
      return res.status(401).send({
        msg: req.__('Correo o Contraseña inválida')
      });
    }
    user.comparePassword(req.body.password, function(err, isMatch) {
      if (!isMatch) {
        return res.status(401).send({
          msg: req.__('Correo o Contraseña inválida')
        });
      }
      res.send({
        token: generateToken(user),
        user: user.toJSON()
      });
    });
  });
};

/**
 * POST /signup
 */
exports.signupPost = (req, res, next) => {
  req.assert('name', req.__('%s no puede estar vacio', req.__('Nombre'))).notEmpty();
  req.assert('email', req.__('%s no es válido', req.__('Correo Electrónico'))).isEmail();
  req.assert('email', req.__('%s no puede estar vacio', req.__('Correo Electrónico'))).notEmpty();
  req.assert('password', req.__('%s debe contener al menos %s caracteres', req.__('Contraseña'), global._password_min)).len(global._password_min);
  req.sanitize('email').normalizeEmail({
    remove_dots: false
  });

  var errors = req.validationErrors();

  if (errors) {
    return res.status(400).send(errors);
  }

  base.User.findOne({
    email: req.body.email
  }, function(err, user) {
    if (user) {
      return res.status(400).send({
        msg: req.__('El %s ya se encuentra asociado a otra cuenta', req.__('Correo Electrónico'))
      });
    }
    user = new base.User({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password
    });
    user.save(function(err) {
      res.send({
        token: generateToken(user),
        user: user
      });
    });
  });
};

/**
 * PUT /account
 * Update profile information OR change password.
 */
exports.accountPut = (req, res, next) => {
  if ('password' in req.body) {
    req.assert('password', req.__('%s debe contener al menos %s caracteres', req.__('Contraseña'), global._password_min)).len(global._password_min);
    req.assert('confirm', req.__('Las %s no coinciden', req.__('Contraseñas'))).equals(req.body.password);
  } else {
    req.assert('name', req.__('%s no puede estar vacio', req.__('Nombre'))).notEmpty();
    req.assert('email', req.__('%s no es válido', req.__('Correo Electrónico'))).isEmail();
    req.assert('email', req.__('%s no puede estar vacio', req.__('Correo Electrónico'))).notEmpty();
    req.sanitize('email').normalizeEmail({
      remove_dots: false
    });
  }

  var errors = req.validationErrors();

  if (errors) {
    return res.status(400).send(errors);
  }

  base.User.findById(req.user.id, function(err, user) {
    if ('password' in req.body) {
      user.password = req.body.password;
    } else {
      user.email = req.body.email;
      user.name = req.body.name;
      user.gender = req.body.gender;
      user.location = req.body.location;
      user.website = req.body.website;
    }
    user.save(function(err) {
      if ('password' in req.body) {
        res.send({
          msg: req.__('La %s ha sido cambiada', req.__('Contraseña'))
        });
      } else if (err && err.code === 11000) {
        res.status(409).send({
          msg: req.__('El %s ya se encuentra asociado a otra cuenta', req.__('Correo Electrónico'))
        });
      } else {
        res.send({
          user: user,
          msg: req.__('Su perfil ha sido actualizado')
        });
      }
    });
  });
};

/**
 * DELETE /account
 */
exports.accountDelete = (req, res, next) => {
  base.User.remove({
    _id: req.user.id
  }, function(err) {
    res.send({
      msg: 'Your account has been permanently deleted.'
    });
  });
};

/**
 * GET /unlink/:provider
 */
exports.unlink = (req, res, next) => {
  base.User.findById(req.user.id, function(err, user) {
    switch (req.params.provider) {
      case 'facebook':
        user.facebook = undefined;
        break;
      case 'google':
        user.google = undefined;
        break;
      case 'twitter':
        user.twitter = undefined;
        break;
      case 'vk':
        user.vk = undefined;
        break;
      default:
        return res.status(400).send({
          msg: 'Invalid OAuth Provider'
        });
    }
    user.save(function(err) {
      res.send({
        msg: 'Your account has been unlinked.'
      });
    });
  });
};

/**
 * POST /forgot
 */
exports.forgotPost = (req, res, next) => {
  req.assert('email', req.__('%s no es válido', req.__('Correo Electrónico'))).isEmail();
  req.assert('email', req.__('%s no puede estar vacio', req.__('Correo Electrónico'))).notEmpty();
  req.sanitize('email').normalizeEmail({
    remove_dots: false
  });

  var errors = req.validationErrors();

  if (errors) {
    return res.status(400).send(errors);
  }

  async.waterfall([
    function(done) {
      crypto.randomBytes(16, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      base.User.findOne({
        email: req.body.email
      }, function(err, user) {
        if (!user) {
          return res.status(400).send({
            msg: req.__('El $s %s no esta asociado a ninguna cuenta', req.__('Correo Electrónico'), req.body.email)
          });
        }
        user.passwordResetToken = token;
        user.passwordResetExpires = Date.now() + 3600000; // expire in 1 hour
        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var transporter = nodemailer.createTransport({
        service: 'Mailgun',
        auth: {
          user: process.env.MAILGUN_USERNAME,
          pass: process.env.MAILGUN_PASSWORD
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'support@yourdomain.com',
        subject: '✔ Reset your password on Mega Boilerplate',
        text: 'You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      transporter.sendMail(mailOptions, function(err) {
        res.send({
          msg: req.__('Un correo ha sido enviado a %s con las intrucciones para crear una nueva contraseña', req.body.email)
        });
        done(err);
      });
    }
  ]);
};

/**
 * POST /reset
 */
exports.resetPost = (req, res, next) => {
  req.assert('password', req.__('%s debe contener al menos %s caracteres', req.__('Contraseña'), global._password_min)).len(global._password_min);
  req.assert('confirm', req.__('Las %s no coinciden', req.__('Contraseñas'))).equals(req.body.password);

  var errors = req.validationErrors();

  if (errors) {
    return res.status(400).send(errors);
  }

  async.waterfall([
    function(done) {
      base.User.findOne({
          passwordResetToken: req.params.token
        })
        .where('passwordResetExpires').gt(Date.now())
        .exec(function(err, user) {
          if (!user) {
            return res.status(400).send({
              msg: 'Password reset token is invalid or has expired.'
            });
          }
          user.password = req.body.password;
          user.passwordResetToken = undefined;
          user.passwordResetExpires = undefined;
          user.save(function(err) {
            done(err, user);
          });
        });
    },
    function(user, done) {
      var transporter = nodemailer.createTransport({
        service: 'Mailgun',
        auth: {
          user: process.env.MAILGUN_USERNAME,
          pass: process.env.MAILGUN_PASSWORD
        }
      });
      var mailOptions = {
        from: 'support@yourdomain.com',
        to: user.email,
        subject: 'Your Mega Boilerplate password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      transporter.sendMail(mailOptions, function(err) {
        res.send({
          msg: 'Your password has been changed successfully.'
        });
      });
    }
  ]);
};

/**
 * POST /auth/facebook
 * Sign in with Facebook
 */
exports.authFacebook = function(req, res) {
  var profileFields = ['id', 'name', 'email', 'gender', 'location'];
  var accessTokenUrl = 'https://graph.facebook.com/v2.5/oauth/access_token';
  var graphApiUrl = 'https://graph.facebook.com/v2.5/me?fields=' + profileFields.join(',');

  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: process.env.FACEBOOK_SECRET,
    redirect_uri: req.body.redirectUri
  };

  // Step 1. Exchange authorization code for access token.
  request.get({
    url: accessTokenUrl,
    qs: params,
    json: true
  }, function(err, response, accessToken) {
    if (accessToken.error) {
      return res.status(500).send({
        msg: accessToken.error.message
      });
    }

    // Step 2. Retrieve user's profile information.
    request.get({
      url: graphApiUrl,
      qs: accessToken,
      json: true
    }, function(err, response, profile) {
      if (profile.error) {
        return res.status(500).send({
          msg: profile.error.message
        });
      }

      // Step 3a. Link accounts if user is authenticated.
      if (req.isAuthenticated()) {
        base.User.findOne({
          facebook: profile.id
        }, function(err, user) {
          if (user) {
            return res.status(409).send({
              msg: 'There is already an existing account linked with Facebook that belongs to you.'
            });
          }
          user = req.user;
          user.name = user.name || profile.name;
          user.gender = user.gender || profile.gender;
          user.picture = user.picture || 'https://graph.facebook.com/' + profile.id + '/picture?type=large';
          user.facebook = profile.id;
          user.save(function() {
            res.send({
              token: generateToken(user),
              user: user
            });
          });
        });
      } else {
        // Step 3b. Create a new user account or return an existing one.
        base.User.findOne({
          facebook: profile.id
        }, function(err, user) {
          if (user) {
            return res.send({
              token: generateToken(user),
              user: user
            });
          }
          base.User.findOne({
            email: profile.email
          }, function(err, user) {
            if (user) {
              return res.status(400).send({
                msg: user.email + ' is already associated with another account.'
              });
            }
            user = new base.User({
              name: profile.name,
              email: profile.email,
              gender: profile.gender,
              location: profile.location && profile.location.name,
              picture: 'https://graph.facebook.com/' + profile.id + '/picture?type=large',
              facebook: profile.id
            });
            user.save(function(err) {
              return res.send({
                token: generateToken(user),
                user: user
              });
            });
          });
        });
      }
    });
  });
};

exports.authFacebookCallback = function(req, res) {
  res.send('Loading...');
};
/**
 * POST /auth/google
 * Sign in with Google
 */
exports.authGoogle = function(req, res) {
  var accessTokenUrl = 'https://accounts.google.com/o/oauth2/token';
  var peopleApiUrl = 'https://www.googleapis.com/plus/v1/people/me/openIdConnect';

  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: process.env.GOOGLE_SECRET,
    redirect_uri: req.body.redirectUri,
    grant_type: 'authorization_code'
  };

  // Step 1. Exchange authorization code for access token.
  request.post(accessTokenUrl, {
    json: true,
    form: params
  }, function(err, response, token) {
    var accessToken = token.access_token;
    var headers = {
      Authorization: 'Bearer ' + accessToken
    };

    // Step 2. Retrieve user's profile information.
    request.get({
      url: peopleApiUrl,
      headers: headers,
      json: true
    }, function(err, response, profile) {
      if (profile.error) {
        return res.status(500).send({
          message: profile.error.message
        });
      }
      // Step 3a. Link accounts if user is authenticated.
      if (req.isAuthenticated()) {
        base.User.findOne({
          google: profile.sub
        }, function(err, user) {
          if (user) {
            return res.status(409).send({
              msg: 'There is already an existing account linked with Google that belongs to you.'
            });
          }
          user = req.user;
          user.name = user.name || profile.name;
          user.gender = profile.gender;
          user.picture = user.picture || profile.picture.replace('sz=50', 'sz=200');
          user.location = user.location || profile.location;
          user.google = profile.sub;
          user.save(function() {
            res.send({
              token: generateToken(user),
              user: user
            });
          });
        });
      } else {
        // Step 3b. Create a new user account or return an existing one.
        base.User.findOne({
          google: profile.sub
        }, function(err, user) {
          if (user) {
            return res.send({
              token: generateToken(user),
              user: user
            });
          }
          user = new base.User({
            name: profile.name,
            email: profile.email,
            gender: profile.gender,
            picture: profile.picture.replace('sz=50', 'sz=200'),
            location: profile.location,
            google: profile.sub
          });
          user.save(function(err) {
            res.send({
              token: generateToken(user),
              user: user
            });
          });
        });
      }
    });
  });
};

exports.authGoogleCallback = function(req, res) {
  res.send('Loading...');
};
