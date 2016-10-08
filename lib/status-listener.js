const events = require('./events');
const logger = require('./logger').forModule('Status-Listener');

let applicationState = {};

function buildStatusKey(moduleType, name) {
    return `${moduleType}::${name}`
}

function buildStatus(currentStatus, newStatus) {
    if(!currentStatus) {
        return newStatus;
    }

    return newStatus;
}

module.exports = {
    start: () => new Promise(resolve => {
        logger.logInfo('Status Listener module started.');

        events.on('register-status', initialStatus => {
            const key = buildStatusKey(initialStatus.module, initialStatus.name);

            if(applicationState[key]) {
                return logger.logError(`Application with key ${key} already registered`);
            }

            applicationState[key] = buildStatus(null, initialStatus);
        });

        events.on('update-status', updatedStatus => {
            const key = buildStatusKey(updatedStatus.module, updatedStatus.name);

            if(!applicationState[key]) {
                return logger.logError(`Application with key ${key} not registered`);
            }

            applicationState[key] = buildStatus(applicationState[key], updatedStatus);
        });

        resolve();
    }),
    getCurrentStatus: () => new Promise(resolve => resolve({
        modules: Object.keys(applicationState).reduce((allModules, currentKey) => {
            allModules.push(applicationState[currentKey]);

            return allModules;
        }, [])
    }))
};
