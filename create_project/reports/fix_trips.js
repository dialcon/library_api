var users = {};

function getUser(_id) {
  if (users[_id]) {
    return users[_id];
  }
  return db['594157dcd5a84a7e8fc93627_miaguila_users'].findOne({
    _id: _id
  }, {
    alliance_id: 1
  });
}

db['594157dcd5a84a7e8fc93627_miaguila_trips'].find({
    createdAt: {
      $gte: ISODate("2017-10-01T00:00:00.000-0500")
    }
  }, {
    passenger_id: 1,
    requester_id: 1,
    alliance_id: 1
  })
  .forEach(function(uh) {
    var user = null;
    if (uh.passenger_id == null) {
      user = uh.requester_id;
    } else {
      user = uh.passenger_id;
    }

    if (user) {
      users[uh.user_id] = getUser(user);
      uh.alliance_id = users[uh.user_id].alliance_id;

      db['594157dcd5a84a7e8fc93627_miaguila_trips'].update({
        _id: uh._id
      }, {
        $set: {
          alliance_id: uh.alliance_id
        }
      })
    }

    printjson(uh)

  });
