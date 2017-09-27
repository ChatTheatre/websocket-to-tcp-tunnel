/**
 * Configuration variables.
 */

var ports = {
    listen: 6001,
    send: 6730
};
var forward_url = 'tec.skotos.net';

/**
 * End Configuration
 */

/**
 * Begin tunnel code.
 */

var WebSocketServer = require('ws').Server;
var webServer = new WebSocketServer({
    port: ports.listen
});
// Listen to WebSocket
webServer.on('connection', function (server) {
    console.log('New server spawned.');

    // Create connection to game socket.
    var tunnel = require('net').Socket();
    tunnel.connect(ports.send, forward_url, function () {
        console.log('Opened tunnel to TEC.');
    });
    tunnel.on('data', function (data) {
        console.log('TEC sent ' + data);
        server.send(data);
    });
    tunnel.on('close', function () {
        console.log('Tunnel collapsed.');
        tunnel.destroy();
    });

    server.on('message', function (message) {
        console.log('Forwarding ' + message);
        tunnel.write(message);
    });
});
console.log('WebSockets listening on port ' + ports.listen);
