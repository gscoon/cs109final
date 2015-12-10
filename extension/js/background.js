var serverURL = 'http://107.170.13.109:2222/'
var menuHTML = null;

//if icon is clicked
chrome.browserAction.onClicked.addListener(handleIconClick);

//example of using a message handler from the inject scripts
chrome.extension.onMessage.addListener(messageHandler);

function start(){
    log('Ext Loaded');
    getMenuHTMl();
}

function messageHandler(req, sender, sendResponse){
    if(req.action == 'get_experts'){
        getExperts(req, sendResponse);
        return true;
    }
    else if(req.action == 'get_menu'){
        sendResponse({menu: menuHTML});
        return true;
    }
    else if(req.action == 'get_trends'){
        getTrendsData(req.keywords, sendResponse);
        return true;
    }
}

function getExperts(req, sendResponse){
    req.type = 'post';
    req.url = serverURL + 'experts';
    log('experts request', req);
    $.ajax(req).done(function(response){
        sendResponse(response);
    });
}


function handleIconClick(tab){
    log('Icon clicked');
    chrome.tabs.sendMessage(tab.id, {action: 'show_menu'});
}

function getMenuHTMl(){
    $.get(serverURL + 'menu', function(data){
        menuHTML = data;
    }).fail(function(){
        log('Server did not deliver menu. try again.');
        setTimeout(getMenuHTMl, 10000);
    });
}

function getTrendsData(keywords, sendResponse){
    console.log('getTrendsData');

    var terms = keywords.join(',');
    var url = 'http://www.google.com/trends/fetchComponent?q='+terms+'&cid=TIMESERIES_GRAPH_0&export=3';
    //var url = 'http://www.cnn.com/2015/12/09/politics/donald-trump-don-lemon-cnn-interview/index.html';
    console.log(url);
    $.get(url, function(body){
        console.log('body', body);
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
        console.log(data, ts);
        sendResponse({data: data, time: ts});
    }).fail(function(){
        log('Issue');
    });
}

function log(m){
    console.log(moment().format('YYYY-MM-DD HH:mm:ss') + ' ', m);
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


// First, checks if it isn't implemented yet.
if(!String.prototype.format){
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'? args[number] : match;
        });
    };
}

window.onload = start;
