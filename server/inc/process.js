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
var fs = require('fs');

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
        if(!('body' in req) || !('html' in req.body))
            return res.send('include the html source code')

        handleKeywords(req.body.html, function(err, kwRet){
            var fullRet = {reddit: {status:false}, keywords: kwRet};
            if(!kwRet.status) return res.send(fullRet);

            // create a list of keywords
            var kw = kwRet.ranked.map(function(k){return k[0]});
            kw = kw.slice(0,3); // limit number keywords used in search

            async.parallel({
                trends: function(callback){
                    getTrendsData(kw, callback);
                    //callback(null, app.trends)  // using fake data
                },
                reddit: function(callback){
                    getRedditExperts(kw, callback);
                }
            }, function(err, results){
                fullRet.reddit = results.reddit;
                fullRet.trends = results.trends;

                return res.send(fullRet);
            });



        });
    }

    function getTrendsData(kw, callback){
        var terms = kw.join(',').replace(/[\'\’]/gi, "");
        var tURL = 'http://www.google.com/trends/fetchComponent?q={0}&cid=TIMESERIES_GRAPH_0&export=3'.format(terms);
        var opt = {url: tURL, Method: 'GET', headers: {'User-Agent': app.config.user_agent}}
        request(opt, function(err, res, body){
            if(res.statusCode != 200)
                return callback(null, {status:false, error:body, url: tURL});
            var regexp = /(\{\"c\".{1,90}\}\]\})/gi;
            body = body.replace(/new Date\(.{5,9}\)/ig,"0");
            var matches_array = body.match(regexp);
            var data = [];
            var ts = [];

            matches_array.forEach(function(m){
                if(!isJson(m)) return false;
                var dataLength = m.length - 1
                var m = JSON.parse(m);
                m.c.forEach(function(c, index){
                    if(index == 0)
                        ts.push(c.f);
                    else{
                        if(typeof data[index - 1] === 'undefined') data[index - 1] = [];
                        data[index - 1].push(c.v);
                    }
                })
            });
            var retObj = {data: data, labels: ts, kw: kw};

            callback(null, retObj);
        })
    }

    // get token
    // data request
    // get wanted items from data

    function getRedditExperts(keywords, callback){
        var token = null;
        async.waterfall([
            getRedditToken,
            function(tok, cb){token= tok.token; searchReddit(token, keywords, cb)},
            parseRedditPosts,
            function(postObj, cb){getRedditComments(token, postObj, cb)}
        ], function(err, results){
            callback(null, err?err:results)
        });
    }

    function getRedditToken(callback){
        app.log('getRedditToken');
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
                callback({status:false, error: err, detail:'token'});
            else{
                var b = JSON.parse(body);
                var auth =  b.token_type + ' ' + b.access_token;
                var token = {'Authorization': auth, 'User-Agent': app.config.user_agent};
                callback(null, {status:true, token: token})
            }
        })
    }

    var redditURL = 'https://oauth.reddit.com/r/';

    function searchReddit(token, keywords, callback){
        var searchLimit = 5;
        var t = 'month';
        var searchTerm = keywords.join(' ').replace(/[\'\’]/gi, "");

        app.log('searchReddit', searchTerm);
        var opt = {method: 'GET', url: redditURL + "all/search?limit=" + searchLimit + "&type=link&t=" + t + "&sort=relevance&q=" + searchTerm, headers: token}
        request.get(opt, function(err, res, body){
            if(err || res.statusCode != 200) return callback({status:false, error: (err)?err:res.statusCode, detail: 'reddit post pull'})
            callback(null, {status:true, posts: JSON.parse(body)})
        });
    }

    function parseRedditPosts(ret, callback){
        app.log('parseRedditPosts', ret.posts.data.children.length);
        var rd = [];
        var priority = 1;
        ret.posts.data.children.forEach(function(c){
            var post = c.data;
            post.priority = priority;
            rd.push(post);
            priority++;
        });
        rd = rd.slice(0,3); //limit number of experts
        callback(null, {data: rd, status:true});
    }

    function getRedditComments(token, postObj, callback){
        // async.map(urlArray, handleScrape, function(err, results){
        async.map(postObj.data, function(post, cb){
            var opt = {method: 'GET', url: redditURL + '{0}/comments/{1}/?depth=1'.format(post.subreddit, post.id), headers: token}
            app.log(opt.url);
            request.get(opt, function(err, res, body){
                console.log(res.statusCode, err);
                if(err || res.statusCode != 200) return cb(null);
                cb(null, {
                    priority: post.priority,
                    url: post.url,
                    permalink: post.permalink,
                    title: post.title,
                    comments:JSON.parse(body)
                });
            });
        },
        function(err, commentObj){ //all of the comments in commentobj
            parseRedditComments(commentObj, callback);
        });
    }

    function parseRedditComments(commentObj, callback){
        //redditURL
        var cp = [];
        // loop trough each comment group
        commentObj.forEach(function(post){
            //console.log('comment group', commentGroup);
            if(typeof post === 'undefined') return false;

            var theseComments = [];
            post.comments.forEach(function(cc){
                theseComments = theseComments.concat(cc.data.children.map(function(ccc){
                    ccc.data.priority = post.priority;
                    ccc.data.postTitle = post.title;
                    ccc.data.postURL = post.url;
                    ccc.data.permalink = post.permalink;
                    return ccc.data
                }));
            });
            cp.push(theseComments);

        });
        var comments = commentsSort(cp);
        callback(null, comments);
    }

    function commentsSort(cp){
        comments = [];
        cp.forEach(function(c){
            c.sort(function(a,b){
                if (a.score < b.score)
                    return 1;
                if (a.score > b.score)
                    return -1;
                return 0;
            });
            comments = comments.concat(c);
        });
        return comments;
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

    function isJson(str){
        try
        {
           var json = JSON.parse(str);
        }
        catch(e)
        {
           return false;
        }
        return true;
    }

}
