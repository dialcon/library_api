var credits_cards = {};
var alliances = {};
var users = {};
var costs_centers = {};

function getCreditsCards(_id) {
  if (credits_cards[_id]) {
    return credits_cards[_id];
  }
  return db['594157dcd5a84a7e8fc93627_miaguila_credits_cards'].findOne({
    _id: _id
  }, {
    number: 1
  });
}

function getAlliance(_id) {
  if (alliances[_id]) {
    return alliances[_id];
  }
  return db['594157dcd5a84a7e8fc93627_miaguila_alliances'].findOne({
    _id: _id
  }, {
    legal: 1
  });
}

function getCostCenter(_id) {
  if (costs_centers[_id]) {
    return costs_centers[_id];
  }
  return db['594157dcd5a84a7e8fc93627_miaguila_costs_centers'].findOne({
    _id: _id
  }, {
    name: 1
  });
}

function getUser(_id) {
  if (users[_id]) {
    return users[_id];
  }
  return db['594157dcd5a84a7e8fc93627_miaguila_users'].findOne({
    _id: _id
  }, {
    personal_info: 1
  });
}


db['594157dcd5a84a7e8fc93627_miaguila_trips'].find({
    alliance_id: {
      $in: [
        ObjectId('5942becc59a2340aa0ef9b5f'),
        ObjectId('5942bf9259a2340aa0ef9d28'),
        ObjectId('5953e8057d6e053cb5d92d22')
      ]
    },
    'price.user_total': {
      $gt: 0
    },
    //    cost_center_id: {
    //      $ne: null
    //    }
    //    cost_center_id: null
  })
  .forEach(function (trip) {
    var xt = {};
    xt._id = trip._id;
    xt.status = trip.status;
    xt.start = trip.start.started_date;
    if (xt.start == null) {
      xt.start = trip.start.date;
    }
    xt.end = trip.end.finished_date;
    xt.price = trip.price.user_total;

    alliances[trip.alliance_id] = getAlliance(trip.alliance_id);
    xt.alliance = alliances[trip.alliance_id].legal.name;

    if (trip.cost_center_id) {
      costs_centers[trip.cost_center_id] = getCostCenter(trip.cost_center_id);
      xt.cost_center_id = trip.cost_center_id;
      xt.cost_center = costs_centers[trip.cost_center_id].name;
    }

    users[trip.requester_id] = getUser(trip.requester_id);
    xt.requester_id = users[trip.requester_id]._id;
    xt.requester = users[trip.requester_id].personal_info.firstname + ' ' + users[trip.requester_id].personal_info.lastname;

    if (trip.passenger_id) {
      users[trip.passenger_id] = getUser(trip.passenger_id);
      xt.passenger = users[trip.passenger_id].personal_info.firstname + ' ' + users[trip.passenger_id].personal_info.lastname;
    } else {
      xt.passenger = trip.guest.name;
    }
    xt.tc = [];

    //buscar el cobro a la tc
    if (!trip.cost_center_id) {
      db['594157dcd5a84a7e8fc93627_miaguila_users_histories'].find({
        'trip_id': trip._id
      }, {
        value: 1
      }).forEach(function (uh) {
        var tc = {
          history_id: uh._id,
          value: uh.value,
          cc: []
        };
        //buscar el pago en tc,intenta buscar la transacción
        var xtc = db['594157dcd5a84a7e8fc93627_miaguila_payments_credits_cards'].find({
          'trips_due.history_id': uh._id
        }, {
          value: 1,
          status: 1,
          statuses: 1
        });

        /////////////////////////////////////////////////////////////////////////////////////////////
        if (xtc.length()) {
          var aoa = xtc.toArray();
          aoa.forEach(function (cc) {
            //pone la tc en la entrada
            if (cc.status == 'payed') {
              var ult = cc.statuses[cc.statuses.length - 1]
              if (ult.credit_card_id) {
                credits_cards[ult.credit_card_id] = getCreditsCards(ult.credit_card_id);
                cc.tc = credits_cards[ult.credit_card_id].number;
                cc.date = ult.date;
                cc.seguro = 'SI';
              }
            }
            delete cc.statuses;
            tc.cc.push(cc);
          });
        } else {
          db['594157dcd5a84a7e8fc93627_miaguila_payments_credits_cards'].find({
            user_id: xt.requester_id,
            trips_due: {
              $exists: false
            },
            value: tc.value * -1

          }, {
            value: 1,
            status: 1,
            statuses: 1
          }).forEach(function (cc) {
            //pone la tc en la entrada
            if (cc.status == 'payed') {
              var ult = cc.statuses[cc.statuses.length - 1]
              if (ult.credit_card_id) {
                credits_cards[ult.credit_card_id] = getCreditsCards(ult.credit_card_id);
                cc.tc = credits_cards[ult.credit_card_id].number;
                cc.date = ult.date;
                cc.seguro = 'NO';
              }
            }
            delete cc.statuses;
            tc.cc.push(cc);
          });
        }
        xt.tc.push(tc);
      });
    } else {
      db['594157dcd5a84a7e8fc93627_miaguila_costs_centers_histories'].find({
        'trip_id': trip._id
      }, {
        value: 1
      }).forEach(function (uh) {
        var tc = {
          history_id: uh._id,
          value: uh.value,
          cc: []
        };
        //buscar el pago en tc,intenta buscar la transacción
        var xtc = db['594157dcd5a84a7e8fc93627_miaguila_payments_credits_cards'].find({
          'trips_due.history_id': uh._id
        }, {
          value: 1,
          status: 1,
          statuses: 1
        });

        /////////////////////////////////////////////////////////////////////////////////////////////
        if (xtc.length()) {
          var aoa = xtc.toArray();
          aoa.forEach(function (cc) {
            //pone la tc en la entrada
            if (cc.status == 'payed') {
              var ult = cc.statuses[cc.statuses.length - 1]
              if (ult.credit_card_id) {
                credits_cards[ult.credit_card_id] = getCreditsCards(ult.credit_card_id);
                cc.tc = credits_cards[ult.credit_card_id].number;
                cc.date = ult.date;
                cc.seguro = 'SI';
              }
            }
            delete cc.statuses;
            tc.cc.push(cc);
          });
        } else {
          db['594157dcd5a84a7e8fc93627_miaguila_payments_credits_cards'].find({
            cost_center_id: xt.cost_center_id,
            trips_due: {
              $exists: false
            },
            value: tc.value * -1

          }, {
            value: 1,
            status: 1,
            statuses: 1
          }).forEach(function (cc) {
            //pone la tc en la entrada
            if (cc.status == 'payed') {
              var ult = cc.statuses[cc.statuses.length - 1]
              if (ult.credit_card_id) {
                credits_cards[ult.credit_card_id] = getCreditsCards(ult.credit_card_id);
                cc.tc = credits_cards[ult.credit_card_id].number;
                cc.date = ult.date;
                cc.seguro = 'NO';
              }
            }
            delete cc.statuses;
            tc.cc.push(cc);
          });
        }
        xt.tc.push(tc);
      });
    }
    printjson(xt);

  });
