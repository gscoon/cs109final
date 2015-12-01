var serverURL = 'http://dev:2222/'
var menuHTML = null;

//if icon is clicked
chrome.browserAction.onClicked.addListener(handleIconClick);

//example of using a message handler from the inject scripts
chrome.extension.onMessage.addListener(messageHandler);

function messageHandler(req, sender, sendResponse){
    if(req.action == 'get_experts'){
        getExperts(req, sendResponse);
        return true;
    }
    else if(req.action == 'get_menu'){
        sendResponse({menu: menuHTML});
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

function start(){
    log('Ext Loaded');
    getMenuHTMl();
}

function log(m){
    console.log(moment().format('YYYY-MM-DD hh:mm:ss') + ' ', m);
}

window.onload = start;
