const amqp = require('amqp');
const events = require('./events');

function publishEvent(exchange, routingKey, message) {
	exchange.publish(routingKey, JSON.stringify(message));
}

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

			const connection = amqp.createConnection({ host: config.host });

			connection.on('error', function(err) {
				logger.logError('Failed to connect', { host: config.host, error: err });

				return reject(new Error('AMQP publisher could not connect to queue.'));
			});

			connection.on('ready', connectionReady.bind(undefined, connection));

			events.emit('publish-message', message => {
				exchange.publish(message.type, message);
			});

			resolve();
		})
	};
};
