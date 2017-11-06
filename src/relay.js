let args = require('minimist')(process.argv.slice(2));
console.log('Starting relay for ' + args.name + '.');
console.log("\ton port " + args.listen);
console.log("\tto " + args.host + ':' + args.send);

let WebSocketServer = require('ws').Server;
let webServer = undefined;
try {
    webServer = new WebSocketServer({
        port: args.listen
    });
} catch (exception) {
    if (exception instanceof Error) {
        console.log('Could not bind port ' + args.listen + ', already in use.');
    }
}

// Listen to WebSocket
webServer.on('connection', function (client) {
    console.log('Relaying new ' + args.name + ' client.');
    // Properly volley the ping-pong.
    client.isAlive = true;
    client.on('pong', function () {
        this.isAlive = true;
    });

    let tunnel = require('./TcpSocket')(args.host, args.send);
    tunnel.receive((message) => {
        if (client.readyState === client.OPEN) {
            client.send(message);
        }
    });
    tunnel.connect(() => {
        console.log('Opened tunnel to TEC.');
    });

    // When the WebSocket receives data relay it to the TCP tunnel.
    client.on('message', function (message) {
        tunnel.send(message);
    });
});

// Regularly ping the connections.
setInterval(() => {
    webServer.clients.forEach(function each(client) {
        if (client.isAlive === false) {
            console.log('Connection closed due to lack of heartbeat.');
            return client.terminate();
        }

        client.isAlive = false;
        client.ping('', false, true);
    });
}, 30000);

// Start-up message.
console.log(args.name + ' listening on port ' + args.listen);
