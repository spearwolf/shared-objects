var http = require('http'),
    path = require('path'),

    socket_io = require('socket.io'),  // for npm, otherwise use require('./path/to/socket.io')
    paperboy = require('paperboy'),

    _ = require('./underscore'),
    SharedObjects = require('./shared-objects-min'),

    WEBROOT = path.join(path.dirname(__filename), 'www');

var server = http.createServer(function(req, res) {
    paperboy
        .deliver(WEBROOT, req, res)
        .addHeader('X-PaperRoute', 'Node');
});

var listenPort = 80;
if (process.argv.length >= 4 && process.argv[2] === '-p') {
    listenPort = parseInt(process.argv[3], 10);
}
server.listen(listenPort);

// initialize socket.io server
//
var io = socket_io.listen(server);
io.sockets.on('connection', function(client) {

    var sessionId = client.id,
        co = SharedObjects.ClientObject.Create(sessionId, client);

    client.json.send({ hello: co });
    SharedObjects.ClientObject.BroadcastAll();

    client.on('message', function(data) {
        var jsonData, clientHandle;
        try {
            jsonData = JSON.parse(data);

        } catch (jsonError) {
            //console.log("Invalid JSON: "+data);
            SharedObjects.SendException(sessionId, "Invalid JSON: "+data, jsonError);
        }
        try {
            SharedObjects.ClientObject.Update(sessionId, jsonData);
            SharedObjects.ClientObject.BroadcastAll();

        } catch (error) {
            //console.log("Error: "+error);
            SharedObjects.SendException(sessionId, "Error: "+error, error);
        }
    });

    client.on('disconnect', function() {
        SharedObjects.ClientObject.Destroy(sessionId);
        SharedObjects.ClientObject.BroadcastAll();
    });
});

