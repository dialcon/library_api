/* eslint-disable no-console */
var async = require('async');
var _ = require('lodash');
var request = require('request');
require('colors');


var url_core = 'http://localhost:3043';
var url_gate = 'http://localhost:3044';
var email = 'dialcon@gmail.com';
var password = '123456';
var space = 'inalambria';

console.log('Iniciando'.blue.bold);
async.auto({
  crearCuenta: (cb) => {
    request.post({
      url: `${url_core}/signup`,
      json: true,
      body: {
        name: space,
        email: email,
        password: password
      }
    }, (err, res, body) => {
      if (err) {
        return cb(err);
      }
      console.log('Cuenta Creada'.green);
      if (res.statusCode === 200) {
        return cb(null, body.token);
      }
      cb();
    });
  },
  token: ['crearCuenta', (results, cb) => {
    console.log('Login'.green);
    if (results.crearCuenta) {
      return cb(null, results.crearCuenta);
    } else {
      request.post({
        url: `${url_core}/login`,
        json: true,
        body: {
          email: email,
          password: password
        }
      }, (err, res, body) => {
        if (err) {
          return cb(err);
        }
        if (res.statusCode === 200) {
          return cb(null, body.token);
        } else {
          return cb('Contraseña Invalida'.red);
        }
      });
    }
  }],
  createSpace: ['token', (results, cb) => {
    console.log('Creando spaces'.green);
    request.post({
      url: `${url_core}/spaces`,
      headers: {
        'Authorization': `Bearer ${results.token}`
      },
      json: true,
      body: {
        name: space
      }
    }, (err, res, body) => {
      if (err) {
        return cb(err);
      }
      console.log(JSON.stringify(body));

      if (res.statusCode === 200) {
        return cb(null, body._id);
      } else {
        request.get({
          url: `${url_core}/spaces?name=${space}`,
          headers: {
            'Authorization': `Bearer ${results.token}`
          },
          json: true
        }, (err, res, body) => {
          if (err) {
            return cb(err);
          }
          if (res.statusCode === 200 && body.length) {
            return cb(null, body[0]._id);
          } else {
            return cb(`Imposible encontrar espacio ${space}`.red);
          }
        });
      }
    });
  }],
  states_machines: ['createSpace', (results, cb) => {
    let states_machines = [];
    //state_machine for a book reservations
    states_machines.push(require('./states_machines/reservations'));

    async.mapSeries(states_machines, (item, cb) => {
      async.auto({
        machine: (cb) => {
          console.log(`Creando la maquina de estados '${item.name}'`.green);
          console.log({
            name: item.name
          });
          request.post({
            url: `${url_core}/spaces/${results.createSpace}/states_machines`,
            headers: {
              'Authorization': `Bearer ${results.token}`
            },
            json: true,
            body: {
              name: item.name
            }
          }, (err, res, body) => {
            if (err) {
              return cb(err);
            }
            if (res.statusCode === 200) {
              console.log(body);
              return cb(null, body._id);
            } else {
              console.log(body);
              request.get({
                url: `${url_core}/spaces/${results.createSpace}/states_machines?name=${item.name}`,
                json: true,
                headers: {
                  'Authorization': `Bearer ${results.token}`
                }
              }, (err, res, body) => {
                if (err) {
                  return cb(err);
                }
                if (res.statusCode === 200 && body.length) {
                  return cb(null, body[0]._id);
                } else {
                  return cb(`Imposible encontrar modelo ${item.name} en ${space}`.red);
                }
              });
            }
          });

        },
        states: ['machine', (results_machine, cb) => {
          console.log('results_machine', results_machine.machine);
          console.log(`- Agregando propiedades a la maquina '${item.name}'`.green);
          request.put({
            url: `${url_core}/spaces/${results.createSpace}/states_machines/${results_machine.machine}`,
            headers: {
              'Authorization': `Bearer ${results.token}`
            },
            json: true,
            body: item
          }, (err, res, body) => {
            if (err) {
              return cb(err);
            }
            if (res.statusCode === 200) {
              return cb(null, body._id);
            } else {
              console.log(body);
              cb(body);
            }
          });
        }]
      }, (err, r) => {
        console.log(`Finalizado la máquina de estados '${item.name}'`.green);
        cb(err);
      });
    }, (err, r) => {
      console.log(`Finalizado todos los estados`.green);
      cb(err, 'ok');
    });
  }],
  modules: ['states_machines', (results, cb) => {
    let modules = [];

    modules.push(require('./models/books.json'));
    modules.push(require('./models/copies.json'));
    modules.push(require('./models/reservations.json'));
    modules.push(require('./models/users.json'));
    modules.push(require('./models/fcms.json'));

    async.eachSeries(modules, (item, cb) => {
      async.auto({
        table: (cb) => {
          console.log(`Creando la tabla '${item.name}'`.green);
          console.log({
            name: item.name,
            module_type: item.module_type
          });
          request.post({
            url: `${url_core}/spaces/${results.createSpace}/modules`,
            headers: {
              'Authorization': `Bearer ${results.token}`
            },
            json: true,
            body: {
              name: item.name,
              module_type: item.module_type
            }
          }, (err, res, body) => {
            if (err) {
              console.log(err);
              return cb(err);
            }
            if (res.statusCode === 200) {
              console.log(body);
              return cb(null, body._id);
            } else {
              console.log(body);
              request.get({
                url: `${url_core}/spaces/${results.createSpace}/modules?name=${item.name}`,
                json: true,
                headers: {
                  'Authorization': `Bearer ${results.token}`
                }
              }, (err, res, body) => {
                if (err) {
                  return cb(err);
                }
                if (res.statusCode === 200 && body.length) {
                  return cb(null, body[0]._id);
                } else {
                  return cb(`Imposible encontrar modelo ${item.name} en createSpace`.red);
                }
              });
            }
          });

        },
        fields: ['table', (results_table, cb) => {
          console.log('results_table.table', results_table.table);
          console.log(`- Agregando propiedades a la tabla '${item.name}'`.green);
          request.put({
            url: `${url_core}/spaces/${results.createSpace}/modules/${results_table.table}`,
            headers: {
              'Authorization': `Bearer ${results.token}`
            },
            json: true,
            body: item.fields
          }, (err, res, body) => {
            if (err) {
              return cb(err);
            }
            if (res.statusCode === 200) {
              return cb(null, body._id);
            } else {
              cb(body);
            }
          });
        }]
      }, (err, r) => {
        console.log(`Finalizado la tabla '${item.name}'`.green);
        cb(err);
      });
    }, (err, r) => {
      console.log(`Finalizado todos los módulos`.green);
      cb(err, 'ok');
    });

  }],
  cron: ['createSpace', (results, cb) => {
    request.get({
      url: `${url_core}/cron/modules`
    }, (err, res, body) => {
      if (err) {
        return cb(err);
      }
      if (res.statusCode === 200) {
        return cb(null, 'OK');
      } else {
        cb(err);
      }
    });
  }],
  apikey: ['createSpace', (results, cb) => {
    console.log('Creando ApiKey homedesk');
    request.post({
      url: `${url_core}/apikey/`,
      headers: {
        'Authorization': `Bearer ${results.token}`
      },
      json: true,
      body: {
        name: 'homedesk',
        space: space
      }
    }, (err, res, body) => {
      if (err) {
        return cb(err);
      } else if (res.statusCode === 200) {
        return cb(null, body);
      } else {
        request.get({
          url: `${url_core}/apikey/${results.createSpace}?name=homedesk`,
          headers: {
            'Authorization': `Bearer ${results.token}`
          }
        }, (err, res, body) => {
          if (err) {
            return cb(err);
          }
          if (res.statusCode === 200 && body.length) {
            return cb(null, body[0]);
          } else {
            return cb(`Imposible encontrar key homedesk en ${space}`.red);
          }
        });
      }
    });
  }],
  populate: ['cron', 'apikey', (results, cb) => {

    cb();
  }]
}, (err, results) => {
  console.log(results);
  if (err) {
    console.log(err.red);
  } else {
    console.log('Cambios actualizados'.rainbow.bold);
  }
});
