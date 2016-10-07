const events = require('./events');
const WebSocketClient = require('websocket').client;

module.exports = function(config) {
    const logger = require('./logger').forModule(`GO-Websocket:${config.name}`);
    const client = new WebSocketClient();
    const retryEvery = config.retryInterval || 5000;

    let openConnection;
    let retryConnectionTimeout;

    function attemptConnection(client, url) {
        client.connect(url);
    }

    function retryConnection() {
        logger.logInfo(`Retrying connection in ${retryEvery}ms`)
        retryConnectionTimeout = setTimeout(openConnection, retryEvery);
    }

    client.on('connectFailed', error => {
        logger.logError(`Failed to connect`, { error: error });
        retryConnection();
    });

    client.on('connect', connection => {
        logger.logInfo('WebSocket Client Connected');

        connection.on('error', error => {
            logger.logError("Connection Error", { error: error });
        });

        connection.on('close', () => {
            logger.logInfo('Connection Closed');
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

            (openConnection = attemptConnection.bind(undefined, client, `ws://${config.host}:${config.port}`))();

            resolve();
        }),
        stop: () => {}
    };
};
