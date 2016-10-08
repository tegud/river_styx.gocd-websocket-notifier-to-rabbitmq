const logger = require('./logger');
const express = require('express');
const status = require('./status-listener');

module.exports = function(config) {
    const webserver = express();
    let httpServer;

    webserver.use((req, res, next) => {
        res.set({
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        });

        next();
    });

    webserver.get('/status', (req, res) => {
        status.getCurrentStatus().then(status => res.status(200).send(JSON.stringify(status, null, 4)));
    });

    return {
        start: () => new Promise((resolve, reject) => {
            logger.logInfo('HTTP Server module starting');

            httpServer = webserver.listen(config.port, (err) => {
                if(err) {
                    logger.logError(`Could not start HTTP Server`);
                    reject(err);
                }

                logger.logInfo(`HTTP Server started`, { port: config.port });

                resolve();
            });
        }),
        stop: () => {}
    };
};
