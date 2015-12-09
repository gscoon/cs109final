var express = require('express');
var expressApp = express();
var bodyParser = require('body-parser');

app = {
    base: __dirname,
    process: require('./inc/process.js'),
    log: require('./inc/log.js'),
    config: require('./inc/config.json')
}

expressApp.use(bodyParser.json({limit: '50mb'}));       // to support JSON-encoded bodies
expressApp.use(bodyParser.urlencoded({extended: true, limit: '50mb'}));  // to support URL-encoded bodies

expressApp.get('/:which([a-z_-]{1,30})', app.process.handleRequest);
expressApp.post('/:which([a-z_-]{1,30})', app.process.handleRequest);

//The 404 Route (ALWAYS Keep this as the last route)
expressApp.all('*', function(req, res){
    res.status(404).send('bad URL');
});

var server = expressApp.listen(2222, function () {
    var host = server.address().address;
    var port = server.address().port;
    
    app.log('App listening at http://', host, ':', port);
});
