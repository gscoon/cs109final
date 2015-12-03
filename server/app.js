var express = require('express');
var expressApp = express();
var bodyParser = require('body-parser');
var moment = require('moment');
var colors = require('colors');

app = {
    base: __dirname,
    experts: require('./inc/experts.js'),
    log: function(){
        var args = [];
        for (var i = 0; i < arguments.length; ++i) args[i] = arguments[i];
        var ts = colors.cyan(moment().format('YYYY-MM-DD HH:mm:ss'));
        args.unshift(ts);
        console.log.apply(console, args);
    }
}

expressApp.use(bodyParser.json({limit: '50mb'}));       // to support JSON-encoded bodies
expressApp.use(bodyParser.urlencoded({extended: true, limit: '50mb'}));  // to support URL-encoded bodies

expressApp.get('/:which([a-z_-]{1,30})', app.experts.handleRequest);
expressApp.post('/:which([a-z_-]{1,30})', app.experts.handleRequest);

//The 404 Route (ALWAYS Keep this as the last route)
expressApp.all('*', function(req, res){
    res.status(404).send('bad URL');
});

var server = expressApp.listen(2222, function () {
    var host = server.address().address;
    var port = server.address().port;

    app.log('App listening at http://', host, ':', port);
});
