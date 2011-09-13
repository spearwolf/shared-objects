var _ = require('./underscore'),
    clientDb = {},
    sharedObjectDb = {};  // our lite in-memory database for shared objects

function ClientObject_create(sessionId, socket) {
    var now = new Date(),
        co = { sessionId: sessionId, updatedAt: now, createdAt: now };
    clientDb[sessionId] = { clientObject: co, socket: socket, guid: false };
    return co;
}

function ClientDataObject_findOrCreate(guid, secret) {
    var cdo_key = guid + ":" + secret,
        cdo = sharedObjectDb[cdo_key];

    if (typeof cdo !== 'object') {
        cdo = sharedObjectDb[cdo_key] = { 
            guid: guid,
            createdAt: new Date()
        };
        console.log("created new SharedObject#" + guid);
    } else {
        console.log("found existing SharedObject#" + guid);
    }

    return cdo;
}

function ClientObject_update(sessionId, properties) {
    var client = clientDb[sessionId],
        modified = false;

    console.log("ClientObject_update", sessionId, properties);

    if ("guid" in properties && "secret" in properties &&
            typeof properties.guid === 'string' && typeof properties.secret === 'string' &&
            properties.guid.length === 36 && properties.secret.length === 36) {

        client.clientObject = ClientDataObject_findOrCreate(properties.guid, properties.secret);
        client.guid = properties.guid;
        modified = true;
    }

    if (client.guid) {
        delete properties.guid;
        delete properties.secret;
        delete properties.createdAt;

        client_object = client.clientObject;
        _.extend(client_object, properties);

        client_object.updatedAt = new Date();
        modified = true;
    }

    return modified;
}

function ClientObject_destroy(sessionId) {
    delete clientDb[sessionId];
}

function BroadcastClientObjects() {
    var data = {
        //shared_objects: _.map(_.select(clientDb, function(client) { return client.guid !== false; }), function(client) {
            //return client.clientObject;
        //})
        shared_objects: _.values(sharedObjectDb)
    };
    data.count = data.shared_objects.length;

    _.each(clientDb, function(client) {
        client.socket.json.send(data);
    });
}

function SendException(sessionId, description, exception) {
    clientDb[sessionId].socket.json.send({ exception: { description: description, exception: exception }});
}


/* Public API
 =========================================================================== */

exports.ClientObject = {
    Create: ClientObject_create,
    Get: function(sessionId) { return clientDb[sessionId].clientObject; },
    Update: ClientObject_update,
    Destroy: ClientObject_destroy,
    BroadcastAll: BroadcastClientObjects
};

exports.ClientHandle = {
    Get: function(sessionId) { return clientDb[sessionId]; }
};

exports.SendException = SendException;

