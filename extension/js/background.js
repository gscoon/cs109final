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
    console.log('experts request:', req);
    $.ajax(req).done(function(response){
        sendResponse(response);
    });
}


function handleIconClick(tab){
    console.log('icon clicked', tab.id);
    chrome.tabs.sendMessage(tab.id, {action: 'show_menu'});
}

function getMenuHTMl(){
    $.get(serverURL + 'menu', function(data){
        menuHTML = data;
    });
}

function start(){
    console.log('Ext Loaded');
    getMenuHTMl();
}

window.onload = start;
