/* shared-objects-clients.js
 * Created 2011-08-11 by wolfger@spearwolf.de
 */
window.SharedObjects = (function(){

    var E_NAMESPACE = "shared_objects/",
        socket = null,
        sessionId = null,
        shared_objects = null;

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
                    shared_objects = data;
                    _E.emit(E_NAMESPACE + "update", data);
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
                    _E.emit(E_NAMESPACE+"error", "could not send data to server", "No-Connection-To-Server");
                }
            });
        },

        Update: function(data) { _E.emit(E_NAMESPACE+"send", data); },

        Get: function() {
            if (sessionId) {
                for (var i = 0; i < shared_objects.shared_objects.length; i++) {
                    if (sessionId === shared_objects.shared_objects[i].sessionId) {
                        return shared_objects.shared_objects[i];
                    }
                }
            }
        }
    };
})();
