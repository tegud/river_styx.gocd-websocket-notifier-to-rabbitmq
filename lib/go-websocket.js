const moment = require('moment');
const events = require('./events');
const WebSocketClient = require('websocket').client;

module.exports = function(config) {
    const logger = require('./logger').forModule(`GO-Websocket:${config.name}`);
    const client = new WebSocketClient();
    const retryEvery = config.retryInterval || 5000;

    let openConnection;
    let retryConnectionTimeout;
    let failedAttemptsSinceLastConnection = 0;

    function attemptConnection(client, url) {
        client.connect(url);
    }

    function retryConnection() {
        logger.logInfo(`Retrying connection in ${retryEvery}ms`)
        retryConnectionTimeout = setTimeout(openConnection, retryEvery);
    }

    client.on('connectFailed', error => {
        failedAttemptsSinceLastConnection++;

        logger.logError(`Failed to connect`, { error: error });

        events.emit('update-status', {
            name: config.name,
            module: config.module,
            status: 'critical',
            message: `Error connecting to Websocket: ${error}`,
            failures: failedAttemptsSinceLastConnection
        });

        retryConnection();
    });

    client.on('connect', connection => {
        failedAttemptsSinceLastConnection = 0;

        logger.logInfo('WebSocket Client Connected');

        events.emit('update-status', {
            name: config.name,
            module: config.module,
            status: 'ok',
            message: 'Connected to websocket'
        });

        connection.on('error', error => {
            logger.logError("Connection Error", { error: error });
        });

        connection.on('close', () => {
            logger.logInfo('Connection Closed');

            events.emit('update-status', {
                name: config.name,
                module: config.module,
                status: 'critical',
                message: 'Websocket connection lost'
            });

            retryConnection();
        });

        connection.on('message', message => {
            events.emit('message-in', {
                source: config.name,
                data: message.utf8Data
            });
        });
    });

    return {
        start: () => new Promise(resolve => {
            logger.logInfo('Websocket module started.', { host: config.host, port: config.port });
            const url = `ws://${config.host}:${config.port}`;

            (openConnection = attemptConnection.bind(undefined, client, url))();

            events.emit('register-status', {
                name: config.name,
                module: config.module,
                status: 'initialising',
                url: url
            });

            resolve();
        }),
        stop: () => {}
    };
};
