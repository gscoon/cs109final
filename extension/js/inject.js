var expert = new function (){

	var expertMenu = null;

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
		console.log('showMenu');

		if(expertMenu == null)
			chrome.runtime.sendMessage({action: 'get_menu'}, function(response) {
				expertMenu = $(response.menu);
				$('body').append(expertMenu);
				expertMenu.hide().fadeIn(300);
				doMenuWork();
			});
		else
			doMenuWork();

	}

	function doMenuWork(){
		expertMenu.find('#expert_menu_loader').show();
		expertMenu.find('#expert_menu_inner').hide();
		var html = $('html')[0].outerHTML;
		var reqObj = {action: "get_experts", data:{html: html}};
		chrome.runtime.sendMessage(reqObj, function(response) {
			expertMenu.find('#expert_menu_loader').hide();

			if(typeof response == 'object'){
				var kContainer = expertMenu.find('#expert_keyword_container');
				response.ranked.every(function(item, i, a){
					console.log(item, i);
					kContainer.append('<div class="expert_keyword">'+item[0]+'</div>');
					return (i < 5);
				});
			}
			expertMenu.find('#expert_menu_inner').fadeIn(300);
		});
	}

}


expert.start();
