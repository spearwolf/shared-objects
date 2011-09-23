/* shared-objects-clients.js
 * Created 2011-08-11 by wolfger@spearwolf.de
 */
window.SharedObjects = (function(){

    var COOKIE_GUID = "shared_objects_guid",
        COOKIE_SECRET = "shared_objects_secret";

    var E_NAMESPACE = "shared_objects/",
        socket = null,
        shared_objects_data = null,
        shared_objects = {},
        isConnected = false;

    // ========================================================================
    // http://www.quirksmode.org/js/cookies.html  {{{
    function createCookie(name,value,days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime()+(days*24*60*60*1000));
            expires = "; expires="+date.toGMTString();
        }
        document.cookie = name+"="+value+expires+"; path=/";
    }

    function readCookie(name) {
        var nameEQ = name + "=";
        var c, ca = document.cookie.split(';');
        for(var i=0;i < ca.length;i++) {
            c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
        }
        return null;
    }

    function eraseCookie(name) {
        createCookie(name,"",-1);
    }
    // }}}
    // ========================================================================

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

    var guid = readCookie(COOKIE_GUID),
        guid_secret = readCookie(COOKIE_SECRET);
    
    if (!guid) {
        guid = create_guid();
        createCookie(COOKIE_GUID, guid);
        guid_secret = create_guid();
        createCookie(COOKIE_SECRET, guid_secret);
        console.log("(new) guid:", guid, "secret:", guid_secret);
    } else {
        console.log("(from cookie) guid:", guid, "secret:", guid_secret);
    }

    function update_shared_objects(data) {
        //console.log("update_shared_objects", data);
        shared_objects_data = data;

        var i, so, current, actions = [];

        for (i = 0; i < data.shared_objects.length; i++) {
            so = data.shared_objects[i];
            so.createdAt = new Date(so.createdAt);
            so.updatedAt = new Date(so.updatedAt);

            current = shared_objects[so.guid];
            if (!current) {
                shared_objects[so.guid] = so;
                actions.push({ emit: E_NAMESPACE + "new/" + so.guid, data: so });
            } else if (Date.parse(current.updatedAt) !== Date.parse(so.updatedAt)) {
                shared_objects[so.guid] = so;
                actions.push({ emit: E_NAMESPACE + "update/" + so.guid, data: so });
            }
        }

        var id, found;
        for (id in shared_objects) {
            if (shared_objects.hasOwnProperty(id)) {
                found = false;
                for (i = 0; i < data.shared_objects.length; i++) {
                    if (id === data.shared_objects[i].guid) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    so = shared_objects[id];
                    delete shared_objects[id];
                    actions.push({ emit: E_NAMESPACE + "delete/" + so.guid, data: so });
                }
            }
        }

        _E.emit(E_NAMESPACE + "data", data);
        for (i = 0; i < actions.length; i++) {
            _E.emit(actions[i].emit, actions[i].data);
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
                        socket.send(JSON.stringify({ update: data }));
                    }
                } else {
                    _E.emit(E_NAMESPACE+"error", "could not send data to server", "NoneOpenConnectionToServer");
                }
            });
        },

        Update: function(data) { _E.emit(E_NAMESPACE+"send", data); },

        RequestNewId: function() {
            guid = create_guid();
            createCookie(COOKIE_GUID, guid);
            guid_secret = create_guid();
            createCookie(COOKIE_SECRET, guid_secret);
            console.log("(new id request) guid:", guid, "secret:", guid_secret);
            shared_objects = {};
            socket.send(JSON.stringify({ auth: { guid: guid, secret: guid_secret }}));
        },

        Get: function(_guid) {
            if (!_guid) {
                _guid = guid;
            }
            if (_guid) {
                for (var i = 0; i < shared_objects_data.shared_objects.length; i++) {
                    if (_guid === shared_objects_data.shared_objects[i].guid) {
                        return shared_objects_data.shared_objects[i];
                    }
                }
            }
        },

        On: function(extension) {
            var shared_objects_extended = {},
                e_mod = _E.Module(E_NAMESPACE, {

                'on new ..': function(id, data) {
                    SharedObj.prototype = typeof extension === 'function' ? new extension(id, data) : extension;
                    var so = new SharedObj();
                    so.id = id;
                    so.data = data;
                    so.owner = id === guid;
                    shared_objects_extended[id] = so;
                    if (typeof so.create === 'function') {
                        so.create();
                    }
                },

                'on update ..': function(id, data) {
                    //console.log("on upate ..", id, data);
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
            //if (shared_objects_data) {
                //update_shared_objects(shared_objects_data);
            //}
            return e_mod;
        }
    };
})();
