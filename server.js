var http = require('http'),
    io = require('socket.io'),  // for npm, otherwise use require('./path/to/socket.io')
    _ = require('./underscore'),
    SharedObjects = require('./shared-objects');

var server = http.createServer(function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('<h3>It works!</h3>');
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

