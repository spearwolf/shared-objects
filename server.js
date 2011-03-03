var http = require('http'),
    path = require('path'),

    io = require('socket.io'),  // for npm, otherwise use require('./path/to/socket.io')
    paperboy = require('paperboy'),

    _ = require('./underscore'),
    SharedObjects = require('./shared-objects'),

    WEBROOT = path.join(path.dirname(__filename), 'www');

var server = http.createServer(function(req, res) {
    paperboy
        .deliver(WEBROOT, req, res)
        .addHeader('X-PaperRoute', 'Node');
});
server.listen(80);

// socket.io
var socket = io.listen(server);
socket.on('connection', function(client) {

    var co = SharedObjects.ClientObject.Create(client.sessionId, client);
    client.send(JSON.stringify({ hello: co }));
    SharedObjects.ClientObject.BroadcastAll();

    client.on('message', function(data) {
        var jsonData, clientHandle;
        try {
            jsonData = JSON.parse(data);

        } catch (jsonError) {
            //console.log("Invalid JSON: "+data);
            SharedObjects.SendException(client.sessionId, "Invalid JSON: "+data, jsonError);
        }
        try {
            SharedObjects.ClientObject.Update(client.sessionId, jsonData);
            SharedObjects.ClientObject.BroadcastAll();

        } catch (error) {
            //console.log("Error: "+error);
            SharedObjects.SendException(client.sessionId, "Error: "+error, error);
        }
    });

    client.on('disconnect', function() {
        SharedObjects.ClientObject.Destroy(client.sessionId);
        SharedObjects.ClientObject.BroadcastAll();
    });
});

