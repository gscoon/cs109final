var expert = new function (){
	this.start = function(){
		console.log('content script loaded');
		handleMessages();
	}

	function handleMessages(){
		chrome.extension.onMessage.addListener(function(msg, sender, sendResponse) {
			if (msg.action == 'show_menu') {
				showMenu();
			}
		});
	}


	function showMenu(){
		var menu = $('<div id="expert_menu"></div>');
		menu.hide();
		$('body').append(menu);
		menu.fadeIn(300);
	}
}

$(expert.start);
