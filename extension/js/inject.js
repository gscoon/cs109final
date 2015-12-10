var expert = new function (){

	var expertMenu = null;

	this.start = function(){
		log('content script loaded');
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
		log('showMenu');

		if(expertMenu == null)
			chrome.runtime.sendMessage({action: 'get_menu'}, function(response) {
				expertMenu = $(response.menu);
				$('body').append(expertMenu);

				$('#expert_menu_x').on('click', function(){
					expertMenu.fadeOut(300);
				});

				doMenuWork();
			});
		else
			doMenuWork();

	}

	function doMenuWork(){
		expertMenu.hide().fadeIn(300);
		expertMenu.find('#expert_menu_loader').show();
		expertMenu.find('#expert_menu_inner').hide();
		var html = $('html')[0].outerHTML;
		var reqObj = {action: "get_experts", data:{html: html}};
		chrome.runtime.sendMessage(reqObj, function(response) {
			log(response);
			expertMenu.find('#expert_menu_loader').hide();

			if(typeof response == 'object'){
				if('trends' in response && 'data' in response.trends)
					setTrends(response.trends);

				var kContainer = expertMenu.find('#expert_keyword_container_inner');
				kContainer.html('');

				var kw = []
				response.keywords.ranked.every(function(item, i, a){
					kw.push(item[0]);
					kContainer.append('<div class="expert_keyword">'+item[0]+'</div>');
					return (i < 5);
				});


				if('reddit' in response && Array.isArray(response.reddit)){
					var redditURL = 'https://www.reddit.com';
					var rContainer = expertMenu.find('#expert_reddit_container_inner');
					rContainer.html('');

					// loop through reddit experts
					response.reddit.every(function(ritem, i, a){
						rContainer.append('<div class="expert_reddit_row">');
						rContainer.append('<div class="expert_reddit_user"><a class="expert_reddit_user_a" target="_blank" href="https://www.reddit.com/user/'+ritem.author+'">' + ritem.author + '</a></div>');
						rContainer.append('<div class="expert_reddit_title"><a class="expert_reddit_title_a" target="_blank" href="' + redditURL + ritem.permalink + '">' + ritem.postTitle + '</a></div>');
						if(typeof ritem.body == 'string') rContainer.append('<div class="expert_reddit_comment">' + ritem.body + '</div>');
						rContainer.append('</div">');
						return (i < 5);
					});
				}

			}
			expertMenu.find('#expert_menu_inner').fadeIn(300);
		});
	}

	function setTrends(trendObj){
		log('getTrends');

		var trendData = [];

		trendObj.data.forEach(function(t, i){
			var td = {
				name: trendObj.kw[i],
				data: t
			};
			trendData.push(td);
		})

		var chart = new Highcharts.Chart({
			chart: {
		        renderTo: 'expert_trend_chart',
				marginTop: 40,
				marginBottom: 60
		    },
			title: {
	            text: 'Trending Data',
	            x: 0 //center,

	        },
		    xAxis: {
		        categories: trendObj.labels,
		        min: 12
		    },

		    legend: {
		        verticalAlign: 'top',
		        y: 50,
		        align: 'right'
		    },

		    scrollbar: {
		        enabled: true
		    },
		    series: trendData
		});

	}

	function log(m){
		var args = [];
	    for (var i = 0; i < arguments.length; ++i) args[i] = arguments[i];
	    var ts = moment().format('YYYY-MM-DD HH:mm:ss');
	    args.unshift(ts);
	    console.log.apply(console, args);
	}

}


expert.start();
