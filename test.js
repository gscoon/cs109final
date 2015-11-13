var PythonShell = require('python-shell');
var needle = require('needle');
var cheerio = require('cheerio');
var nlp = require("nlp_compromise"); // n-grams - https://github.com/spencermountain/nlp_compromise
var glossary = require("glossary")({ verbose: true }); // keywords - https://github.com/harthur/glossary
var pos = require('pos'); // parts of speech    - https://github.com/dariusk/pos-js
var htmlToText = require('html-to-text');

var pyshell = new PythonShell('receive.py', {mode:'r'});

pyshell.send({html:'<html><body>chris columbus chris</body></html>'});

// end the input stream and allow the process to exit
pyshell.end(function (err) {
    if (err) throw err;
    console.log('finished');
});


pyshell.on('message', function (message) {
    // received a message sent from the Python script (a simple "print" statement)
    console.log(message);
    //message = message.replace("u'", "'");
    //var res = JSON.parse(message);
    //console.log(res);
});
