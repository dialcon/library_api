
const address = 'localhost';

var enviroment = {
  app: 'miaguila',
  apikey: {
    key: 'PBDFJZF3SKMXWRUSTHNG',
    secret: 'NZSJJ7OIIOAIQNDST7NVFGURGJUC5K9VJMRF8K5Y48MOSS1MP7RKEA8XU4FFFBQMDGDIZ3TXX1YAORMKHN6XE7FY9G1JI42MTK1M',
    name: 'homedesk'
  },
  url_gate: 'http://localhost:3044',
  url_transaction: 'http://localhost:3044',
  db: {
    redis: {
      url: 'redis://localhost/',
      retry_strategy: function (options) {
        if (options.error.code === 'ECONNREFUSED') {
          return new Error('The server refused the connection');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Retry time exhausted');
        }
        if (options.times_connected > 10) {
          return undefined;
        }
        return Math.max(options.attempt * 100, 3000);
      }
    },
  },
  sites: {
    admin: {
      name: 'admin',
      description: 'Api para la administración de la Biblioteca',
      port: 3070,
      host: address,
      cb: `http://${address}:3070`
    },
  }
};

module.exports = enviroment;
