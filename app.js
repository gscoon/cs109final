var PythonShell = require('python-shell');
var needle = require('needle');
var cheerio = require('cheerio');
var nlp = require("nlp_compromise"); // n-grams - https://github.com/spencermountain/nlp_compromise
var pos = require('pos'); // parts of speech    - https://github.com/dariusk/pos-js
var natural = require('natural'),
    TfIdf = natural.TfIdf,
    tfidf = new TfIdf();

var pyshell = new PythonShell('receive.py', {mode:'text'});
var tagger = new pos.Tagger();
var words = {pre:{}, post:{}, siteName: []};
var $ = null;

//http://www.wsj.com/articles/the-deals-that-made-daily-fantasy-take-off-1445043328
needle.get('http://superuser.com/questions/380633/use-divx-settings-to-encode-to-mp4-with-ffmpeg?rq=1', {follow:10}, function(error, response) {
    if (!error && response.statusCode == 200){
        $ = cheerio.load(response.body);

        // try to determine site title
        var re = /[\-\–\—\|]/;
        var titleSplit = $('title').text().split(re);
        var pageTitle = titleSplit[0].toLowerCase();
        if(titleSplit.length > 1)
            words.siteName = myTrim(titleSplit[titleSplit.length - 1].toLowerCase()).split(' ');


        // title - parts of speech
        var posTitle = new pos.Lexer().lex(pageTitle);

        words.pre.title = tagger.tag(posTitle);

        // h1 - parts of speech
        if($('h1').length > 0){
            var firstH1 = $('h1').eq(0).text();
            var posH1 = new pos.Lexer().lex(firstH1);
            words.pre.h1 = tagger.tag(posH1);
            //console.log('h1', taggedH1);
        }

        tfidf.addDocument(response.body);
        getKeyWords(response.body);
    }
    else
        console.log('keyword error', error);
});


function getKeyWords(html){
    pyshell.send(html);

    pyshell.on('message', function (message) {
        // received a message sent from the Python script (a simple "print" statement)
        words.pre.article = tagger.tag(JSON.parse(message));

        // loop through each word
        rankKeyWords();

    });

    // end the input stream and allow the process to exit
    pyshell.end(function (err) {
        if (err) throw err;
        console.log('pyshell end');
    });

}

function rankKeyWords(){
    var goodClass = ['NNS', 'NN', 'VBG', 'NNP', 'JJ', 'VB', 'VBZ'];
    var ignore = ['-', 'theres', '&#8211;', '–', '—', 'theyre'];

    // loop through each pre
    for(var section in words.pre){
        // section = title, h1, and article
        console.log(words.pre[section]);
        words.pre[section].forEach(function(v, ind){
            var word = v[0];
            var classif = v[1];

            // not site title
            // acceptable classification
            // not ignore word
            // more than a single character long

            if(words.siteName.indexOf(word) == -1 && goodClass.indexOf(classif) != -1 && ignore.indexOf(word) == -1 && word.length > 1){
                // get word measure in html
                tfidf.tfidfs(word, function(i, measure) {
                    var lowerWord = word.toLowerCase();
                    if(!(lowerWord in words.post)) // doesnt exist yet
                        words.post[lowerWord] = measure;
                    else
                        words.post[lowerWord] = words.post[lowerWord] * 1.25; // if in multiple "sections" increase by 25%
                });
            }

        });
    }
    console.log(words.post);
}

function myTrim(x) {
    return x.replace(/^\s+|\s+$/gm,'');
}

function keywordSort(a,b){
    return b - a;
}
