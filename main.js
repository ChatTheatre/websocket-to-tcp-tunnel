/**
 * Common Logger object to format logs.
 */
let logger = new require('./src/Logger')();
/**
 * Read in server configurations from the configuration file.
 */
let config = undefined;
try {
    config = JSON.parse(require('fs').readFileSync('./config.json'));
} catch (error) {
    logger.error('Configuration file missing or improperly formatted.');
    process.exit(1);
}

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
        logger.log(server + ' listener restarted due to change in file ' + event.file);
    });

    child.on('start', event => {
        logger.log(server + ' started with PID ' + event.child.pid);
    });

    child.on('restart', () => {
        logger.log(server + ' restarted, ' + child.times + '/10 times now.');
    });

    child.on('exit', () => {
        logger.log(server + ' has exited permanently.');
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
    let instanceFileName = name.toLowerCase().replace(/\s/g, '_');
    let pidFile = config.pidFileDirectory.endsWith('/') ? config.pidFileDirectory : config.pidFileDirectory + '/';
    pidFile += instanceFileName + '.pid';
    let outFile = config.logDirectory.endsWith('/') ? config.logDirectory : config.logDirectory + '/';
    outFile += instanceFileName + '.log';
    let errorFile = config.logDirectory.endsWith('/') ? config.logDirectory : config.logDirectory + '/';
    errorFile += instanceFileName + '.error';
    logger.log(pidFile);

    return new (forever.Monitor)('Relay.js', {
        args: [
            '--listen=' + listen,
            '--send=' + send,
            '--host=' + host,
            '--name=' + name
        ],
        killTree: true,
        sourceDir: 'src',
        max: 10,
        pidFile: pidFile,
        watch: true,
        watchDirectory: './',
        outFile: outFile,
        errorFile: errorFile
    });
}

/**
 * Setup each relay defined in the configuration file.
 */
for (let server in config.servers) {
    if (config.servers.hasOwnProperty(server)) {
        let child = spawnChild(
            config.servers[server].listen,
            config.servers[server].send,
            config.servers[server].host,
            config.servers[server].name
        );
        bindChildListeners(child, config.servers[server].name);

        child.start();
    }
}
