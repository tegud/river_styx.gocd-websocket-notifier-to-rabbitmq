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

function connectionAttempt() {
	var closing;
    logger.logInfo('Attempting to websocket connection.', { url: url });
	ws = new WebSocket(url);

	ws.on('open', function() {
		clearTimeout(connectionRetryTimer);
	    logger.logInfo('Connection Made.');
	});

	ws.on('close', function() {
		if(closing) {
			return;
		}

		closing = true;
	    logger.logInfo('Connection Dropped, retrying...');
		process.exit(1);
		connectionAttempt();
	});

	ws.on('error', function(err) {
	    logger.logInfo('Connection Error, retrying...', { error: JSON.stringify(err) });
		closing = true;
		ws.close();
		connectionAttempt();
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
