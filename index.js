var WebSocket = require('ws');
var moment = require('moment');
var connectionRetryTimer;
var ws;
var url = 'ws://go.laterooms.com:8887';
var Amqp = require('./lib/amqp');

var rabbitConnection = new Amqp({
	host: 'localhost',
	exchange: 'river-styx'
});

function connectionAttempt() {
    console.log('Attempting to websocket connection to: ' + url);
	ws = new WebSocket(url);

	ws.on('open', function() {
		clearTimeout(connectionRetryTimer);
	    console.log('Connection Made.');
	});

	ws.on('close', function() {
	    console.log('Connection Dropped, retrying...');
		connectionAttempt();
	});

	ws.on('message', function(message) {
	    console.log('received: %s', message);

	    rabbitConnection.publish('pipelineResult', {
	    	'@timestamp': moment().format(),
	    	type: 'pipelineResult',
	    	origin: 'go.laterooms.com',
	    	result: message
	    });
	});

	connectionRetryTimer = setTimeout(connectionAttempt, 30000);
}

rabbitConnection.start().then(connectionAttempt)
