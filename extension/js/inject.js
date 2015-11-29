var expert = new function (){
	this.start = function(){
		console.log('content script loaded');
		handleBackgroundMessages();
	}


	function handleBackgroundMessages(){
		chrome.extension.onMessage.addListener(function(msg, sender, sendResponse) {
			if (msg.action == 'show_menu'){
				showMenu();
			}
		});
	}


	function showMenu(){
		var menu = $('<div id="expert_menu"></div>');
		menu.hide();
		$('body').append(menu);
		var html = $('html')[0].outerHTML;
		var reqObj = {action: "get_experts", data:{html: html}};
		chrome.runtime.sendMessage(reqObj, function(response) {
			if(typeof response == 'object'){
				response.ranked.forEach(function(item){
					menu.append('<div class="expert_keyword">'+item[0]+'</div>')
				});
			}
		});

		menu.fadeIn(300);
	}
}


expert.start();
