var path = require('path');
var request = require('request');
var PythonShell = require('python-shell');
var jade = require('jade');
var needle = require('needle');
var cheerio = require('cheerio');
var async = require('async');
var nlp = require("nlp_compromise"); // n-grams - https://github.com/spencermountain/nlp_compromise
var pos = require('pos'); // parts of speech    - https://github.com/dariusk/pos-js
var natural = require('natural');
var TfIdf = natural.TfIdf


module.exports = new function(){

    var pyPath = path.resolve(__dirname);
    var pyOptions = {
        mode:'text',
        scriptPath: pyPath,
    };


    this.handleRequest = function(req, res){
        app.log('handleRequest', req.params.which);
        switch(req.params.which){
            case 'menu':
                returnMenu(res);
                break;
            case 'experts':
                getExperts(req, res);
                break;
            case 'keywords':
                scrapeKeywords(req, res);
                break;
            case 'keywords-batch':
                scrapeKeywordsBatch(req, res);
                break;
            default:
                res.status(404).send('bruh?');
        }
    }

    function getToken(callback){
        var data = {grant_type: "password", username: app.config.username, password: app.config.pw};
        var opt = {
            url: 'https://www.reddit.com/api/v1/access_token',
            headers: {'User-Agent': app.config.user_agent},
            formData: data,
            auth: {
                user: app.config.client_id,
                password: app.config.secret_id
            }
        }

        request.post(opt, function(err, res, body){
            if(err)
                callback({status:false, error: err})
            else{
                var b = JSON.parse(body);
                var auth =  b.token_type + ' ' + b.access_token;
                var token = {'Authorization': auth, 'User-Agent': app.config.user_agent};
                callback({status:true, token: token})
            }
        })
    }



    this.pullRedditData = function(keywords, callback){
        var ret = {status:false};
        getToken(function(tok){
            if(!tok.status) return callback({status:false, error: 'token error'})

            var token = tok.token;

            opt = {
                method: 'GET',
                url: "https://oauth.reddit.com/r/all/search?limit=10&type=link&t=mounth&sort=relevance&q=" + keywords.join(' '),
                headers: token
            }

            request.get(opt, function(err, res, body){
                if(err) return callback({status:false, error: err})
                callback({status:true, data: JSON.parse(body)})
            });
        });
    }



    function basicAuth(u, p){
        return "Basic " + new Buffer(u + ":" + p).toString("base64");
    }

    function returnMenu(res){
        var menuPath = path.resolve(app.base, 'views/experts-menu.jade');
        var menuHTML = jade.renderFile(menuPath, {});
        res.send(menuHTML);
    }

    //http://www.wsj.com/articles/the-deals-that-made-daily-fantasy-take-off-1445043328
    //needle.get('http://superuser.com/questions/380633/use-divx-settings-to-encode-to-mp4-with-ffmpeg?rq=1', {follow:10}, function(error, response) {
    function scrapeKeywords(req, res){
        var url = req.query.url;
        handleScrape(url, function(err, ret){
            res.send(ret);
        });
    }

    function scrapeKeywordsBatch(req, res){
        if(typeof req.body.url != 'object') return res.send(returnError('url array missing in POST request'));

        app.log('typeof url', typeof req.body.url, req.body.url.length, req.body.url[0]);

        var urlArray = req.body.url;
        var mapping = {};

        urlArray.forEach(function(u, i){
            mapping[u] = i;
        });

        // pull keywords asynchronously
        async.map(urlArray, handleScrape, function(err, results){
            app.log('map error', err);
            res.send({results:results, mapping:mapping});
        });
    }

    function handleScrape(url, callback){
        app.log('handleScrape', isURL(url));
        if(typeof(url) === 'undefined' || !isURL(url))
            return callback(null, returnError('Invalid URL.'));

        app.log('is url: ', isURL(url), url);

        needle.get(url, {follow:10}, function(error, response) {
            if(error || response.statusCode != 200)
                return callback(null, returnError('Site not found.'));
            handleKeywords(response.body, callback);
        });
    }

    function getExperts(req, res){
        if('body' in req && 'html' in req.body)
            handleKeywords(req.body.html, function(err, kwObj){
                var kw = kwObj.ranked.map(function(k){return k[0]});
                kw = kw.slice(0,2);
                app.process.pullRedditData(kw, function(ret){
                    if(!kwObj.status) return res.send({reddit: kwObj, keywords: kwObj});
                    var rd = [];
                    ret.data.data.children.forEach(function(c){
                        rd.push({score:c.data.score, user:c.data.author, url: c.data.url})
                        console.log(c.data.score, c.data.url);
                    })
                    return res.send({reddit: rd, keywords: kwObj});
                });

            });
        else
            res.send('include the html source code')
    }

    function handleKeywords(html, callback){
        var $ = cheerio.load(html);

        // store important keywords pre = just list of important words, post = keywords with ranking #
        var words = {pre:{}, post:{}, siteName: []};
        var tagger = new pos.Tagger();


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
        }

        // send html to pyton script and wait for a response
        var pyshell = new PythonShell('receive.py', pyOptions);
        pyshell.send(html);
        pyshell.on('message', function (message) {
            // received a message sent from the Python script (a simple "print" statement)
            words.pre.article = tagger.tag(JSON.parse(message));

            // loop through each word
            rankKeyWords(html, words);

            callback(null, {status: true, keywords: words.post, ranked: words.ranked});
        });

        // end the input stream and allow the process to exit
        pyshell.end(function (err) {
            //if (err) throw err;
            //console.log('pyshell end with error?', (err != false));
        });
    }

    function returnError(message){
        return {status:false, keywords:[], message: message};
    }


    function rankKeyWords(html, words){
        var tfidf = new TfIdf();
        tfidf.addDocument(html);
        var goodClass = ['NNS', 'NN', 'VBG', 'NNP', 'JJ', 'VB', 'VBZ'];
        var ignore = ['-', 'theres', '&#8211;', '–', '—', 'theyre'];

        // loop through each pre
        for(var section in words.pre){
            // section = title, h1, and article
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

        // create an array sorted based on rank
        var ranked = [];
        for(var k in words.post){
            var tuple = [k, words.post[k]];
            ranked.push(tuple)
        }
        ranked.sort(keywordSort);
        words.ranked = ranked;

    }

    function myTrim(x) {
        return x.replace(/^\s+|\s+$/gm,'');
    }

    function keywordSort(a,b){
        return b[1] - a[1];
    }

    function isURL(str) {
        var urlregex = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/
        return urlregex.test(str);
    }
}