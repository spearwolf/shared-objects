var _ = require('./underscore'),
    clientObjects = {},  // our lite in-memory database for shared client objects
    clientObjectsGraveyard = [];

function ClientObject_create(sessionId, socket) {
    var now = new Date(),
        co = { sessionId: sessionId, updatedAt: now, createdAt: now };
    clientObjects[sessionId] = { clientObject: co, socket: socket, guid: false };
    return co;
}

function ClientObject_find(guid, secret) {
    return _.detect(_.values(clientObjects), function(client) {
        return guid === client.guid && secret === client.secret;
    });
}

function ClientObject_find_in_graveyard(guid, secret) {
    var i, client = null;
    for (i = 0; i < clientObjectsGraveyard.length; i++) {
        if (guid === clientObjectsGraveyard[i].guid && secret === clientObjectsGraveyard[i].secret) {
            client = clientObjectsGraveyard[i];
            clientObjectsGraveyard[i] = null;
            clientObjectsGraveyard = _.compact(clientObjectsGraveyard);
            break;
        }
    }
    return client;
}

function ClientObject_update(sessionId, properties) {
    var client = clientObjects[sessionId],
        client_object = null,
        zombie_client = null,
        read_only = false;

    // handle guid authentication
    if ("guid" in properties && "secret" in properties &&
            typeof properties.guid === 'string' && typeof properties.secret === 'string') {
        // client sends guid authentication
        if (client.guid === false) {
            // while current clientObject is empty
            zombie_client = ClientObject_find_in_graveyard(properties.guid, properties.secret);
            if (zombie_client) {
                // resurrect old clientObject from graveyard
                client.guid = zombie_client.guid;
                client.secret = zombie_client.secret;
                client.clientObject = zombie_client.clientObject;
            } else {
                var other_client_with_same_guid = ClientObject_find(properties.guid, properties.secret);
                if (other_client_with_same_guid) {
                    client.clientObject = other_client_with_same_guid.clientObject;
                }
                client.guid = properties.guid;
                client.secret = properties.secret;
            }
        // oops.. current clientObject has already an guid and secret
        // -- modifying guid and secret is not allowed
        } else if (typeof client.guid === 'string') {
            if (client.guid !== properties.guid || client.secret !== properties.secret) {
                read_only = true;
            }
        }
    }

    client_object = client.clientObject;
    if (!read_only) {
        _.extend(client_object, properties);
    }

    // set read-only attributes
    client_object.sessionId = sessionId;
    if (!read_only) {
        client_object.updatedAt = new Date();
    }
    if (client.guid) {
        client_object.guid = client.guid;
    }
    delete client_object.secret;  // never send secret back to clients!

    return client_object;
}

function ClientObject_destroy(sessionId) {
    var client = clientObjects[sessionId];
    if (client && client.guid) {
        client.socket = null;
        clientObjectsGraveyard.push(client);
    }
    delete clientObjects[sessionId];
}

function BroadcastClientObjects() {
    var data = {
        shared_objects: _.map(_.select(clientObjects, function(client) { return client.guid !== 'false'; }), function(client) {
            return client.clientObject;
        })
    };
    data.count = data.shared_objects.length;

    _.each(clientObjects, function(client) {
        client.socket.json.send(data);
    });
}

function SendException(sessionId, description, exception) {
    clientObjects[sessionId].socket.json.send({ exception: { description: description, exception: exception }});
}


/* Public API
 =========================================================================== */

exports.ClientObject = {
    Create: ClientObject_create,
    Get: function(sessionId) { return clientObjects[sessionId].clientObject; },
    Update: ClientObject_update,
    Destroy: ClientObject_destroy,
    BroadcastAll: BroadcastClientObjects
};

exports.ClientHandle = {
    Get: function(sessionId) { return clientObjects[sessionId]; }
};

exports.SendException = SendException;

