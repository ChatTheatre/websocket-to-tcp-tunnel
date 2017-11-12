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
let webServer = new WebSocketServer({
    port: args.listen
});

// Handle any errors
webServer.on('error', error => {
    if (error.code = 'EADDRINUSE') {
        logger.log('Could not bind port ' + args.listen + ' for ' + args.name + ', already in use.');
    } else {
        logger.log(args.name + ' had an error: ' + error);
    }

    process.exit(1);
});

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

    // Handle closing of this end.
    client.on('close', () => {
        logger.log('WebSocket for ' + client.incoming_ip + ' closed. Ensuring TCP socket closed..');
        client.tunnel.close();
    });

    client.tunnel = require('./TcpSocket')(args.host, args.send);
    client.tunnel.socket.on('close', () => {
        logger.log('TCP socket for ' + client.incoming_ip + ' closed. Ensuring WebSocket closed.');
        client.close();
    });
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
            client.tunnel.send('TUNNELINFO ' + header + ':' + request.headers[header] + "\n");
        }
    }
});

// Regularly ping the connections.
logger.log('Starting heartbeat with ' + args.wsHeartbeat + ' second delay.');
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
}, args.wsHeartbeat * 1000);

// Start-up message.
logger.log(args.name + ' listening on port ' + args.listen);
