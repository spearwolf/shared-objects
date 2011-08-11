/* shared-objects-clients.js
 * Created 2011-08-11 by wolfger@spearwolf.de
 */
window.SharedObjects = (function(){

    var E_NAMESPACE = "shared_objects/",
        socket = null;

    return {
        Connect: function() {
            socket = io.connect(); 

            socket.on('disconnect', function() { _E.emit(E_NAMESPACE + "disconnect"); });

            socket.on("message", function(data) {
                if ("hello" in data) {
                    _E.emit(E_NAMESPACE + "connect", data.hello);
                } else if ("count" in data) {
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
                        socket.json.send(data);
                    }
                }
            });
        }
    };
})();
