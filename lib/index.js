const moment = require('moment');

const core = require('./core');

function start() {
    core.events.on('message-in', message => core.events.emit('publish-message', {
        '@timestamp': moment().format(),
    	type: 'pipelineResult',
    	origin: message.source,
    	result: JSON.parse(message.data)
    }));

    return new Promise(resolve => resolve(core.logging.logInfo('Starting GOCD River Styx Websocket Bridge')));
}

module.exports = function() {
    return {
        start: () => start()
            .then(() => core.logging.setLogger(require('./logger')))
            .then(() => core.config.setDefault({
                "http-server": { "port": 1234 }
            }))
            .then(() => core.use('rs-websocket', 'rs-amqp-publisher', 'rs-http-server'))
            .then(() => core.config.setMapToModules(config => new Promise(resolve => {
                const mappedConfig = {
                    'websocket': config['go-servers'].map(goServer => ({
                        module: 'websocket',
                        name: goServer.name,
                        host: goServer.host,
                        port: goServer.websocketPort
                    })),
                    'amqp-publisher': [{ module: "amqp-publisher", "name": "river_styx", host: config.river_styx.host, exchange: config.river_styx.exchange }],
                    'http-server': [
                        { module: 'http-server', port: config['http-server'].port }
                    ]
                };

                resolve(mappedConfig);
            })))
            .then(() => core.start())
            .then(() => new Promise(resolve => {
                core.logging.logInfo('Completed Start up');
            }))
            .catch(err => core.logging.logError('Start up failed', { error: err }))
    }
};
