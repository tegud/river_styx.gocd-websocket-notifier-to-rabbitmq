const moment = require('moment');

const logger = require('./logger');
const config = require('./config');
const events = require('./events');

function executeModuleHandler(modules, handler) {
    logger.logInfo(`Starting ${modules.length} module${modules.length === 1 ? '' : 's'}`);

    return Promise.all(modules.reduce((modulesWithHandlers, m) => {
        if(m[handler]) {
            modulesWithHandlers.push(m[handler]());
        }

        return modulesWithHandlers;
    }, []))
}

function getConfigForModule(modulePath, config) {
    const configSection = modulePath.includes('/') ? modulePath.substring(modulePath.lastIndexOf('/') + 1) : modulePath;

    return config[configSection];
}

function getModulesForConfiguration(availableModules, config) {
    return new Promise(resolve => resolve(availableModules
        .reduce((allModules, modulePath) => {
            return [
                ...allModules,
                ...getConfigForModule(modulePath, config)
                    .map(currentConfig => ({
                        module: require(modulePath),
                        config: currentConfig
                    }))
            ];
        }, [])
        .reduce((allLoadedModules, current) => {
            if(!current.config) {
                return allLoadedModules;
            }

            allLoadedModules.push(new current.module(current.config));

            return allLoadedModules;
        }, [])));
}

function start() {
    events.on('message-in', message => {
        const parsedData = JSON.parse(message.data);

        logger.logInfo('Message recieved from go');

        events.emit('publish-message', {
            '@timestamp': moment().format(),
	    	type: 'pipelineResult',
	    	origin: message.source,
	    	result: parsedData
        });
    });
    return new Promise(resolve => resolve(logger.logInfo('Starting GOCD River Styx Websocket Bridge')));
}

module.exports = function() {
    const availableModules = ['./amqp', './go-websocket', './http-server']
    return {
        start: () => start()
            .then(() => config.load())
            .then(config => getModulesForConfiguration(availableModules, config))
            .then(modules => executeModuleHandler(modules, 'start'))
            .then(() => new Promise(resolve => {
                logger.logInfo('Completed Start up');
            }))
            .catch(err => logger.logError('Start up failed', { error: err }))
    }
};
