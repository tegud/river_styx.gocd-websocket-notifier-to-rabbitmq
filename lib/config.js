const fs = require('fs');
const logger = require('./logger').forModule('Configuration Loader');

function loadFromFile() {
    return new Promise((resolve, reject) => {
        fs.readFile(`${__dirname}/../config.json`, 'utf-8', (err, data) => {
            if(err) {
                logger.logError('Could not load Configuration file', { error: err })
                return reject('Could not load Configuration file');
            }

            try {
                resolve(JSON.parse(data));
            }
            catch(e) {
                logger.logError('Configuration file is not valid JSON', { error: err })
                reject('Invalid Configuration JSON');
            }
        });
    });
}

function groupByModule(config) {
    return Object.keys(config).reduce((groupedConfig, current) => {
        if(!groupedConfig[config[current].module]) {
            groupedConfig[config[current].module] = [];
        }

        config[current].name = current;
        groupedConfig[config[current].module].push(config[current]);

        return groupedConfig;
    }, {});
}

module.exports = {
    load: () => loadFromFile()
        .then(config => groupByModule(config))
};
