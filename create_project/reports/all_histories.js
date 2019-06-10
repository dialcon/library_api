var id_users = [];
var id_costs_centers = [];
var users = {};
var costs_centers = {};

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


db['594157dcd5a84a7e8fc93627_miaguila_costs_centers'].find({
    alliance_father_id: {
      $in: [
        ObjectId('5942becc59a2340aa0ef9b5f'),
        ObjectId('5942bf9259a2340aa0ef9d28'),
        ObjectId('5953e8057d6e053cb5d92d22')
      ]
    }
  }, {
    _id: 1
  })
  .forEach(function (cost_center) {
    id_costs_centers.push(cost_center._id)

  });



db['594157dcd5a84a7e8fc93627_miaguila_costs_centers_histories'].find({
    cost_center_id: {
      $in: id_costs_centers
    }
  })
  .forEach(function (uh) {
    var uuhh = {
      fecha: uh.updatedAt,
      valor: uh.value,
      concepto: uh.concept,
      comentarios: uh.comments,
      'vuelo': uh.trip_id,
      user_id: uh.user_id,
      usuario: '',
      cost_center_id: uh.cost_center_id,
      'centro de costo': ''
    };

    if (uh.user_id) {
      users[uh.user_id] = getUser(uh.user_id);
      uuhh.usuario = users[uh.user_id].personal_info.firstname + ' ' + users[uh.user_id].personal_info.lastname;
    }

    if (uh.cost_center_id) {
      costs_centers[uh.cost_center_id] = getCostCenter(uh.cost_center_id);
      uuhh['centro de costo'] = costs_centers[uh.cost_center_id].name;
    }

    printjson(uuhh)

  });


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

db['594157dcd5a84a7e8fc93627_miaguila_users_histories'].find({
    user_id: {
      $in: id_users
    }
  })
  .forEach(function (uh) {
    var uuhh = {
      fecha: uh.updatedAt,
      valor: uh.value,
      concepto: uh.concept,
      comentarios: uh.comments,
      'vuelo': uh.trip_id,
      user_id: uh.user_id,
      usuario: ''
    };

    if (uh.user_id) {

      users[uh.user_id] = getUser(uh.user_id);
      uuhh.usuario = users[uh.user_id].personal_info.firstname + ' ' + users[uh.user_id].personal_info.lastname;


    }
    printjson(uuhh)

  });
