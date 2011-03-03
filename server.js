var http = require('http'),
    io = require('socket.io'),  // for npm, otherwise use require('./path/to/socket.io')
    url = require("url"),  
    path = require("path"),  
    fs = require("fs"),
    _ = require('./underscore'),
    SharedObjects = require('./shared-objects');

var server = http.createServer(function(request, response) {
    var uri = url.parse(request.url).pathname;  
    var filename = path.join(process.cwd(), uri);  
    path.exists(filename, function(exists) {  
        if (!exists) {  
            response.writeHeader(404, {"Content-Type": "text/plain"});  
            response.write("404 Not Found\n");  
            response.close();  
            return;  
        }  
        fs.readFile(filename, "binary", function(err, file) {  
            if (err) {  
                response.writeHeader(500, {"Content-Type": "text/plain"});  
                response.write(err + "\n");  
                response.close();  
                return;  
            }  
            response.writeHeader(200);  
            response.write(file, "binary");  
            response.close();  
        });  
    });  
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

