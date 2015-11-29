var serverURL = 'http://dev:2222/'

//if icon is clicked
chrome.browserAction.onClicked.addListener(handleIconClick);

//example of using a message handler from the inject scripts
chrome.extension.onMessage.addListener(messageHandler);

function messageHandler(req, sender, sendResponse){
    if(req.action == 'get_experts'){
        getExperts(req, sendResponse);
        return true;
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
    console.log('icon clicked');
    chrome.tabs.sendMessage(tab.id, {action: 'show_menu'});
}
