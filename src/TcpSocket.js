module.exports = (host, port) => {
    // Create connection to TCP socket.
    let socket = require('net').Socket();
    // Enable keep-alive.
    socket.setKeepAlive(true);

    // Should the TCP socket emit an error, handle it.
    socket.on('error', function () {
        console.log('Tunnel threw error.');
    });
    // Should the TCP socket become inaccessible, free it on this end.
    socket.on('close', function () {
        console.log('Tunnel collapsed.');
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
        socket: socket
    };
};
