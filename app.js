var express = require('express');
var expressApp = express();

app = {
    scrape: require('./inc/scrape.js')
}

expressApp.get('/keywords', function (req, res) {
    app.scrape.getKeyWords(req.query.url, res);
    console.log('query: ', req.query.url);
});

//The 404 Route (ALWAYS Keep this as the last route)
expressApp.get('*', function(req, res){
  res.send('bad URL, homie', 404);
});

var server = expressApp.listen(2222, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('App listening at http://%s:%s', host, port);
});
