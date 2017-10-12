/**
 * Configuration variables.
 */

// The port numbers to be used for the relay.
var ports = {
    listen: 6001, // The port the WebSocket is listening on.
    send: 6730    // The port on which to connect to the TCP socket.
};
// The URL on which the TCP socket is located.
var forward_url = 'tec.skotos.net';

/**
 * Begin tunnel code.
 */

var WebSocketServer = require('ws').Server;
var webServer = new WebSocketServer({
    port: ports.listen
});
// Listen to WebSocket
webServer.on('connection', function (server) {
    console.log('Starting relay for new client.');

    // Create connection to TCP socket.
    var tunnel = require('net').Socket();
    // Enable keep-alive.
    tunnel.setKeepAlive(true);

    tunnel.connect(ports.send, forward_url, function () {
        console.log('Opened tunnel to TEC.');
    });
    // Should the TCP socket emit an error, handle it.
    tunnel.on('error', function () {
        console.log('Tunnel threw error.');
        server.send('Error in relay. Please restart.');
    });
    // When the TCP socket receives new data relay it to the WebSocket.
    tunnel.on('data', function (data) {
        server.send(data);
    });
    // Should the TCP tunnel become inaccessible, free it on this end.
    tunnel.on('close', function () {
        console.log('Tunnel collapsed.');
        tunnel.destroy();
    });

    // When the WebSocket receives data relay it to the TCP tunnel.
    server.on('message', function (message) {
        tunnel.write(message);
    });
});
// Start-up message.
console.log('WebSockets listening on port ' + ports.listen);
