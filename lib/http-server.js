const logger = require('./logger');

module.exports = function() {
    return {
        start: () => new Promise(resolve => {
            logger.logInfo('HTTP Server module started.');
            resolve();
        }),
        stop: () => {}
    };
};
