const moment = require('moment');

const logger = require('./logger');
const config = require('./config');
const events = require('./events');

function executeModuleHandler(handler, modules) {
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
    return new Promise((resolve, reject) => resolve(availableModules
        .reduce((allModules, modulePath) => {
            try {
                const loadedModule = require(modulePath);
            }
            catch(e) {
                logger.logError('Could not load module', { modulePath: modulePath, error: e });
                reject(`Could not load module ${modulePath}`);
            }
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

            allLoadedModules.push(typeof current.module === 'function' ? new current.module(current.config) : current.module);

            return allLoadedModules;
        }, [])));
}

function start() {
    events.on('message-in', message => events.emit('publish-message', {
        '@timestamp': moment().format(),
    	type: 'pipelineResult',
    	origin: message.source,
    	result: JSON.parse(message.data)
    }));

    return new Promise(resolve => resolve(logger.logInfo('Starting GOCD River Styx Websocket Bridge')));
}

module.exports = function() {
    const availableModules = ['./status-listener', './amqp-publisher', './go-websocket', './http-server']
    const defaultConfig = {
        "status-listener": { "module": "status-listener" },
        "http-server": { "module": "http-server", "port": 1234 }
    };

    return {
        start: () => start()
            .then(() => config.setDefault(defaultConfig))
            .then(() => config.load())
            .then(config => getModulesForConfiguration(availableModules, config))
            .then(executeModuleHandler.bind(undefined, 'start'))
            .then(() => new Promise(resolve => {
                logger.logInfo('Completed Start up');
            }))
            .catch(err => logger.logError('Start up failed', { error: err }))
    }
};
