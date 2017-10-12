/**
 * Configuration variables.
 */
let ports = {
    listen: 6001, // The port the WebSocket is listening on.
    send: 6730    // The port on which to connect to the TCP socket.
};
// The URL on which the TCP socket is located.
let forward_url = 'tec.skotos.net';

let WebSocketServer = require('ws').Server;
let webServer = new WebSocketServer({
    port: ports.listen
});

// Listen to WebSocket
webServer.on('connection', function (server) {
    console.log('Starting relay for new client.');

    let tunnel = require('./src/TcpSocket')(forward_url, ports.send);
    tunnel.receive((message) => {
        server.send(message);
    });
    tunnel.connect(() => {
        console.log('Opened tunnel to TEC.');
    });

    // When the WebSocket receives data relay it to the TCP tunnel.
    server.on('message', function (message) {
        tunnel.send(message);
    });
});
// Start-up message.
console.log('WebSockets listening on port ' + ports.listen);
