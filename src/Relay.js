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

let shutdown = (signal) => {
    signal = signal || 'signal';
    logger.log(args.name + ' process ending by ' + signal + '.');
    logger.log(args.name + ' sending warning to all clients.');
    webServer.clients.forEach(function (client) {
        if (args.shutdownDelay > 0) {
            client.send('!! The connection to the game server will be restarted in ' + args.shutdownDelay + ' seconds. ' +
                'This will temporarily disconnect you from the game. !!\n');
        } else {
            client.send('!! The connection to the game server is being restarted. You will momentarily be disconnected from the game. !!\n');
            client.tunnel.close();
            client.terminate();
        }
    });

    if (args.shutdownDelay > 0) {
        setTimeout(() => {
            webServer.clients.forEach(function (client) {
                client.send('!! Connection rebooting NOW. !!\n');
                client.tunnel.close();
                client.terminate();
            });
            logger.log(args.name + ' shut down.');
            process.exit(0);
        }, args.shutdownDelay * 1000);
    } else {
        logger.log(args.name + ' shut down.');
        process.exit(0);
    }
};

// Set up some signal handlers.
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

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

    if (args.tunnelInfo !== 'false') {
        logger.log('Sending tunnel information.');

        for (let header in request.headers) {
            if (request.headers.hasOwnProperty(header)) {
                client.tunnel.send('TUNNELINFO ' + header + ':' + request.headers[header] + "\n");
            }
        }
    } else {
        logger.log('Tunnel information not being sent for ' + args.name);
    }
});

if (args.wsHeartbeat > 0) {
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
}

// Start-up message.
logger.log(args.name + ' listening on port ' + args.listen);
