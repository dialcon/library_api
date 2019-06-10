var id_users = [];
var id_costs_centers = [];
var id_tcs = [];

var users = {};
var costs_centers = {};
var credits_cards = {};

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

db['594157dcd5a84a7e8fc93627_miaguila_users'].find({
    alliance_id: {
      $in: [
        ObjectId('5942becc59a2340aa0ef9b5f'),
        ObjectId('5942bf9259a2340aa0ef9d28'),
        ObjectId('5953e8057d6e053cb5d92d22')
      ]
    }
  }, {
    _id: 1
  })
  .forEach(function (user) {
    id_users.push(user._id)

  });

db['594157dcd5a84a7e8fc93627_miaguila_credits_cards'].find({
    $or: [{
      alliance_father_id: {
        $in: [
          ObjectId('5942becc59a2340aa0ef9b5f'),
          ObjectId('5942bf9259a2340aa0ef9d28'),
          ObjectId('5953e8057d6e053cb5d92d22')
        ]
      }
    }, {
      user_id: {
        $in: id_users
      }
    }]
  }, {
    _id: 1
  })
  .forEach(function (tcs) {
    id_tcs.push(tcs)
  });



db['594157dcd5a84a7e8fc93627_miaguila_payments_credits_cards'].find({
    'statuses.credit_card_id': {
      $in: id_tcs
    },
    status: 'payed'
  }, {
    _id: 1
  })
  .forEach(function (cc) {
    var ult = cc.statuses[cc.statuses.length - 1]
    if (ult.credit_card_id) {
      credits_cards[ult.credit_card_id] = getCreditsCards(ult.credit_card_id);
      cc.tc = credits_cards[ult.credit_card_id].number;
      cc.date = ult.date;
      cc.seguro = 'SI';
    }
    delete cc.statuses;
    printjson(cc)
  });
