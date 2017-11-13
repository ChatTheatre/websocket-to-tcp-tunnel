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
let children = [];

process.on('SIGTERM', () => {
    logger.log('Main process going down via SIGTERM.');
    logger.log('Stopping all children.');
    children.forEach(function (monitor) {
        logger.log('Stopping ' + monitor.name + '.');
        monitor.stop();
    });
});

/**
 * Forever is a Node.js process deamonizer. This should prevent the need for
 * manual interaction when one of the relays is unexpectedly stopped.
 */
let forever = require('forever-monitor');

/**
 * Formats a string into an acceptable file name.
 *
 * @param string
 * @returns {string|XML|*|void}
 */
let instanceFileName = function (string) {
    return string.toLowerCase().replace(/\s/g, '_');
};

/**
 * Determines the directory in which to store PID files.
 *
 * @returns {string}
 */
let pidDirectory = function () {
    let directory = './';

    if (config.pidFileDirectory) {
        directory = config.pidFileDirectory.endsWith('/') ? config.pidFileDirectory : config.pidFileDirectory + '/';
    }

    return directory;
};

/**
 * Handles writing PID files.
 *
 * @param file
 * @param pid
 */
let writePidFile = function (file, pid) {
    require('fs').writeFileSync(pidDirectory() + file, pid);
};

/**
 * Handles removing PID files.
 *
 * @param file
 */
let removePidFile = function (file) {
    require('fs').unlinkSync(pidDirectory() + file);
};

/**
 * Binds necessary listeners to the child process.
 *
 * @param child
 * @param server
 * @returns {*}
 */
function bindChildListeners(child, server) {
    let pidFile = instanceFileName(server) + '.pid';

    child.on('watch:restart', event => {
        logger.log(server + ' listener restarted due to change in file ' + event.file);
    });

    child.on('start', event => {
        logger.log(server + ' started with PID ' + event.child.pid);
        writePidFile(pidFile, event.child.pid);
    });

    child.on('restart', event => {
        let logMessage = server + ' restarted, ' + child.times;
        if (config.maximumRetries) {
            logMessage += '/' + child.max;
        }
        logMessage += ' times now.';

        logger.log(logMessage);
        writePidFile(pidFile, event.child.pid);
    });

    child.on('exit', () => {
        logger.log(server + ' has exited permanently.');
        removePidFile(pidFile);
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
    let logDir = './logs/';
    if (config.logDirectory) {
        logDir = config.logDirectory.endsWith('/') ? config.logDirectory : config.logDirectory + '/';
    }

    let options = {
        args: [
            '--listen=' + listen,
            '--send=' + send,
            '--host=' + host,
            '--name=' + name,
            '--wsHeartbeat=' + (config.websocketHeartbeat || 15)
        ],
        sourceDir: 'src',
        killTree: false,
        append: true,
        watch: true,
        watchDirectory: './',
        logFile: logDir + 'relay.log',
        outFile: logDir + instanceFileName(name) + '.log',
        errorFile: logDir + instanceFileName(name) + '.error',
        killSignal: 'SIGTERM'
    };
    if (config.maximumRetries) {
        options.max = config.maximumRetries;
    }

    let child = new (forever.Monitor)('Relay.js', options);
    child.name = name;

    return child;
}

/**
 * Write the master PID file.
 */
writePidFile('tunnel.pid', process.pid);

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
        children.push(child);

        child.start();
    }
}
