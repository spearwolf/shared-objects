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

io.configure(function() {
    io.set('transports', ['websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']);
});

io.sockets.on('connection', function(client) {

    var sessionId = client.id;

    SharedObjects.Client.Create(sessionId, client);
    client.json.send({ hello: { sessionId: sessionId }});

    client.on('message', function(data) {
        var jsonData, clientHandle, broadcast;
        try {
            jsonData = JSON.parse(data);

        } catch (jsonError) {
            console.log("Invalid JSON("+jsonError+") -->", data);
        }
        try {
            SharedObjects.Dispatch(sessionId, jsonData);

        } catch (error) {
            console.log("Error: ", error);
        }
    });

    client.on('disconnect', function() {
        SharedObjects.Client.Destroy(sessionId);
    });
});

