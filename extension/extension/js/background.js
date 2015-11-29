
//example of using a message handler from the inject scripts
chrome.extension.onMessage.addListener(
function(request, sender, sendResponse) {
    chrome.pageAction.show(sender.tab.id);
    sendResponse();
});


chrome.browserAction.onClicked.addListener(function(tab) {
    console.log('icon clicked');
    chrome.tabs.sendMessage(tab.id, {action: 'show_menu'});
    //tab.sendMessage({m:'message'});
});

function handleIconClick(){
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        chrome.tabs.sendMessage(tabs[0].id, {action: "open_dialog_box"}, function(response) {});
    });
}
