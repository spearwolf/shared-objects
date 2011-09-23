var _ = require('./underscore'),

    // our lite in-memory database for shared objects
    sharedObjectsDb = {},
    metaObjectsDb = {};


function metaInfo(guid) {
    var meta = metaObjectsDb[guid];
    if (!meta) {
        meta = metaObjectsDb[guid] = {};
    }
    return meta;
}

exports.incRefCount = function(guid) {
    var meta = metaInfo(guid);
    ++meta.referenceCount;
    if (meta.destroyTimer) {
        clearTimeout(meta.destroyTimer);
        delete meta.destroyTimer;
    }
    console.log("increased reference count #"+guid+" -> "+meta.referenceCount);
};

function generateKey(guid, secret) {
    return guid + ":" + secret;
}

function _destroy(guid) {
    console.log("destroying orphaned SharedObject#"+guid);
    delete metaObjectsDb[guid];
    delete sharedObjectsDb[generateKey(guid, sharedObjectsDb[guid])];
    delete sharedObjectsDb[guid];
}

exports.decRefCount = function(guid) {
    var meta = metaInfo(guid);
    --meta.referenceCount;
    if (meta.referenceCount < 0) {
        meta.referenceCount = 0;
    }
    if (meta.referenceCount === 0) {
        if (!meta.destroyTimer) {
            meta.destroyTimer = setTimeout((function(_guid) { return function() { _destroy(_guid); }; })(guid), 6666);
        }
    }
    console.log("decreased reference count #"+guid+" -> "+meta.referenceCount);
    return meta.referenceCount;
};

function find(key) {
    return sharedObjectsDb[key];
}

function guid_exists(guid) {
    return sharedObjectsDb[guid];
}

function create(key, guid, type) {
    var now = new Date(),
        obj = sharedObjectsDb[key] = { 
            guid: guid,
            type: type||"shared_objects.ClientObject",
            createdAt: now,
            updatedAt: now
        };
    sharedObjectsDb[guid] = key;
    metaInfo(guid).referenceCount = 0;
    return obj;
}

exports.findOrCreate = function(guid, secret, type) {
    var obj_key = generateKey(guid, secret),
        obj = find(obj_key),
        state = 0;

    if (typeof obj !== 'object') {
        if (!guid_exists(guid)) {
            obj = create(obj_key, guid, type);
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
    return _.select(_.values(sharedObjectsDb), function(o) {
        return typeof o === 'object' && metaInfo(o.guid).referenceCount > 0;
    });
};

