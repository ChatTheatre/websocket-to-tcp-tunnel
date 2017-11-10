/**
 * Common object for formatting logs.
 */
let logger = new require('./Logger')();
/**
 * Parses arguments a little easier.
 */
let args = require('minimist')(process.argv.slice(2));

logger.log('Starting relay for ' + args.name + '.');
logger.log("\ton port " + args.listen);
logger.log("\tto " + args.host + ':' + args.send);

let WebSocketServer = require('ws').Server;
let webServer = undefined;
try {
    webServer = new WebSocketServer({
        port: args.listen
    });
} catch (exception) {
    if (exception instanceof Error) {
        logger.log('Could not bind port ' + args.listen + ' for ' + args.name + ', already in use.');
    }
}

// Listen to WebSocket
webServer.on('connection', function (client, request) {
    client.incoming_ip = request.headers['x-forwarded-for'];
    logger.log('Relaying new ' + args.name + ' client.');
    logger.log("\t incoming IP address " + client.incoming_ip);

    // Properly volley the ping-pong.
    client.isAlive = true;
    client.on('pong', function () {
        this.isAlive = true;
    });

    client.tunnel = require('./TcpSocket')(args.host, args.send);
    client.tunnel.receive((message) => {
        if (client.readyState === client.OPEN) {
            client.send(message);
        } else {
            logger.error('Client for ' + client.incoming_ip + ' is no longer open. Closing tunnel.');
            client.tunnel.close();
        }
    });
    client.tunnel.connect(() => {
        logger.log('Opened tunnel to TEC for ' + client.incoming_ip + '.');
    });

    // When the WebSocket receives data relay it to the TCP tunnel.
    client.on('message', function (message) {
        client.tunnel.send(message);
    });

    for (let header in request.headers) {
        if (request.headers.hasOwnProperty(header)) {
            client.send('TUNNELINFO ' + header + ':' + request.headers[header]);
        }
    }
});

// Regularly ping the connections.
setInterval(() => {
    webServer.clients.forEach(function each(client) {
        if (client.isAlive === false) {
            logger.log('Connection for ' + client.incoming_ip + ' closed due to lack of heartbeat.');
            client.tunnel.close();
            return client.terminate();
        }

        client.isAlive = false;
        client.ping('', false, true);
    });
}, 30000);

// Start-up message.
logger.log(args.name + ' listening on port ' + args.listen);
