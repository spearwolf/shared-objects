var _ = require('./underscore'),
    SharedObjectsDb = require('./shared-objects-db-lite-min'),
    clientHandleDb = {};

// clientHandle helper {{{
// ============================================================================
function _setClientHandle(sessionId, client) {
    clientHandleDb[sessionId] = client;
}

function _getClientHandle(sessionId) {
    return clientHandleDb[sessionId];
}

function _destroyClientHandle(sessionId) {
    delete clientHandleDb[sessionId];
}
// ============================================================================
// }}}

function Create(sessionId, socket) {
    _setClientHandle(sessionId, { socket: socket });
}

function AuthenticateByGuid(sessionId, guid, secret) {
    console.log("AuthenticateByGuid", sessionId, guid, secret);

    var client = _getClientHandle(sessionId),
        found = SharedObjectsDb.findOrCreate(guid, secret);

    client.sharedObject = found[0];
    if (client.sharedObject) {
        SharedObjectsDb.incRefCount(client.sharedObject.guid);
    }

    return found[1];
}

function Update(sessionId, properties) {
    var client = _getClientHandle(sessionId),
        modified = false;

    console.log("Update", sessionId, properties);

    if (client.sharedObject) {
        delete properties.guid;
        delete properties.secret;
        delete properties.createdAt;
        delete properties.updatedAt;

        if (_.values(properties).length !== 0) {
            _.extend(client.sharedObject, properties);
            client.sharedObject.updatedAt = new Date();
            modified = true;
        }
    }

    return modified;
}

function Broadcast(sessionId, state) {
    if (state === 0) {
        return;
    }

    var data = {
        shared_objects: SharedObjectsDb.listAll()
    };
    data.count = data.shared_objects.length;

    if (state === 2) {
        _.each(clientHandleDb, function(client) {
            client.socket.json.send(data);
        });
    } else if (state === 1) {
        _getClientHandle(sessionId).socket.json.send(data);
    }
}

function Destroy(sessionId) {
    var client = _getClientHandle(sessionId),
        broadcast = false;

    if (client.sharedObject) {
        broadcast = 0 === SharedObjectsDb.decRefCount(client.sharedObject.guid);
    }

    _destroyClientHandle(sessionId);

    if (broadcast) {
        Broadcast(null, 2);
    }
}

function Dispatch(sessionId, data) {
    var broadcast = 0;

    if ("auth" in data) {
        if ("guid" in data.auth && "secret" in data.auth &&
                typeof data.auth.guid === 'string' && typeof data.auth.secret === 'string' &&
                data.auth.guid.length === 36 && data.auth.secret.length === 36) {
            broadcast = AuthenticateByGuid(sessionId, data.auth.guid, data.auth.secret);
        }
    } else if ("update" in data) {
        broadcast = Update(sessionId, data.update) ? 2 : 0;
    }

    Broadcast(sessionId, broadcast);
}


/* Public API
 =========================================================================== */

exports.Client = {
    Create: Create,
    Destroy: Destroy  //_destroyClientHandle
};

exports.Dispatch = Dispatch;
//exports.Broadcast = Broadcast;

