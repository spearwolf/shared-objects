/* shared-objects-clients.js
 * Created 2011-08-11 by wolfger@spearwolf.de
 */
window.SharedObjects = (function(){

    var E_NAMESPACE = "shared_objects/",
        socket = null,
        sessionId = null,
        shared_objects_data = null,
        shared_objects = {};

    function update_shared_objects(data) {
        shared_objects_data = data;

        var i, so, current, actions = [];

        for (i = 0; i < data.shared_objects.length; i++) {
            so = data.shared_objects[i];
            current = shared_objects[so.sessionId];
            if (!current) {
                shared_objects[so.sessionId] = so;
                actions.push({ emit: E_NAMESPACE + "new/" + so.sessionId, data: so });
            } else if (current.updatedAt !== so.updatedAt) {
                shared_objects[so.sessionId] = so;
                actions.push({ emit: E_NAMESPACE + "update/" + so.sessionId, data: so });
            }
        }

        var sid, found;
        for (sid in shared_objects) {
            if (shared_objects.hasOwnProperty(sid)) {
                found = false;
                for (i = 0; i < data.shared_objects.length; i++) {
                    if (sid === data.shared_objects[i].sessionId) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    so = shared_objects[sid];
                    delete shared_objects[sid];
                    actions.push({ emit: E_NAMESPACE + "delete/" + so.sessionId, data: so });
                }
            }
        }

        _E.emit(E_NAMESPACE + "data", data);
        for (i = 0; i < actions.length; i++) {
            _E.emit(actions[i].emit, actions[i].data);
        }
    }

    return {
        Connect: function() {
            socket = io.connect(); 

            socket.on('disconnect', function() {
                sessionId = null;
                _E.emit(E_NAMESPACE + "disconnect");
            });

            socket.on("message", function(data) {
                if ("hello" in data) {
                    sessionId = data.hello.sessionId;
                    _E.emit(E_NAMESPACE + "connect", data.hello);
                } else if ("count" in data) {
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
                        socket.send(JSON.stringify(data));
                    }
                } else {
                    _E.emit(E_NAMESPACE+"error", "could not send data to server", "NoneOpenConnectionToServer");
                }
            });
        },

        Update: function(data) { _E.emit(E_NAMESPACE+"send", data); },

        Get: function(sessionId_) {
            if (!sessionId_) {
                sessionId_ = sessionId;
            }
            if (sessionId_) {
                for (var i = 0; i < shared_objects_data.shared_objects.length; i++) {
                    if (sessionId_ == shared_objects_data.shared_objects[i].sessionId) {
                        return shared_objects_data.shared_objects[i];
                    }
                }
            }
        },

        On: function(extension) {
            var shared_objects_extended = {};
            return _E.Module(E_NAMESPACE, {

                'on new ..': function(id, data) {
                    function SharedObj() {}
                    SharedObj.prototype = typeof extension === 'function' ? new extension(id, data) : extension;
                    var so = new SharedObj();
                    so.data = data;
                    shared_objects_extended[id] = so;
                    if (typeof so.create === 'function') {
                        so.create();
                    }
                },

                'on update ..': function(id, data) {
                    var so = shared_objects_extended[id];
                    if (so) {
                        so.data = data;
                        if (typeof so.update === 'function') {
                            so.update();
                        }
                    }
                },

                'on delete ..': function(id) {
                    var so = shared_objects_extended[id];
                    if (so) {
                        if (typeof so.destroy === 'function') {
                            so.destroy();
                        }
                        delete shared_objects_extended[id];
                    }
                }
            });
        }
    };
})();
