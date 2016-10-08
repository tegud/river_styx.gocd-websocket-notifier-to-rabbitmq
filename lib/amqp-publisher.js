const amqp = require('amqp');
const events = require('./events');

module.exports = function(config) {
	const logger = require('./logger').forModule(`GO-Websocket:${config.name}`);

	let connection;
	let exchange;
	let connected;
	let publishEventCallback;

	function connectionReady(connection) {
		if(connected) {
			return;
		}

        events.emit('update-status', {
            name: config.name,
            module: config.module,
            status: 'ok'
        });
		connected = true;
		logger.logInfo('Connected to Rabbit MQ');

		exchange = connection.exchange(config.exchange, { type: 'fanout', durable: false, autoDelete: false }, exchangeReady);
	}

	function exchangeReady(exchange) {
		logger.logInfo('Connected to Exchange');
	}

	return {
		start: () => new Promise((resolve, reject) => {
			logger.logInfo('Initialising AMQP listener');

            events.emit('register-status', {
                name: config.name,
                module: config.module,
                status: 'initialising',
                host: config.host,
				exchange: config.exchange
            });

			const connection = amqp.createConnection({ host: config.host });

			connection.on('error', err => {
				logger.logError('Failed to connect', { host: config.host, error: err });

	            events.emit('update-status', {
	                name: config.name,
	                module: config.module,
	                status: 'critical',
					message: `Could not connect to AMQP: ${err}`
	            });

				return reject(new Error('AMQP publisher could not connect to queue.'));
			});

			connection.on('ready', connectionReady.bind(undefined, connection));

			events.on('publish-message', message => {
				exchange.publish(message.type, JSON.stringify(message));
			});

			resolve();
		})
	};
};
