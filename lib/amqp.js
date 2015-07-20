var Promise = require('bluebird');
var amqp = require('amqp');

function publishEvent(exchange, routingKey, message) {
	exchange.publish(routingKey, JSON.stringify(message));
}

module.exports = function(config) {
	var connection;
	var exchange;
	var connected;
	var publishEventCallback;

	function connectionReady(resolve, reject, connection) {
		if(connected) { 
			return;
		}

		connected = true;
		console.log('Connected to Rabbit MQ');

		exchange = connection.exchange(config.exchange, { type: 'fanout' }, exchangeReady.bind(undefined, resolve));
	}

	function exchangeReady(resolve, exchange) {
		console.log('Connected to Exchange');

		resolve();
	}

	function startUp(resolve, reject) {
		console.log('Creating AMQP publisher connection');

		var connection = amqp.createConnection({ host: config.host });

		connection.on('error', function(err) {
			console.log('Could not connect to: ' + config.host + ', error: ' + err);

			return reject(new Error('AMQP publisher could not connect to queue.'));
		});

		connection.on('ready', connectionReady.bind(undefined, resolve, reject, connection));

	}

	function start() {
		return new Promise(startUp);
	}
	
	return {
		start: start,
		publish: function(routingKey, data) {
			var message = JSON.stringify(data);

			exchange.publish(routingKey, message);
		}
	};
};
