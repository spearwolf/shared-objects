/* shared-objects-clients.js
 * Created 2011-08-11 by wolfger@spearwolf.de
 */
window.SharedObjects = (function(){

    var E_NAMESPACE = "shared_objects/",
        socket = null,
        current_shared_objects_raw_data = null,
        shared_objects = {},
        isConnected = false,
        nextPrototypeDomain = 0;

    // ========================================================================
    // http://note19.com/2007/05/27/javascript-guid-generator/  {{{
    function S4() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    }
    function create_guid() {
        return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    }
    // }}}
    // ========================================================================

    function saveGuid(guid, secret) {
        sessionStorage.setItem("guid", guid);
        sessionStorage.setItem("secret", secret);
    }

    function loadGuid() {
        var guid = sessionStorage.getItem("guid"),
            secret = sessionStorage.getItem("secret");
        if (typeof guid === 'string' && typeof secret === 'string') {
            console.log("(from sessionStorage) guid:", guid, "secret:", secret);
        } else {
            guid = create_guid();
            secret = create_guid();
            saveGuid(guid, secret);
            console.log("(new) guid:", guid, "secret:", secret);
        }
        return [guid, secret];
    }

    var guid_and_secret = loadGuid();

    var guid = guid_and_secret[0],
        guid_secret = guid_and_secret[1];
    
    function update_domain_objects(domain, data, actions) {
        var domain_objects = shared_objects[domain],
            instance = domain_objects[data.guid];

        if (!instance) {
            domain_objects[data.guid] = data;
            actions.push({ emit: E_NAMESPACE + domain + "new/" + data.guid, data: data });

        } else if (Date.parse(instance.updatedAt) !== Date.parse(data.updatedAt)) {
            domain_objects[data.guid] = data;
            actions.push({ emit: E_NAMESPACE + domain + "update/" + data.guid, data: data });
        }
    }

    function destroy_domain_objects(domain, data, actions) {
        var domain_objects = shared_objects[domain],
            id, found, so;

        for (id in domain_objects) {
            if (domain_objects.hasOwnProperty(id)) {
                found = false;
                for (i = 0; i < data.shared_objects.length; i++) {
                    if (id === data.shared_objects[i].guid) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    so = domain_objects[id];
                    delete domain_objects[id];
                    actions.push({ emit: E_NAMESPACE + domain + "delete/" + so.guid, data: so });
                }
            }
        }
    }

    function update_shared_objects(data) {
        current_shared_objects_raw_data = data;  // save for later usage

        var i, so, domain, actions = [];

        for (i = 0; i < data.shared_objects.length; i++) {
            so = data.shared_objects[i];
            so.createdAt = new Date(so.createdAt);
            so.updatedAt = new Date(so.updatedAt);

            for (domain = 0; domain < nextPrototypeDomain; domain++) {
                update_domain_objects(domain, so, actions);
            }
        }

        for (domain = 0; domain < nextPrototypeDomain; domain++) {
            destroy_domain_objects(domain, data, actions);
        }

        _E.emit(E_NAMESPACE + "data", data);

        for (i = 0; i < actions.length; i++) {
            _E.emit(actions[i].emit, actions[i].data);
        }
    }

    function init_domain(domain) {
        var i, actions;
        shared_objects[domain] = {};

        if (current_shared_objects_raw_data) {
            actions = [];
            for (i = 0; i < current_shared_objects_raw_data.shared_objects.length; i++) {
                update_domain_objects(domain, current_shared_objects_raw_data.shared_objects[i], actions);
            }
            destroy_domain_objects(domain, current_shared_objects_raw_data, actions);

            for (i = 0; i < actions.length; i++) {
                _E.emit(actions[i].emit, actions[i].data);
            }
        }
    }

    function SharedObj() {}

    return {
        IsConnected: function() { return isConnected; },

        Connect: function() {
            socket = io.connect(); 

            socket.on('disconnect', function() {
                isConnected = false;
                _E.emit(E_NAMESPACE + "disconnect");
            });

            socket.on("message", function(data) {
                if ("hello" in data) {
                    isConnected = true;
                    socket.send(JSON.stringify({ auth: { guid: guid, secret: guid_secret }}));
                    _E.emit(E_NAMESPACE + "connect", data.hello);
                } else if ("shared_objects" in data) {
                    update_shared_objects(data);
                } else if ("exception" in data) {
                    _E.emit(E_NAMESPACE + "error", data.exception.description, data.exception.exception);
                }
            });

            _E.on(E_NAMESPACE + "send", function(data) {
                if (socket) {
                    if (typeof data === 'string') {
                        socket.send(data);
                    } else {
                        socket.send(JSON.stringify({ update: data }));
                    }
                } else {
                    _E.emit(E_NAMESPACE + "error", "could not send data to server", "NoServerConnection");
                }
            });
        },

        Update: function(data) { _E.emit(E_NAMESPACE+"send", data); },

        RequestNewId: function() {
            guid = create_guid();
            guid_secret = create_guid();
            saveGuid(guid, guid_secret);
            console.log("(new id request) guid:", guid, "secret:", guid_secret);
            // TODO cleanup
            shared_objects = {};
            socket.send(JSON.stringify({ auth: { guid: guid, secret: guid_secret }}));
        },

        Get: function(_guid) {
            if (!_guid) {
                _guid = guid;
            }
            if (_guid) {
                for (var i = 0; i < current_shared_objects_raw_data.shared_objects.length; i++) {
                    if (_guid === current_shared_objects_raw_data.shared_objects[i].guid) {
                        return current_shared_objects_raw_data.shared_objects[i];
                    }
                }
            }
        },

        On: function(extension) {
            var domain = nextPrototypeDomain++,
                shared_objects_extended = {},

                e_mod = _E.Module(E_NAMESPACE, (function() {
                    var p = {};

                    p['on '+domain+'new ..'] = function(id, data) {
                        SharedObj.prototype = typeof extension === 'function' ? new extension(id, data) : extension;
                        var so = new SharedObj();
                        so.id = id;
                        so.data = data;
                        so.owner = id === guid;
                        shared_objects_extended[id] = so;
                        if (typeof so.create === 'function') {
                            so.create();
                        }
                    };

                    p['on '+domain+'update ..'] = function(id, data) {
                        var so = shared_objects_extended[id];
                        if (so) {
                            so.data = data;
                            if (typeof so.update === 'function') {
                                so.update();
                            }
                        }
                    };

                    p['on '+domain+'delete ..'] = function(id) {
                        var so = shared_objects_extended[id];
                        if (so) {
                            if (typeof so.destroy === 'function') {
                                so.destroy();
                            }
                            delete shared_objects_extended[id];
                        }
                    };

                    return p;
                })());

            init_domain(domain);
            return e_mod;
        }
    };
})();
