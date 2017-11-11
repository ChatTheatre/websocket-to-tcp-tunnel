module.exports = (host, port) => {
    // Common logging object.
    let logger = new require('./Logger')();
    // Create connection to TCP socket.
    let socket = require('net').Socket();
    // Enable keep-alive.
    socket.setKeepAlive(true);

    // Should the TCP socket emit an error, handle it.
    socket.on('error', function (event) {
        logger.log('A tunnel threw an error: ' + event);
    });
    // Should the TCP socket become inaccessible, free it on this end.
    socket.on('close', function () {
        logger.log('A tunnel collapsed.');
        socket.destroy();
    });

    return {
        connect: (callback) => {
            socket.connect(port, host, callback);
        },
        receive: (callback) => {
            socket.on('data', callback);
        },
        send: (message) => {
            socket.write(message);
        },
        close: () => {
            socket.end();
        },
        socket: socket
    };
};
