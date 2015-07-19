var WebSocket = require('ws');
var ws = new WebSocket('ws://go.laterooms.com:8887');

ws.on('open', function() {
    console.log('connected');
});

ws.on('message', function(message) {
    console.log('received: %s', message);
});
