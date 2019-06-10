global._path = __dirname;
require('./constants');

var config = require('./config');

var express = require('express');
var device = require('express-device');
var path = require('path');
var morgan = require('morgan');
var compression = require('compression');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var redis = require('redis');
var i18n = require('i18n');
var app = express();
var handler = require('./libs/handler');
var apicache = require('apicache');
var crypto = require('crypto');
var libDevice = require(`${_path}/libs/deviceDetect`);
var Redlock = require('redlock');

//redis
global.redis = redis.createClient(config.db.redis.url);
global.redis.select(3, () => { });
global.redis.on('connect', () => {
  console.log('Redis connection open to ' + config.db.redis.url);
});
global.redis.on('error', (err) => {
  console.log('Error ' + err);
});

global.onlyStatus200 = (req, res) => parseInt((res.statusCode || 500) / 100) === 2;

i18n.configure({
  locales: ['es', 'en'],
  directory: __dirname + '/locales',
  queryParameter: 'lang',
});
i18n.setLocale('es');

global.__ = i18n.__;

global.cache = apicache
  .options({
    redisClient: global.redis,
    appendKey: (req, res) => {
      // hash the request body as the key for the POST endpoint
      return req.method + crypto.createHash('sha256').update(JSON.stringify(req.body), 'utf8').digest('hex');
    }
  })
  .middleware;

global.redlock = new Redlock(
  [global.redis], {
    driftFactor: 0.01, // time in ms
    retryCount: 1000000,
    retryDelay: 200, // time in ms
    retryJitter: 200 // time in ms
  }
);

//por of service
var port = (process.env.VCAP_APP_PORT || config.sites[process.env.SERVER_MODE_ENV].port);
app.set('port', port);

//middleware
app.use(i18n.init);
app.use(compression());
app.use(device.capture());
//app.use(morgan('[:date[clf]] :remote-addr - :remote-user ':method :url HTTP/:http-version' :status :res[content-length] - :response-time ms'));

app.use(bodyParser.json({
  limit: '1024mb'
}));
app.use(bodyParser.urlencoded({
  limit: '1024mb',
  extended: true,
  keepExtensions: true,
  parameterLimit: 1000000,
  defer: true
}));
app.use(require('./libs/crossdomain'));

app.use(expressValidator());
app.use(cookieParser());

app.use(handler.log);
app.use(handler.client);
app.use(handler.error);

app.use(express.static(path.join(__dirname, 'public')));

app.use(require('./libs/auth'));
app.use(morgan(function (tokens, req, res) {
  return [
    tokens.date(req, res, 'clf'),
    tokens['remote-addr'](req, res),
    tokens['remote-user'](req, res),
    tokens.method(req, res),
    tokens.url(req, res).split('?')[0],
    'status=', tokens.status(req, res),
    tokens.res(req, res, 'content-length'), '-',
    tokens['response-time'](req, res), 'ms',
    '_id=', req.user ? req.user._id : '',
    'device_id=', req.user ? req.user.device_id : '',
    'fcm_id=', req.user ? req.user.fcm_id : '',
    'body=', JSON.stringify(_.omit(req.body, ['number', 'cvv', 'month', 'year', 'type', 'password'])),
    'query=', JSON.stringify(req.query),
    'params=', JSON.stringify(req.params),
    'device=', JSON.stringify(libDevice(req))
  ].join(' ');
}));

require(`./sites/${process.env.SERVER_MODE_ENV}`)(app);

app.get('/', function (req, res) {
  res.status(200).send({
    ok: true
  });
});
app.post('/user/login', function (req, res) {
  res.status(200).send({
    'success': true,
    'data': {
      'auth': {
        'token': '123456'
      },
      'user': {
        'id': 1
      }
    }
  });
});
app.post('/user/verify/email_or_domain', function (req, res) {
  res.status(200).send({
    'success': true,
    'data': {
      'verification_type': 'email',
      'data': [{
        'id': 1
      }]
    }
  });
});
app.get('/v1/me', function (req, res) {
  res.status(200).send({
    'success': true,
    'data': {
      'id': 1
    }
  });
});
app.get(`/v1/${process.env.SERVER_MODE_ENV}/status`, function (req, res) {
  var server = config.sites[process.env.SERVER_MODE_ENV];
  var memory = process.memoryUsage();
  memory = {
    rss: memory.rss / 1048576,
    heapTotal: memory.heapTotal / 1048576,
    heapUsed: memory.heapUsed / 1048576
  };
  res.status(200).send({
    name: server.name,
    description: server.description,
    memory: memory
  });
});

// Production error handler
if (app.get('env') === 'production') {
  app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.sendStatus(err.status || 500);
  });
}

//404
app.use(function (req, res, next) {
  res.status(404).send({
    error: 'API NOT FOUND'
  });
});

app.disable('x-powered-by');
app.disable('apicache-store');
app.disable('apicache-version');

app.listen(app.get('port'), () => {
  console.log(
    '+============================================================+\n' +
    `|                    START SERVER ${app.get('port')}         |\n` +
    '+============================================================+\n' +
    'Iniciado el ' + new Date() + '\n' +
    '*** ' + config.sites[process.env.SERVER_MODE_ENV].name + '\n' +
    '*** ' + config.sites[process.env.SERVER_MODE_ENV].description + '\n' +
    'Escuhando en http://localhost:' + app.get('port')
  );
});

module.exports = app;
