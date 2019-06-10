'use strict';

const controllers = require('./controllers');

module.exports = (app) => {
  //login
  app.post(`/v1/${process.env.SERVER_MODE_ENV}/login`, controllers.Users.login);
  app.get(`/v1/${process.env.SERVER_MODE_ENV}/users/me`, controllers.Auth.ensureAuthenticated, controllers.Users.me);
  app.put(`/v1/${process.env.SERVER_MODE_ENV}/users/me`, controllers.Auth.ensureAuthenticated, controllers.Users.setMe);

  //endpoints para la gestión de libros 
  app.get(`/v1/${process.env.SERVER_MODE_ENV}/books/:book_id([0-9a-fA-F]{24})`, controllers.Auth.ensureAuthenticated, controllers.Books.get);
  app.get(`/v1/${process.env.SERVER_MODE_ENV}/books`, controllers.Auth.ensureAuthenticated, controllers.Books.list);
  app.get(`/v1/${process.env.SERVER_MODE_ENV}/books/:count(count)`, controllers.Auth.ensureAuthenticated, controllers.Books.list);
  app.post(`/v1/${process.env.SERVER_MODE_ENV}/books`, controllers.Auth.ensureAuthenticated, controllers.Books.post);
  app.put(`/v1/${process.env.SERVER_MODE_ENV}/books/:book_id([0-9a-fA-F]{24})`, controllers.Auth.ensureAuthenticated, controllers.Books.put);

  //endpoints para la gestión de ejemplares (copias) de los libros
  app.get(`/v1/${process.env.SERVER_MODE_ENV}/copies/:copy_id([0-9a-fA-F]{24})`, controllers.Auth.ensureAuthenticated, controllers.Copies.get);
  app.get(`/v1/${process.env.SERVER_MODE_ENV}/copies`, controllers.Auth.ensureAuthenticated, controllers.Copies.list);
  app.get(`/v1/${process.env.SERVER_MODE_ENV}/copies/:count(count)`, controllers.Auth.ensureAuthenticated, controllers.Copies.list);
  app.post(`/v1/${process.env.SERVER_MODE_ENV}/copies`, controllers.Auth.ensureAuthenticated, controllers.Copies.post);
  app.put(`/v1/${process.env.SERVER_MODE_ENV}/copies/:copy_id([0-9a-fA-F]{24})`, controllers.Auth.ensureAuthenticated, controllers.Copies.put);
  //endpoints gestión de usuarios
  app.get(`/v1/${process.env.SERVER_MODE_ENV}/users/:user_id([0-9a-fA-F]{24})`, controllers.Auth.ensureAuthenticated, controllers.Users.get);
  app.get(`/v1/${process.env.SERVER_MODE_ENV}/users`, controllers.Auth.ensureAuthenticated, controllers.Users.list);
  app.get(`/v1/${process.env.SERVER_MODE_ENV}/users/:count(count)`, controllers.Auth.ensureAuthenticated, controllers.Users.list);
  app.post(`/v1/${process.env.SERVER_MODE_ENV}/users`, controllers.Auth.ensureAuthenticated, controllers.Users.post);
  app.put(`/v1/${process.env.SERVER_MODE_ENV}/users/:user_id([0-9a-fA-F]{24})`, controllers.Auth.ensureAuthenticated, controllers.Users.put);

  //cambios automáticos de los estados de las reservas
  app.get(`/v1/${process.env.SERVER_MODE_ENV}/cron/reservation-created-to-reserving`, controllers.Cron.createdToReserving);
  app.get(`/v1/${process.env.SERVER_MODE_ENV}/cron/reservation-reserved-to-started`, controllers.Cron.reservedToStarted);
  app.get(`/v1/${process.env.SERVER_MODE_ENV}/cron/reservation-started-to-finished`, controllers.Cron.startedToFinished);
  app.get(`/v1/${process.env.SERVER_MODE_ENV}/cron/reservation-finished-to-normalized`, controllers.Cron.finishedToNormalized);
  app.get(`/v1/${process.env.SERVER_MODE_ENV}/cron/reservation-finished-to-normalized`, controllers.Cron.finishedToNormalized);

  //endpoints reservas
};
