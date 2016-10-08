const fs = require('fs');
const logger = require('./logger').forModule('Configuration Loader');

let defaultConfig;

function overrideConfig(baseConfig, newConfig) {
    return Object.keys(newConfig).reduce((result, currentKey) => {
        if(!result[currentKey]) {
            result[currentKey] = newConfig[currentKey];
        }

        return result;
    }, baseConfig);
}

function loadFromDefaults() {
    return new Promise(resolve => resolve(defaultConfig || {}));
}

function loadFromFile(config) {
    return new Promise((resolve, reject) => {
        fs.readFile(`${__dirname}/../config.json`, 'utf-8', (err, data) => {
            if(err) {
                logger.logError('Could not load Configuration file', { error: err })
                return reject('Could not load Configuration file');
            }

            let loadedConfig;

            try {
                loadedConfig = JSON.parse(data);
            }
            catch(e) {
                logger.logError('Configuration file is not valid JSON', { error: err })
                return reject('Invalid Configuration JSON');
            }

            resolve(overrideConfig(config, loadedConfig));
        });
    });
}

function setFromEnvironmentVariables(config) {
    return new Promise(resolve => resolve(config));
}

function groupByModule(config) {
    return new Promise((resolve, reject) => resolve(Object.keys(config).reduce((groupedConfig, current) => {
        if(!groupedConfig[config[current].module]) {
            groupedConfig[config[current].module] = [];
        }

        config[current].name = current;
        groupedConfig[config[current].module].push(config[current]);

        return groupedConfig;
    }, {})));
}

module.exports = {
    setDefault: newDefaultConfig => defaultConfig = newDefaultConfig,
    load: () => loadFromDefaults()
        .then(loadFromFile)
        .then(setFromEnvironmentVariables)
        .then(groupByModule)
};
