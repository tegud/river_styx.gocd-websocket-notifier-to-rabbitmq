var WebSocket = require('ws');
var moment = require('moment');
var connectionRetryTimer;
var ws;
var url = 'ws://go.laterooms.com:8887';
var Amqp = require('./lib/amqp');
var logger = require('./lib/logger');

var rabbitConnection = new Amqp({
	host: 'localhost',
	exchange: 'river-styx'
});

var retries = 0;

function connectionAttempt() {
	var closing;
    logger.logInfo('Attempting to websocket connection.', { url: url });
	ws = new WebSocket(url);

	ws.on('open', function() {
		clearTimeout(connectionRetryTimer);
	    logger.logInfo('Connection Made.');

		retries = 0;
	});

	ws.on('close', function() {
		if(closing) {
			return;
		}

		closing = true;
	    logger.logInfo('Connection Dropped, exiting...');
		process.exit(1);
	});

	ws.on('error', function(err) {
		retries++;

		if(retries > 5) {
			logger.logInfo('Connection failed after 5 tries, shutting down');
			process.exit(1);
		}
		else {
			logger.logInfo('Connection Error, retrying (' + retries + ')...');
		}
	});

	ws.on('message', function(message) {
	    rabbitConnection.publish('pipelineResult', {
	    	'@timestamp': moment().format(),
	    	type: 'pipelineResult',
	    	origin: 'go.laterooms.com',
	    	result: JSON.parse(message)
	    });
	});

	connectionRetryTimer = setTimeout(connectionAttempt, 30000);
}

rabbitConnection.start().then(connectionAttempt)
