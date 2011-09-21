var _ = require('./underscore'), clientDb = {};

var SharedObjectDb = (function() {  // {{{
    var sharedObjectDb = {};  // our lite in-memory database for shared objects

    function generateKey(guid, secret) {
        return guid + ":" + secret;
    }

    function find(key) {
        return sharedObjectDb[key];
    }

    function create(key, guid) {
        var now = new Date(),
            obj = sharedObjectDb[key] = { 
                guid: guid,
                createdAt: now,
                updatedAt: now
            };
        return obj;
    }

    return {
        findOrCreate: function(guid, secret) {
            var obj_key = generateKey(guid, secret),
                obj = find(obj_key);

            if (typeof obj !== 'object') {
                obj = create(obj_key, guid);
                console.log("created new SharedObject#" + guid);
            } else {
                console.log("found existing SharedObject#" + guid);
            }

            return obj;
        },

        listAll: function() {
            return _.values(sharedObjectDb);
        }
    };
})();
// }}}

function ClientConnectionCreate(sessionId, socket) {
    clientDb[sessionId] = { socket: socket };
}

function ClientConnectionUpdate(sessionId, properties) {
    var client = clientDb[sessionId],
        modified = false;

    console.log("ClientConnectionUpdate", sessionId, properties);

    if ("guid" in properties && "secret" in properties &&
            typeof properties.guid === 'string' && typeof properties.secret === 'string' &&
            properties.guid.length === 36 && properties.secret.length === 36) {

        client.clientObject = SharedObjectDb.findOrCreate(properties.guid, properties.secret);
        modified = true;
    }

    if (client.clientObject) {
        delete properties.guid;
        delete properties.secret;
        delete properties.createdAt;
        delete properties.updatedAt;

        if (_.values(properties).length !== 0) {
            client_object = client.clientObject;
            _.extend(client_object, properties);

            client_object.updatedAt = new Date();
            modified = true;
        }
    }

    return modified;
}

function ClientConnectionDestroy(sessionId) {
    delete clientDb[sessionId];
}

function ClientConnectionBroadcastAll() {
    var data = {
        shared_objects: SharedObjectDb.listAll()
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

exports.ClientConnection = {
    Create: ClientConnectionCreate,
    Update: ClientConnectionUpdate,
    Destroy: ClientConnectionDestroy,
    BroadcastAll: ClientConnectionBroadcastAll
};

exports.SendException = SendException;

