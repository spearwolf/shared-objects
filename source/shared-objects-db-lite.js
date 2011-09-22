var _ = require('./underscore'),

    // our lite in-memory database for shared objects
    sharedObjectsDb = {};


function generateKey(guid, secret) {
    return guid + ":" + secret;
}

function find(key) {
    return sharedObjectsDb[key];
}

function guid_exists(guid) {
    return sharedObjectsDb[guid];
}

function create(key, guid) {
    var now = new Date(),
        obj = sharedObjectsDb[key] = { 
            guid: guid,
            createdAt: now,
            updatedAt: now
        };
    sharedObjectsDb[guid] = true;
    return obj;
}

exports.findOrCreate = function(guid, secret) {
    var obj_key = generateKey(guid, secret),
        obj = find(obj_key),
        state = 0;

    if (typeof obj !== 'object') {
        if (!guid_exists(guid)) {
            obj = create(obj_key, guid);
            state = 2;
            console.log("findOrCreate", "created new SharedObject#" + guid, obj);
        } else {
            obj = undefined;
            console.log("findOrCreate", "uups, found existing SharedObject#" + guid + " -- but secret is different!");
        }
    } else {
        state = 1;
        console.log("findOrCreate", "found existing SharedObject#" + guid);
    }

    return [obj, state];  // state can be 0:not-found 1:found 2:created
};

exports.listAll = function() {
    return _.select(_.values(sharedObjectsDb), function(o) { return typeof o === 'object'; });
};

