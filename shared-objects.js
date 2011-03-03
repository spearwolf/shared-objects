var _ = require('./underscore'),
    clientObjects = {};  // our lite in-memory database for shared client objects

function ClientObject_create(sessionId, socket) {
    var co = { sessionId: sessionId };
    clientObjects[sessionId] = { clientObject: co, socket: socket };
    return co;
}

function ClientObject_update(sessionId, properties) {
    var co = clientObjects[sessionId].clientObject;
    _.extend(co, properties);
    return co;
}

function ClientObject_destroy(sessionId) {
    delete clientObjects[sessionId];
}

function BroadcastClientObjects() {
    var data = JSON.stringify({
        shared_objects: _.map(clientObjects, function(client) {
            return client.clientObject;
        })
    });
    _.each(clientObjects, function(client) {
        client.socket.send(data);
    });
}

function SendException(sessionId, description, exception) {
    clientObjects[sessionId].socket.send(JSON.stringify({ exception: { description: description, exception: exception }}));
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

