let config = undefined;
let children = [];

/**
 * Forever is a Node.js process deamonizer. This should prevent the need for
 * manual interaction when one of the relays is unexpectedly stopped.
 */
let forever = require('forever-monitor');
/**
 * Common Logger object to format logs.
 */
let logger = new require('./src/Logger')();

/**
 * Read in server configurations from the configuration file.
 */
try {
    config = JSON.parse(require('fs').readFileSync('./config.json'));
} catch (error) {
    logger.error('Configuration file missing or improperly formatted.');
    process.exit(1);
}

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
    if (require('fs').existsSync(pidDirectory() + file)) {
        require('fs').unlinkSync(pidDirectory() + file);
    }
};

/**
 * Check if a process if running.
 *
 * Note: If user does not have permissions to signal a process will return FALSE.
 *
 * @param pid
 * @returns {boolean}
 */
let isProcessRunning = function (pid) {
    let running = false;
    try {
        running = process.kill(pid, 0);
    } catch (error) {
        running = error.code === 'EPERM';
    }

    return running;
};

if (require('fs').existsSync(pidDirectory() + 'tunnel.pid')) {
    let pid = Number(require('fs').readFileSync(pidDirectory() + 'tunnel.pid'));

    if (isProcessRunning(pid)) {
        logger.log('Tunnel already running with PID ' + pid);
        process.exit(0);
    }
}

process.on('SIGTERM', () => {
    logger.log('Main process going down via SIGTERM.');
    logger.log('Stopping all children.');
    children.forEach(function (monitor) {
        logger.log('Stopping ' + monitor.name + '.');
        monitor.stop();
    });
    removePidFile(pidDirectory() + 'tunnel.pid');
    logger.log('Relay service shut down.');
});

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

    child.on('error', error => {
        logger.log(server + ' threw an error: ' + error);
        logger.log('Setting maximum retries for ' + server + ' to 10.');
        child.max = 10;
    });

    child.on('stop', () => {
        logger.log(server + ' was stopped by user.');
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
 * @param tunnelInfo
 * @returns {*}
 */
function spawnChild(listen, send, host, name, tunnelInfo = true) {
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
            '--wsHeartbeat=' + config.websocketHeartbeat,
            '--shutdownDelay=' + config.shutdownDelay,
            '--tunnelInfo=' + tunnelInfo
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
writePidFile(pidDirectory() + 'tunnel.pid', process.pid);

/**
 * Stops a process with given signal or SIGKILL.
 *
 * @param pid
 * @param signal
 * @returns {*}
 */
let stopPreviousProcess = (pid, signal) => {
    signal = signal || 'SIGKILL';
    logger.log('Stopping process ' + pid + ' with ' + signal);
    return process.kill(pid, signal);
};

/**
 * Setup each relay defined in the configuration file.
 */
for (let server in config.servers) {
    if (config.servers.hasOwnProperty(server)) {
        let sendInfo = true;
        if (config.servers[server].sendTunnelInfo === false || config.servers[server].sendTunnelInfo === 'false') {
            sendInfo = false;
        }
        let child = spawnChild(
            config.servers[server].listen,
            config.servers[server].send,
            config.servers[server].host,
            config.servers[server].name,
            sendInfo
        );
        bindChildListeners(child, config.servers[server].name);
        children.push(child);

        let pidFile = pidDirectory() + instanceFileName(config.servers[server].name) + '.pid';
        if (require('fs').existsSync(pidFile)) {
            let pid = Number(require('fs').readFileSync(pidFile));

            if (isProcessRunning(pid)) {
                stopPreviousProcess(pid);
            }
        }

        child.start();
    }
}
