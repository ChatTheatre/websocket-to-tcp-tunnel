/**
 * Read in server configurations from the configuration file.
 */
let servers = JSON.parse(require('fs').readFileSync('./servers.json'));

/**
 * Forever is a Node.js process deamonizer. This should prevent the need for
 * manual interaction when one of the relays is unexpectedly stopped.
 */
let forever = require('forever-monitor');

/**
 * Binds necessary listeners to the child process.
 *
 * @param child
 * @param server
 * @returns {*}
 */
function bindChildListeners(child, server) {
    child.on('watch:restart', event => {
        console.log(server + ' listener restarted due to change in file ' + event.file);
    });

    child.on('start', event => {
        console.log(server + ' started with PID ', event.child.pid);
    });

    child.on('restart', () => {
        console.log(server + ' restarted, ' + child.times + ' times now.');
    });

    child.on('exit', () => {
        console.log(server + ' has exited permanently.');
    });

    return child;
}

/**
 * Spawns a new child of the Forever monitor.
 *
 * @param listen
 * @param send
 * @param host
 * @param name
 * @returns {*}
 */
function spawnChild(listen, send, host, name) {
    return new (forever.Monitor)('relay.js', {
        args: [
            '--listen=' + listen,
            '--send=' + send,
            '--host=' + host,
            '--name=' + name
        ],
        sourceDir: 'src'
    });
}

for (let server in servers) {
    if (servers.hasOwnProperty(server)) {
        let child = spawnChild(servers[server].listen, servers[server].send, servers[server].host, servers[server].name);
        bindChildListeners(child, servers[server].name);

        child.start();
    }
}
